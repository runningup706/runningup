// 로그인 결과를 메모리에만 유지하고 만료된 Supabase 세션을 refresh token으로 교체한다.
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

    [DisallowMultipleComponent]
    public sealed class V11SupabaseSessionRuntime : MonoBehaviour
    {
        private string accessToken = string.Empty;
        private string refreshToken = string.Empty;
        private long expiresAtUnixSeconds;

        public event Action<string> StatusChanged;

        public bool HasAccessToken =>
            !string.IsNullOrWhiteSpace(accessToken) &&
            DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 30 < expiresAtUnixSeconds;

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
            StatusChanged?.Invoke("authentication_required");
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

            var response = JsonUtility.FromJson<SupabaseSessionResponse>(
                request.downloadHandler.text);
            if (response == null ||
                string.IsNullOrWhiteSpace(response.access_token) ||
                response.expires_in <= 0)
            {
                StatusChanged?.Invoke("session_refresh_invalid");
                completed?.Invoke(false);
                yield break;
            }

            accessToken = response.access_token;
            refreshToken = string.IsNullOrWhiteSpace(response.refresh_token)
                ? refreshToken
                : response.refresh_token;
            expiresAtUnixSeconds =
                DateTimeOffset.UtcNow.ToUnixTimeSeconds() + response.expires_in;
            StatusChanged?.Invoke("authenticated");
            completed?.Invoke(true);
        }
    }
}
