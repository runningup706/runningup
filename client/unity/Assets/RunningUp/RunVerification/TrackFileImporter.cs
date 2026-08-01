// GPX·TCX·FIT 기록을 동일한 V14 검증 러닝 후보로 변환한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Xml;
using System.Xml.Linq;

namespace RunningUp.RunVerification
{
    public static class TrackFileImporter
    {
        private static readonly DateTimeOffset FitEpoch =
            new(1989, 12, 31, 0, 0, 0, TimeSpan.Zero);

        public static RunVerificationResult ImportGpx(
            string xml,
            string sourceRecordId,
            string routeId)
        {
            var document = LoadXml(xml);
            var points = document
                .Descendants()
                .Where(element => element.Name.LocalName == "trkpt")
                .Select(element =>
                {
                    var time = element
                        .Elements()
                        .FirstOrDefault(child => child.Name.LocalName == "time")?.Value;
                    return new GpsSample
                    {
                        latitude = ParseDouble(element.Attribute("lat")?.Value),
                        longitude = ParseDouble(element.Attribute("lon")?.Value),
                        unixTimeMilliseconds = ParseTime(time).ToUnixTimeMilliseconds(),
                        accuracyMeters = 10f,
                    };
                })
                .ToArray();
            var verified = RunVerifier.VerifyGps(points, sourceRecordId, routeId);
            if (!verified.IsVerified)
            {
                return verified;
            }

            return RunVerifier.VerifySummary(
                RunSource.Gpx,
                sourceRecordId,
                routeId,
                verified.Candidate.startedAtUnixMilliseconds,
                verified.Candidate.endedAtUnixMilliseconds,
                verified.Candidate.distanceMeters,
                verified.Candidate.movingSeconds,
                points.Length);
        }

        public static RunVerificationResult ImportTcx(
            string xml,
            string sourceRecordId,
            string routeId)
        {
            var document = LoadXml(xml);
            var startText = document
                .Descendants()
                .FirstOrDefault(element => element.Name.LocalName == "Id")?.Value;
            var totalTimeText = document
                .Descendants()
                .Where(element => element.Name.LocalName == "TotalTimeSeconds")
                .Select(element => element.Value)
                .LastOrDefault();
            var distanceText = document
                .Descendants()
                .Where(element => element.Name.LocalName == "DistanceMeters")
                .Select(element => element.Value)
                .LastOrDefault();
            var start = ParseTime(startText);
            var seconds = (int)Math.Round(ParseDouble(totalTimeText));
            var distance = (int)Math.Round(ParseDouble(distanceText));
            return RunVerifier.VerifySummary(
                RunSource.Tcx,
                sourceRecordId,
                routeId,
                start.ToUnixTimeMilliseconds(),
                start.AddSeconds(seconds).ToUnixTimeMilliseconds(),
                distance,
                seconds);
        }

        public static RunVerificationResult ImportFit(
            byte[] bytes,
            string sourceRecordId,
            string routeId)
        {
            if (bytes == null || bytes.Length < 14)
            {
                return RunVerificationResult.Rejected("FIT_HEADER");
            }

            var headerSize = bytes[0];
            if ((headerSize != 12 && headerSize != 14) || bytes.Length < headerSize + 2)
            {
                return RunVerificationResult.Rejected("FIT_HEADER");
            }

            var dataSize = BitConverter.ToUInt32(bytes, 4);
            if (dataSize > int.MaxValue || headerSize + dataSize + 2 > bytes.Length)
            {
                return RunVerificationResult.Rejected("FIT_DATA_SIZE");
            }

            var definitions = new Dictionary<int, FitDefinition>();
            var cursor = (int)headerSize;
            var dataEnd = checked(headerSize + (int)dataSize);
            uint? startTimestamp = null;
            uint? elapsedMilliseconds = null;
            uint? distanceCentimeters = null;

            while (cursor < dataEnd)
            {
                var recordHeader = bytes[cursor++];
                if ((recordHeader & 0x80) != 0)
                {
                    return RunVerificationResult.Rejected("FIT_COMPRESSED_UNSUPPORTED");
                }

                var localMessage = recordHeader & 0x0f;
                var isDefinition = (recordHeader & 0x40) != 0;
                if (isDefinition)
                {
                    if (cursor + 5 > dataEnd)
                    {
                        return RunVerificationResult.Rejected("FIT_DEFINITION");
                    }

                    cursor++;
                    var littleEndian = bytes[cursor++] == 0;
                    var globalMessage = ReadUInt16(bytes, ref cursor, littleEndian);
                    var fieldCount = bytes[cursor++];
                    var fields = new List<FitField>(fieldCount);
                    for (var index = 0; index < fieldCount; index++)
                    {
                        if (cursor + 3 > dataEnd)
                        {
                            return RunVerificationResult.Rejected("FIT_DEFINITION");
                        }

                        fields.Add(new FitField(
                            bytes[cursor++],
                            bytes[cursor++],
                            bytes[cursor++]));
                    }

                    definitions[localMessage] = new FitDefinition(
                        globalMessage,
                        littleEndian,
                        fields);
                    continue;
                }

                if (!definitions.TryGetValue(localMessage, out var definition))
                {
                    return RunVerificationResult.Rejected("FIT_LOCAL_MESSAGE");
                }

                foreach (var field in definition.Fields)
                {
                    if (cursor + field.Size > dataEnd)
                    {
                        return RunVerificationResult.Rejected("FIT_RECORD");
                    }

                    if (definition.GlobalMessage == 18 && field.Size == 4)
                    {
                        var value = ReadUInt32(bytes, cursor, definition.LittleEndian);
                        if (field.Number == 2)
                        {
                            startTimestamp = value;
                        }
                        else if (field.Number == 7)
                        {
                            elapsedMilliseconds = value;
                        }
                        else if (field.Number == 9)
                        {
                            distanceCentimeters = value;
                        }
                    }

                    cursor += field.Size;
                }
            }

            if (!startTimestamp.HasValue ||
                !elapsedMilliseconds.HasValue ||
                !distanceCentimeters.HasValue)
            {
                return RunVerificationResult.Rejected("FIT_SESSION_MISSING");
            }

            var start = FitEpoch.AddSeconds(startTimestamp.Value);
            var seconds = (int)Math.Round(elapsedMilliseconds.Value / 1000.0);
            var distance = (int)Math.Round(distanceCentimeters.Value / 100.0);
            return RunVerifier.VerifySummary(
                RunSource.Fit,
                sourceRecordId,
                routeId,
                start.ToUnixTimeMilliseconds(),
                start.AddSeconds(seconds).ToUnixTimeMilliseconds(),
                distance,
                seconds);
        }

        private static XDocument LoadXml(string xml)
        {
            var settings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
                MaxCharactersInDocument = 24 * 1024 * 1024,
            };
            using var text = new StringReader(xml ?? string.Empty);
            using var reader = XmlReader.Create(text, settings);
            return XDocument.Load(reader, LoadOptions.None);
        }

        private static double ParseDouble(string value) =>
            double.Parse(value ?? string.Empty, NumberStyles.Float, CultureInfo.InvariantCulture);

        private static DateTimeOffset ParseTime(string value) =>
            DateTimeOffset.Parse(
                value ?? string.Empty,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

        private static ushort ReadUInt16(byte[] bytes, ref int cursor, bool littleEndian)
        {
            var value = littleEndian
                ? (ushort)(bytes[cursor] | bytes[cursor + 1] << 8)
                : (ushort)(bytes[cursor] << 8 | bytes[cursor + 1]);
            cursor += 2;
            return value;
        }

        private static uint ReadUInt32(byte[] bytes, int cursor, bool littleEndian)
        {
            if (littleEndian)
            {
                return (uint)(bytes[cursor] |
                    bytes[cursor + 1] << 8 |
                    bytes[cursor + 2] << 16 |
                    bytes[cursor + 3] << 24);
            }

            return (uint)(bytes[cursor] << 24 |
                bytes[cursor + 1] << 16 |
                bytes[cursor + 2] << 8 |
                bytes[cursor + 3]);
        }

        private sealed class FitField
        {
            public FitField(byte number, byte size, byte baseType)
            {
                Number = number;
                Size = size;
                BaseType = baseType;
            }

            public byte Number { get; }
            public byte Size { get; }
            public byte BaseType { get; }
        }

        private sealed class FitDefinition
        {
            public FitDefinition(
                ushort globalMessage,
                bool littleEndian,
                IReadOnlyList<FitField> fields)
            {
                GlobalMessage = globalMessage;
                LittleEndian = littleEndian;
                Fields = fields;
            }

            public ushort GlobalMessage { get; }
            public bool LittleEndian { get; }
            public IReadOnlyList<FitField> Fields { get; }
        }
    }
}
