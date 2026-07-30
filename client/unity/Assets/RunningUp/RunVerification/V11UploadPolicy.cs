// 검증 러닝 업로드의 인증·중복·재시도·포기 판정을 엔진 없이 결정한다.
//
// 이 파일은 UnityEngine을 참조하지 않는다. Unity Editor가 없는 환경에서도
// client/dotnet/RunningUp.V11.Domain.Tests가 그대로 컴파일해 검증하기 때문이다.
// UnityWebRequest에 의존하는 부분은 V11VerifiedRunUploader가 매핑한다.
using System;
using System.Globalization;

namespace RunningUp.RunVerification
{
    /// <summary>UnityWebRequest.Result를 엔진 없이 표현한다.</summary>
    public enum UploadTransportResult
    {
        Success,
        ConnectionError,
        ProtocolError,
        DataProcessingError,
    }

    /// <summary>한 번의 업로드 시도에 대한 최종 판정이다.</summary>
    public enum UploadDisposition
    {
        /// <summary>서버가 러닝을 새로 저장했다. 영구 성장에 반영하고 큐에서 제거한다.</summary>
        Accepted,

        /// <summary>서버가 이미 같은 러닝을 가지고 있다. 재시도하지 않고 큐에서 제거한다.</summary>
        AlreadyStored,

        /// <summary>세션이 만료됐다. refresh 뒤 같은 항목을 한 번 더 시도한다.</summary>
        RefreshSession,

        /// <summary>일시적 실패다. backoff 뒤 다시 시도한다.</summary>
        Retry,

        /// <summary>영구 거절이다. 큐에서 제거하고 사용자에게 알린다.</summary>
        Abandon,
    }

    public static class V11UploadPolicy
    {
        /// <summary>
        /// 일시적 실패를 이 횟수까지만 재시도한다. 초과하면 포기해 큐가 영원히
        /// 막히지 않게 한다. 최대 backoff 30분 기준으로 약 5시간에 해당한다.
        /// </summary>
        public const int MaxTransientAttempts = 12;

        /// <summary>backoff 상한. 실제 지연은 이 값의 50~100% 사이에서 흩어진다.</summary>
        public const int MaxBackoffSeconds = 1800;

        /// <summary>
        /// PostgreSQL unique_violation. 두 기기가 같은 러닝을 동시에 올리면
        /// PostgREST가 이 코드를 409로 돌려준다.
        /// </summary>
        private const string UniqueViolationSqlState = "23505";

        /// <summary>
        /// RPC의 <c>AUTH_REQUIRED</c>는 errcode 42501이며 PostgREST는 이를 403으로
        /// 매핑한다. 401만 보고 refresh하면 이 경로에서 세션이 절대 갱신되지 않는다.
        /// </summary>
        private const string InsufficientPrivilegeSqlState = "42501";

        public static UploadDisposition Classify(
            UploadTransportResult transport,
            long responseCode,
            string responseBody)
        {
            if (transport == UploadTransportResult.Success &&
                responseCode >= 200 &&
                responseCode < 300)
            {
                return UploadDisposition.Accepted;
            }

            // 서버가 이미 이 러닝을 보유한 경우다. 응답 코드보다 SQLSTATE가 정확하다.
            if (responseCode == 409 ||
                ContainsSqlState(responseBody, UniqueViolationSqlState))
            {
                return UploadDisposition.AlreadyStored;
            }

            if (responseCode == 401 ||
                responseCode == 403 ||
                ContainsSqlState(responseBody, InsufficientPrivilegeSqlState))
            {
                return UploadDisposition.RefreshSession;
            }

            if (transport == UploadTransportResult.ConnectionError ||
                transport == UploadTransportResult.DataProcessingError ||
                responseCode == 0 ||
                responseCode == 408 ||
                responseCode == 425 ||
                responseCode == 429 ||
                responseCode >= 500)
            {
                return UploadDisposition.Retry;
            }

            return UploadDisposition.Abandon;
        }

        /// <summary>
        /// refresh가 실패했거나 이미 한 번 refresh한 뒤에도 401/403이면, 세션은
        /// 사용자 재로그인 없이는 복구되지 않는다. 이때 항목을 포기하면 로그인만
        /// 하면 되는 러닝이 사라지므로 Retry로 유지한다.
        /// </summary>
        public static UploadDisposition AfterFailedRefresh() => UploadDisposition.Retry;

        /// <summary>
        /// 일시적 실패가 상한을 넘으면 Retry를 Abandon으로 승격한다.
        /// </summary>
        public static UploadDisposition Escalate(
            UploadDisposition disposition,
            int attemptCountAfterFailure)
        {
            if (disposition != UploadDisposition.Retry)
            {
                return disposition;
            }

            return attemptCountAfterFailure >= MaxTransientAttempts
                ? UploadDisposition.Abandon
                : UploadDisposition.Retry;
        }

        /// <summary>
        /// 한 항목의 판정이 나머지 큐 처리까지 멈춰야 하는지 결정한다.
        ///
        /// 이전 구현은 실패한 첫 항목에서 배치를 중단했다. 영구 거절된 러닝 하나가
        /// 항상 가장 오래된 항목으로 남아 이후 모든 러닝을 영구히 막았다.
        /// 이제는 계정 전체에 영향을 주는 인증 실패에서만 배치를 멈춘다.
        /// </summary>
        public static bool StopsBatch(UploadDisposition disposition) =>
            disposition == UploadDisposition.RefreshSession;

        /// <summary>판정이 이 항목을 큐에서 제거해야 하는지 알려준다.</summary>
        public static bool RemovesFromQueue(UploadDisposition disposition) =>
            disposition == UploadDisposition.Accepted ||
            disposition == UploadDisposition.AlreadyStored ||
            disposition == UploadDisposition.Abandon;

        /// <summary>
        /// full jitter backoff. 같은 시각에 큐에 쌓인 항목들이 같은 초에 몰려
        /// 재시도하지 않도록 fingerprint로 결정론적 지터를 만든다.
        /// </summary>
        public static int NextAttemptDelaySeconds(int attemptCount, string fingerprint)
        {
            if (attemptCount < 1)
            {
                attemptCount = 1;
            }

            var exponent = Math.Min(10, attemptCount);
            var ceiling = Math.Min(MaxBackoffSeconds, (int)Math.Pow(2, exponent));
            var half = Math.Max(1, ceiling / 2);
            var spread = ceiling - half;
            if (spread <= 0)
            {
                return half;
            }

            // 결정론적이어야 테스트가 재현 가능하다. 시도 횟수를 섞어 매 시도마다
            // 다른 슬롯에 떨어지게 한다.
            var seed = StableHash(
                (fingerprint ?? string.Empty) +
                attemptCount.ToString(CultureInfo.InvariantCulture));
            return half + (int)(seed % (uint)spread);
        }

        /// <summary>FNV-1a 32bit. 플랫폼과 런타임에 상관없이 같은 값을 준다.</summary>
        public static uint StableHash(string value)
        {
            unchecked
            {
                var hash = 2166136261u;
                if (string.IsNullOrEmpty(value))
                {
                    return hash;
                }

                foreach (var character in value)
                {
                    hash ^= character;
                    hash *= 16777619u;
                }

                return hash;
            }
        }

        private static bool ContainsSqlState(string body, string sqlState)
        {
            if (string.IsNullOrEmpty(body))
            {
                return false;
            }

            // PostgREST 오류 본문은 {"code":"23505", ...} 형태다. 문자열이 우연히
            // 다른 필드에 섞이지 않도록 code 필드로 한정한다.
            var marker = "\"code\":\"" + sqlState + "\"";
            if (body.IndexOf(marker, StringComparison.Ordinal) >= 0)
            {
                return true;
            }

            var spaced = "\"code\": \"" + sqlState + "\"";
            return body.IndexOf(spaced, StringComparison.Ordinal) >= 0;
        }
    }
}
