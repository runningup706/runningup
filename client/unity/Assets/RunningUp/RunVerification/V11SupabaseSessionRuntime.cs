// Supabase 세션을 Android Keystore로 보호해 저장하고 익명 로그인·재접속·토큰 갱신까지 처리한다.
using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace RunningUp.RunVerification
{
    [Serializable]
    internal sealed class SupabaseRefreshRequest
    {
        public string refresh_token;
    }

    [Serializable]
    internal sealed class SupabaseSessionResponse
    {
        public string access_token;
        public string refresh_token;
        public int expires_in;
    }

    [Serializable]
    internal sealed class SupabaseStoredSession
    {
        public string access_token;
        public string refresh_token;
        public long expires_at;
    }

    [Serializable]
    internal sealed class SupabaseJwtClaims
    {
        public string sub;
    }

    [DisallowMultipleComponent]
    public sealed class V11SupabaseSessionRuntime : MonoBehaviour
    {
        private const string NativeClass =
            "kr.robom.runningup.v11.RunningUpV11Bridge";
        private const string EditorSessionKey =
            "runningup.v14.editor.supabase-session";
        private string accessToken = string.Empty;
        private string refreshToken = string.Empty;
        private long expiresAtUnixSeconds;

        public event Action<string> StatusChanged;

        public bool HasAccessToken =>
            !string.IsNullOrWhiteSpace(accessToken) &&
            DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 30 < expiresAtUnixSeconds;
        public bool HasRefreshToken => !string.IsNullOrWhiteSpace(refreshToken);
        public bool HasStoredSession =>
            !string.IsNullOrWhiteSpace(accessToken) ||
            !string.IsNullOrWhiteSpace(refreshToken);
        public string AuthenticatedUserId => ReadSubject(accessToken);

        private void Awake()
        {
            RestoreSession();
        }

        public void SetSession(
            string newAccessToken,
            string newRefreshToken,
            long newExpiresAtUnixSeconds)
        {
            if (string.IsNullOrWhiteSpace(newAccessToken) ||
                newExpiresAtUnixSeconds <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            {
                ClearSession();
                throw new ArgumentException("SUPABASE_SESSION_INVALID");
            }

            accessToken = newAccessToken;
            refreshToken = newRefreshToken ?? string.Empty;
            expiresAtUnixSeconds = newExpiresAtUnixSeconds;
            PersistSession();
            StatusChanged?.Invoke("authenticated");
        }

        public bool TryGetAccessToken(out string token)
        {
            token = HasAccessToken ? accessToken : string.Empty;
            return token.Length > 0;
        }

        public void ClearSession()
        {
            accessToken = string.Empty;
            refreshToken = string.Empty;
            expiresAtUnixSeconds = 0;
            ClearPersistedSession();
            StatusChanged?.Invoke("authentication_required");
        }

        public IEnumerator EnsureAuthenticated(
            V11SupabaseRuntimeConfig config,
            Action<bool> completed)
        {
            if (HasAccessToken)
            {
                completed?.Invoke(true);
                yield break;
            }

            if (HasRefreshToken)
            {
                var refreshed = false;
                yield return RefreshSession(config, value => refreshed = value);
                if (refreshed)
                {
                    completed?.Invoke(true);
                    yield break;
                }
            }

            yield return SignInAnonymously(config, completed);
        }

        public IEnumerator SignInAnonymously(
            V11SupabaseRuntimeConfig config,
            Action<bool> completed)
        {
            if (config == null || !config.IsConfigured)
            {
                StatusChanged?.Invoke("backend_project_required");
                completed?.Invoke(false);
                yield break;
            }

            StatusChanged?.Invoke("authenticating_guest");
            using var request = new UnityWebRequest(
                config.AuthAnonymousUrl(),
                UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}")),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 20,
            };
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success ||
                request.responseCode < 200 ||
                request.responseCode >= 300 ||
                !TryApplyResponse(request.downloadHandler.text))
            {
                StatusChanged?.Invoke($"guest_auth_failed:{request.responseCode}");
                completed?.Invoke(false);
                yield break;
            }

            StatusChanged?.Invoke("authenticated");
            completed?.Invoke(true);
        }

        public IEnumerator SignOut(
            V11SupabaseRuntimeConfig config,
            Action<bool> completed)
        {
            if (config == null || !config.IsConfigured)
            {
                StatusChanged?.Invoke("backend_project_required");
                completed?.Invoke(false);
                yield break;
            }

            if (!HasStoredSession)
            {
                ClearSession();
                StatusChanged?.Invoke("signed_out");
                completed?.Invoke(true);
                yield break;
            }

            if (!HasAccessToken && HasRefreshToken)
            {
                var refreshed = false;
                yield return RefreshSession(config, value => refreshed = value);
                if (!refreshed)
                {
                    ClearSession();
                    StatusChanged?.Invoke("signed_out");
                    completed?.Invoke(true);
                    yield break;
                }
            }

            if (!HasAccessToken)
            {
                ClearSession();
                StatusChanged?.Invoke("signed_out");
                completed?.Invoke(true);
                yield break;
            }

            using var request = new UnityWebRequest(
                config.AuthLogoutUrl(),
                UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}")),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 20,
            };
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Authorization", $"Bearer {accessToken}");
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();

            if ((request.result == UnityWebRequest.Result.Success &&
                 request.responseCode >= 200 && request.responseCode < 300) ||
                request.responseCode == 401)
            {
                ClearSession();
                StatusChanged?.Invoke("signed_out");
                completed?.Invoke(true);
                yield break;
            }

            StatusChanged?.Invoke($"sign_out_failed:{request.responseCode}");
            completed?.Invoke(false);
        }

        public IEnumerator RefreshSession(
            V11SupabaseRuntimeConfig config,
            Action<bool> completed)
        {
            if (config == null ||
                !config.IsConfigured ||
                string.IsNullOrWhiteSpace(refreshToken))
            {
                completed?.Invoke(false);
                yield break;
            }

            var payload = JsonUtility.ToJson(
                new SupabaseRefreshRequest { refresh_token = refreshToken });
            using var request = new UnityWebRequest(
                config.AuthTokenUrl(),
                UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(payload)),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 20,
            };
            request.SetRequestHeader("apikey", config.PublishableKey);
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                StatusChanged?.Invoke("session_refresh_failed");
                completed?.Invoke(false);
                yield break;
            }

            if (!TryApplyResponse(request.downloadHandler.text))
            {
                StatusChanged?.Invoke("session_refresh_invalid");
                completed?.Invoke(false);
                yield break;
            }

            StatusChanged?.Invoke("authenticated");
            completed?.Invoke(true);
        }

        private bool TryApplyResponse(string json)
        {
            var response = JsonUtility.FromJson<SupabaseSessionResponse>(json);
            if (response == null ||
                string.IsNullOrWhiteSpace(response.access_token) ||
                response.expires_in <= 0)
            {
                return false;
            }

            accessToken = response.access_token;
            if (!string.IsNullOrWhiteSpace(response.refresh_token))
            {
                refreshToken = response.refresh_token;
            }
            expiresAtUnixSeconds =
                DateTimeOffset.UtcNow.ToUnixTimeSeconds() + response.expires_in;
            PersistSession();
            return true;
        }

        private static string ReadSubject(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return string.Empty;
            }
            var segments = token.Split('.');
            if (segments.Length < 2)
            {
                return string.Empty;
            }
            try
            {
                var payload = segments[1]
                    .Replace('-', '+')
                    .Replace('_', '/');
                payload = payload.PadRight(
                    payload.Length + (4 - payload.Length % 4) % 4,
                    '=');
                var json = Encoding.UTF8.GetString(
                    Convert.FromBase64String(payload));
                return JsonUtility.FromJson<SupabaseJwtClaims>(json)?.sub ??
                    string.Empty;
            }
            catch (Exception)
            {
                return string.Empty;
            }
        }

        private void RestoreSession()
        {
            var json = LoadPersistedSession();
            if (string.IsNullOrWhiteSpace(json))
            {
                StatusChanged?.Invoke("authentication_required");
                return;
            }

            try
            {
                var stored = JsonUtility.FromJson<SupabaseStoredSession>(json);
                if (stored == null ||
                    string.IsNullOrWhiteSpace(stored.refresh_token))
                {
                    ClearPersistedSession();
                    StatusChanged?.Invoke("authentication_required");
                    return;
                }

                accessToken = stored.access_token ?? string.Empty;
                refreshToken = stored.refresh_token;
                expiresAtUnixSeconds = stored.expires_at;
                StatusChanged?.Invoke(
                    HasAccessToken ? "authenticated" : "session_refresh_required");
            }
            catch (Exception)
            {
                ClearPersistedSession();
                StatusChanged?.Invoke("authentication_required");
            }
        }

        private void PersistSession()
        {
            var json = JsonUtility.ToJson(new SupabaseStoredSession
            {
                access_token = accessToken,
                refresh_token = refreshToken,
                expires_at = expiresAtUnixSeconds,
            });
#if UNITY_ANDROID && !UNITY_EDITOR
            using var bridge = new AndroidJavaClass(NativeClass);
            bridge.CallStatic<string>("saveSecureSession", json);
#else
            PlayerPrefs.SetString(EditorSessionKey, json);
            PlayerPrefs.Save();
#endif
        }

        private static string LoadPersistedSession()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using var bridge = new AndroidJavaClass(NativeClass);
            return bridge.CallStatic<string>("loadSecureSession");
#else
            return PlayerPrefs.GetString(EditorSessionKey, string.Empty);
#endif
        }

        private static void ClearPersistedSession()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using var bridge = new AndroidJavaClass(NativeClass);
            bridge.CallStatic<string>("clearSecureSession");
#else
            PlayerPrefs.DeleteKey(EditorSessionKey);
            PlayerPrefs.Save();
#endif
        }
    }
}
