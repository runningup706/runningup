// V14 버튼의 Supabase RPC를 인증·토큰 갱신·중복 클릭 차단·오류 분류와 함께 실행한다.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using RunningUp.RunVerification;
using UnityEngine;
using UnityEngine.Networking;

namespace RunningUp.V14.Backend
{
    public sealed class V14ServerReply
    {
        public bool succeeded;
        public long statusCode;
        public string body = string.Empty;
        public string error = string.Empty;
        public bool retryable;
        public string serverDate = string.Empty;
    }

    [DisallowMultipleComponent]
    public sealed class V14SupabaseGateway : MonoBehaviour
    {
        [SerializeField] private V11SupabaseRuntimeConfig config;
        [SerializeField] private V11SupabaseSessionRuntime session;
        private readonly HashSet<string> inFlight = new();

        public bool IsConfigured => config != null && config.IsConfigured;
        public int InFlightCount => inFlight.Count;
        public string AuthenticatedUserId =>
            session?.AuthenticatedUserId ?? string.Empty;
        public event Action<string> StatusChanged;

        private void Awake()
        {
            config ??= GetComponent<V11SupabaseRuntimeConfig>();
            session ??= GetComponent<V11SupabaseSessionRuntime>();
        }

        public void Configure(
            V11SupabaseRuntimeConfig runtimeConfig,
            V11SupabaseSessionRuntime sessionRuntime)
        {
            config = runtimeConfig;
            session = sessionRuntime;
        }

        public IEnumerator InvokeRpc(
            string operationId,
            string functionName,
            string jsonBody,
            Action<V14ServerReply> completed)
        {
            if (string.IsNullOrWhiteSpace(operationId) ||
                string.IsNullOrWhiteSpace(functionName))
            {
                completed?.Invoke(Failure("request_invalid", 0, false));
                yield break;
            }
            if (!inFlight.Add(operationId))
            {
                completed?.Invoke(Failure("duplicate_in_flight", 409, false));
                yield break;
            }

            try
            {
                if (config == null || !config.IsConfigured || session == null)
                {
                    Publish("backend_project_required");
                    completed?.Invoke(
                        Failure("backend_project_required", 0, false));
                    yield break;
                }

                var authenticated = false;
                yield return session.EnsureAuthenticated(
                    config,
                    value => authenticated = value);
                if (!authenticated)
                {
                    Publish("authentication_required");
                    completed?.Invoke(
                        Failure("authentication_required", 401, true));
                    yield break;
                }

                V14ServerReply reply = null;
                yield return Send(
                    functionName,
                    jsonBody,
                    false,
                    value => reply = value);
                completed?.Invoke(reply);
            }
            finally
            {
                inFlight.Remove(operationId);
            }
        }

        public IEnumerator InvokeGet(
            string operationId,
            string relativePathAndQuery,
            Action<V14ServerReply> completed)
        {
            if (string.IsNullOrWhiteSpace(operationId) ||
                string.IsNullOrWhiteSpace(relativePathAndQuery))
            {
                completed?.Invoke(Failure("request_invalid", 0, false));
                yield break;
            }
            if (!inFlight.Add(operationId))
            {
                completed?.Invoke(Failure("duplicate_in_flight", 409, false));
                yield break;
            }

            try
            {
                if (config == null || !config.IsConfigured || session == null)
                {
                    completed?.Invoke(
                        Failure("backend_project_required", 0, false));
                    yield break;
                }
                var authenticated = false;
                yield return session.EnsureAuthenticated(
                    config,
                    value => authenticated = value);
                if (!authenticated)
                {
                    completed?.Invoke(
                        Failure("authentication_required", 401, true));
                    yield break;
                }
                V14ServerReply reply = null;
                yield return SendGet(
                    relativePathAndQuery,
                    false,
                    value => reply = value);
                completed?.Invoke(reply);
            }
            finally
            {
                inFlight.Remove(operationId);
            }
        }

        public IEnumerator SignOut(Action<bool> completed)
        {
            if (config == null || !config.IsConfigured || session == null)
            {
                Publish("backend_project_required");
                completed?.Invoke(false);
                yield break;
            }

            yield return session.SignOut(config, completed);
        }

        private IEnumerator Send(
            string functionName,
            string jsonBody,
            bool refreshedOnce,
            Action<V14ServerReply> completed)
        {
            if (!session.TryGetAccessToken(out var token))
            {
                completed(Failure("authentication_required", 401, true));
                yield break;
            }

            Publish($"loading:{functionName}");
            using var request = new UnityWebRequest(
                config.RpcUrl(functionName),
                UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(
                    Encoding.UTF8.GetBytes(
                        string.IsNullOrWhiteSpace(jsonBody) ? "{}" : jsonBody)),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 25,
            };
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Authorization", $"Bearer {token}");
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Prefer", "return=representation");
            yield return request.SendWebRequest();

            if (request.responseCode == 401 && !refreshedOnce)
            {
                var refreshed = false;
                yield return session.RefreshSession(
                    config,
                    value => refreshed = value);
                if (refreshed)
                {
                    yield return Send(
                        functionName,
                        jsonBody,
                        true,
                        completed);
                    yield break;
                }
            }

            var succeeded =
                request.result == UnityWebRequest.Result.Success &&
                request.responseCode >= 200 &&
                request.responseCode < 300;
            var retryable =
                request.result == UnityWebRequest.Result.ConnectionError ||
                request.responseCode is 408 or 425 or 429 ||
                request.responseCode >= 500;
            var body = request.downloadHandler?.text ?? string.Empty;
            var reply = new V14ServerReply
            {
                succeeded = succeeded,
                statusCode = request.responseCode,
                body = body,
                error = succeeded
                    ? string.Empty
                    : string.IsNullOrWhiteSpace(body)
                        ? request.error ?? "request_failed"
                        : body,
                retryable = retryable,
                serverDate = request.GetResponseHeader("Date") ?? string.Empty,
            };
            Publish(succeeded
                ? $"success:{functionName}"
                : $"error:{functionName}:{request.responseCode}");
            completed(reply);
        }

        private IEnumerator SendGet(
            string relativePathAndQuery,
            bool refreshedOnce,
            Action<V14ServerReply> completed)
        {
            if (!session.TryGetAccessToken(out var token))
            {
                completed(Failure("authentication_required", 401, true));
                yield break;
            }
            using var request = UnityWebRequest.Get(
                config.RestUrl(relativePathAndQuery));
            request.timeout = 25;
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Authorization", $"Bearer {token}");
            yield return request.SendWebRequest();
            if (request.responseCode == 401 && !refreshedOnce)
            {
                var refreshed = false;
                yield return session.RefreshSession(
                    config,
                    value => refreshed = value);
                if (refreshed)
                {
                    yield return SendGet(
                        relativePathAndQuery,
                        true,
                        completed);
                    yield break;
                }
            }
            var succeeded =
                request.result == UnityWebRequest.Result.Success &&
                request.responseCode >= 200 &&
                request.responseCode < 300;
            completed(new V14ServerReply
            {
                succeeded = succeeded,
                statusCode = request.responseCode,
                body = request.downloadHandler?.text ?? string.Empty,
                error = succeeded
                    ? string.Empty
                    : request.downloadHandler?.text ?? request.error,
                retryable =
                    request.result == UnityWebRequest.Result.ConnectionError ||
                    request.responseCode is 408 or 425 or 429 ||
                    request.responseCode >= 500,
                serverDate = request.GetResponseHeader("Date") ?? string.Empty,
            });
        }

        private void Publish(string status)
        {
            StatusChanged?.Invoke(status);
        }

        private static V14ServerReply Failure(
            string error,
            long status,
            bool retryable) =>
            new()
            {
                succeeded = false,
                statusCode = status,
                error = error,
                retryable = retryable,
            };
    }
}
