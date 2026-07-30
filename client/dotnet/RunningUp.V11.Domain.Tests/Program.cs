// 업로드 판정 규칙을 Unity Editor 없이 실제로 실행해 검증한다.
using System;
using System.Collections.Generic;
using System.Globalization;
using RunningUp.RunVerification;

namespace RunningUp.V11.Domain.Tests
{
    internal static class Program
    {
        private static int failures;
        private static int assertions;

        private static int Main()
        {
            AuthenticationExpiryTriggersRefresh();
            RpcAuthRequiredIsNotMistakenForPermanentRejection();
            DuplicateIsTerminalSuccessNotIntervention();
            UniqueViolationBodyIsTreatedAsDuplicate();
            TransientFailuresRetry();
            PermanentRejectionsAreAbandoned();
            RetryEscalatesToAbandonAtTheCap();
            OnlyAuthenticationStopsTheBatch();
            RemovalFromQueueMatchesDisposition();
            BackoffStaysInsideItsCeiling();
            BackoffIsDeterministicPerFingerprint();
            BackoffSpreadsRunsAcrossDifferentSeconds();
            FailedRefreshKeepsTheRunQueued();
            ArtSpecTests.Run(IsTrue, (expected, actual, description) =>
                AreEqual(expected?.ToString(), actual?.ToString(), description));

            Console.WriteLine(
                $"1..{assertions}");
            Console.WriteLine(
                failures == 0
                    ? $"V11 upload policy PASS: {assertions} assertions"
                    : $"V11 upload policy FAIL: {failures} of {assertions} assertions failed");
            return failures == 0 ? 0 : 1;
        }

        // 세션이 만료되면 401이 오고, 한 번은 refresh를 시도해야 한다.
        private static void AuthenticationExpiryTriggersRefresh() =>
            AreEqual(
                UploadDisposition.RefreshSession,
                Classify(UploadTransportResult.ProtocolError, 401),
                "401 asks for a session refresh");

        // ingest_verified_run은 AUTH_REQUIRED를 errcode 42501로 던지고 PostgREST는
        // 이를 403으로 매핑한다. 401만 보던 이전 규칙에서는 이 경로가 영구 거절로
        // 분류되어 세션이 절대 갱신되지 않았다.
        private static void RpcAuthRequiredIsNotMistakenForPermanentRejection()
        {
            AreEqual(
                UploadDisposition.RefreshSession,
                Classify(UploadTransportResult.ProtocolError, 403),
                "403 asks for a session refresh");
            AreEqual(
                UploadDisposition.RefreshSession,
                Classify(
                    UploadTransportResult.ProtocolError,
                    400,
                    "{\"code\":\"42501\",\"message\":\"AUTH_REQUIRED\"}"),
                "an AUTH_REQUIRED body asks for a session refresh");
        }

        // 서버가 이미 러닝을 가진 상태는 성공이다. 재시도하면 영원히 실패한다.
        private static void DuplicateIsTerminalSuccessNotIntervention()
        {
            AreEqual(
                UploadDisposition.AlreadyStored,
                Classify(UploadTransportResult.ProtocolError, 409),
                "409 means the server already stored the run");
            IsTrue(
                V11UploadPolicy.RemovesFromQueue(UploadDisposition.AlreadyStored),
                "an already-stored run leaves the queue");
            IsFalse(
                V11UploadPolicy.StopsBatch(UploadDisposition.AlreadyStored),
                "an already-stored run does not stop the batch");
        }

        private static void UniqueViolationBodyIsTreatedAsDuplicate()
        {
            AreEqual(
                UploadDisposition.AlreadyStored,
                Classify(
                    UploadTransportResult.ProtocolError,
                    400,
                    "{\"code\":\"23505\",\"details\":\"Key (user_id, fingerprint) already exists.\"}"),
                "a unique violation body means the run is already stored");
            AreEqual(
                UploadDisposition.AlreadyStored,
                Classify(
                    UploadTransportResult.ProtocolError,
                    400,
                    "{\"code\": \"23505\"}"),
                "a spaced unique violation body is still recognised");
            // 우연히 본문에 숫자가 섞였다고 중복으로 보면 안 된다.
            AreEqual(
                UploadDisposition.Abandon,
                Classify(
                    UploadTransportResult.ProtocolError,
                    400,
                    "{\"message\":\"distance 23505 m is implausible\"}"),
                "a bare number in the message is not a unique violation");
        }

        private static void TransientFailuresRetry()
        {
            foreach (var code in new long[] { 0, 408, 425, 429, 500, 502, 503, 504 })
            {
                AreEqual(
                    UploadDisposition.Retry,
                    Classify(UploadTransportResult.ProtocolError, code),
                    $"HTTP {code.ToString(CultureInfo.InvariantCulture)} retries");
            }

            AreEqual(
                UploadDisposition.Retry,
                Classify(UploadTransportResult.ConnectionError, 0),
                "an offline device retries");
            AreEqual(
                UploadDisposition.Retry,
                Classify(UploadTransportResult.DataProcessingError, 200),
                "a truncated response retries");
        }

        private static void PermanentRejectionsAreAbandoned()
        {
            // RUN_FAILED_PLAUSIBILITY는 errcode 22023 -> HTTP 400이다.
            AreEqual(
                UploadDisposition.Abandon,
                Classify(UploadTransportResult.ProtocolError, 400),
                "a rejected run is abandoned rather than retried forever");
            AreEqual(
                UploadDisposition.Abandon,
                Classify(UploadTransportResult.ProtocolError, 404),
                "a missing RPC is abandoned");
            AreEqual(
                UploadDisposition.Abandon,
                Classify(UploadTransportResult.ProtocolError, 422),
                "an unprocessable payload is abandoned");
        }

        private static void RetryEscalatesToAbandonAtTheCap()
        {
            AreEqual(
                UploadDisposition.Retry,
                V11UploadPolicy.Escalate(UploadDisposition.Retry, 1),
                "the first transient failure still retries");
            AreEqual(
                UploadDisposition.Retry,
                V11UploadPolicy.Escalate(
                    UploadDisposition.Retry,
                    V11UploadPolicy.MaxTransientAttempts - 1),
                "the attempt below the cap still retries");
            AreEqual(
                UploadDisposition.Abandon,
                V11UploadPolicy.Escalate(
                    UploadDisposition.Retry,
                    V11UploadPolicy.MaxTransientAttempts),
                "the cap turns a retry into an abandon");
            // 성공 판정은 시도 횟수와 무관하게 그대로 유지돼야 한다.
            AreEqual(
                UploadDisposition.Accepted,
                V11UploadPolicy.Escalate(UploadDisposition.Accepted, 99),
                "an accepted run is never escalated");
            AreEqual(
                UploadDisposition.AlreadyStored,
                V11UploadPolicy.Escalate(UploadDisposition.AlreadyStored, 99),
                "an already-stored run is never escalated");
        }

        // 이전 구현은 첫 실패에서 배치를 끊었다. 영구 거절된 러닝 하나가 항상 가장
        // 오래된 항목으로 남아 이후 모든 러닝의 업로드를 영구히 막았다.
        private static void OnlyAuthenticationStopsTheBatch()
        {
            IsTrue(
                V11UploadPolicy.StopsBatch(UploadDisposition.RefreshSession),
                "an authentication failure stops the batch");
            foreach (var disposition in new[]
                     {
                         UploadDisposition.Accepted,
                         UploadDisposition.AlreadyStored,
                         UploadDisposition.Retry,
                         UploadDisposition.Abandon,
                     })
            {
                IsFalse(
                    V11UploadPolicy.StopsBatch(disposition),
                    $"{disposition} does not block the runs queued behind it");
            }
        }

        private static void RemovalFromQueueMatchesDisposition()
        {
            IsTrue(
                V11UploadPolicy.RemovesFromQueue(UploadDisposition.Accepted),
                "an accepted run leaves the queue");
            IsTrue(
                V11UploadPolicy.RemovesFromQueue(UploadDisposition.Abandon),
                "an abandoned run leaves the queue");
            IsFalse(
                V11UploadPolicy.RemovesFromQueue(UploadDisposition.Retry),
                "a retrying run stays queued");
            IsFalse(
                V11UploadPolicy.RemovesFromQueue(UploadDisposition.RefreshSession),
                "a run waiting on authentication stays queued");
        }

        private static void BackoffStaysInsideItsCeiling()
        {
            for (var attempt = 1; attempt <= 20; attempt++)
            {
                var delay = V11UploadPolicy.NextAttemptDelaySeconds(attempt, "fp-ceiling");
                var ceiling = Math.Min(
                    V11UploadPolicy.MaxBackoffSeconds,
                    (int)Math.Pow(2, Math.Min(10, attempt)));
                IsTrue(
                    delay >= Math.Max(1, ceiling / 2) && delay <= ceiling,
                    $"attempt {attempt} waits inside [{Math.Max(1, ceiling / 2)}, {ceiling}] but waited {delay}");
            }

            // 잘못된 입력도 음수 지연을 만들면 안 된다.
            IsTrue(
                V11UploadPolicy.NextAttemptDelaySeconds(0, "fp") > 0,
                "attempt 0 is clamped to a positive delay");
            IsTrue(
                V11UploadPolicy.NextAttemptDelaySeconds(-5, null) > 0,
                "a negative attempt with no fingerprint still yields a positive delay");
        }

        private static void BackoffIsDeterministicPerFingerprint() =>
            AreEqual(
                V11UploadPolicy.NextAttemptDelaySeconds(4, "fp-determinism"),
                V11UploadPolicy.NextAttemptDelaySeconds(4, "fp-determinism"),
                "the same run and attempt always wait the same amount");

        // 지터가 없으면 오프라인 구간에 쌓인 러닝이 같은 초에 한꺼번에 재시도한다.
        private static void BackoffSpreadsRunsAcrossDifferentSeconds()
        {
            var observed = new HashSet<int>();
            for (var index = 0; index < 40; index++)
            {
                observed.Add(
                    V11UploadPolicy.NextAttemptDelaySeconds(
                        8,
                        "fingerprint-" + index.ToString(CultureInfo.InvariantCulture)));
            }

            IsTrue(
                observed.Count >= 20,
                $"40 queued runs spread over at least 20 distinct seconds but used {observed.Count}");
        }

        // refresh가 실패해도 러닝을 버리면 안 된다. 재로그인하면 살아나야 한다.
        private static void FailedRefreshKeepsTheRunQueued()
        {
            var disposition = V11UploadPolicy.AfterFailedRefresh();
            IsFalse(
                V11UploadPolicy.RemovesFromQueue(disposition),
                "a run whose refresh failed stays in the queue");
        }

        private static UploadDisposition Classify(
            UploadTransportResult transport,
            long responseCode,
            string body = null) =>
            V11UploadPolicy.Classify(transport, responseCode, body);

        private static void AreEqual<T>(T expected, T actual, string description)
        {
            assertions++;
            if (Equals(expected, actual))
            {
                Console.WriteLine($"ok {assertions} - {description}");
                return;
            }

            failures++;
            Console.WriteLine(
                $"not ok {assertions} - {description} (expected {expected}, got {actual})");
        }

        private static void IsTrue(bool value, string description)
        {
            assertions++;
            if (value)
            {
                Console.WriteLine($"ok {assertions} - {description}");
                return;
            }

            failures++;
            Console.WriteLine($"not ok {assertions} - {description}");
        }

        private static void IsFalse(bool value, string description) =>
            IsTrue(!value, description);
    }
}
