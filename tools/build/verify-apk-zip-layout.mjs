// APK의 ZIP local entry 사이에 증분 빌드 잔재로 생긴 비정상 공백이 없는지 검증한다.
import fs from "node:fs";
import path from "node:path";

const apkPath = process.argv[2];
const maximumAllowedGap = 100 * 1024;

if (!apkPath || !fs.existsSync(apkPath)) {
  throw new Error("APK_ZIP_LAYOUT_INPUT_REQUIRED");
}

const archive = fs.readFileSync(apkPath);
const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectorySignature = 0x02014b50;
const localHeaderSignature = 0x04034b50;
const minimumEndRecordSize = 22;
const maximumCommentSize = 65535;
const searchStart = Math.max(
  0,
  archive.length - minimumEndRecordSize - maximumCommentSize,
);

let endRecordOffset = -1;
for (
  let offset = archive.length - minimumEndRecordSize;
  offset >= searchStart;
  offset -= 1
) {
  if (archive.readUInt32LE(offset) === endOfCentralDirectorySignature) {
    endRecordOffset = offset;
    break;
  }
}

if (endRecordOffset < 0) {
  throw new Error("APK_ZIP_END_RECORD_MISSING");
}

const entryCount = archive.readUInt16LE(endRecordOffset + 10);
const centralDirectoryOffset = archive.readUInt32LE(endRecordOffset + 16);
const entries = [];
let cursor = centralDirectoryOffset;

for (let index = 0; index < entryCount; index += 1) {
  if (archive.readUInt32LE(cursor) !== centralDirectorySignature) {
    throw new Error(`APK_ZIP_CENTRAL_ENTRY_INVALID index=${index}`);
  }

  const compressedSize = archive.readUInt32LE(cursor + 20);
  const nameLength = archive.readUInt16LE(cursor + 28);
  const extraLength = archive.readUInt16LE(cursor + 30);
  const commentLength = archive.readUInt16LE(cursor + 32);
  const localOffset = archive.readUInt32LE(cursor + 42);
  const name = archive
    .subarray(cursor + 46, cursor + 46 + nameLength)
    .toString("utf8");

  if (archive.readUInt32LE(localOffset) !== localHeaderSignature) {
    throw new Error(`APK_ZIP_LOCAL_ENTRY_INVALID name=${name}`);
  }

  const localNameLength = archive.readUInt16LE(localOffset + 26);
  const localExtraLength = archive.readUInt16LE(localOffset + 28);
  entries.push({
    name,
    start: localOffset,
    end:
      localOffset +
      30 +
      localNameLength +
      localExtraLength +
      compressedSize,
  });
  cursor += 46 + nameLength + extraLength + commentLength;
}

entries.sort((left, right) => left.start - right.start);
const gaps = entries.map((entry, index) => {
  const nextOffset =
    index + 1 < entries.length
      ? entries[index + 1].start
      : centralDirectoryOffset;
  return {
    after: entry.name,
    bytes: Math.max(0, nextOffset - entry.end),
  };
});
gaps.sort((left, right) => right.bytes - left.bytes);

const maximumGap = gaps[0] ?? { after: "none", bytes: 0 };
const violations = gaps.filter((gap) => gap.bytes > maximumAllowedGap);
const result = {
  apk: path.basename(apkPath),
  bytes: archive.length,
  entries: entries.length,
  maximumAllowedGap,
  maximumGap,
  violationCount: violations.length,
  violations: violations.slice(0, 12),
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  process.exitCode = 2;
} else {
  console.log("RUNNINGUP_V11_APK_ZIP_LAYOUT_PASS");
}
