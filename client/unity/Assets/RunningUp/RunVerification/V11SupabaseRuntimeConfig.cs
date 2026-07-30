// 빌드 시 주입되는 공개 Supabase 접속 정보의 형식과 연결 가능 상태를 검증한다.
using System;
using UnityEngine;

namespace RunningUp.RunVerification
{
    [DisallowMultipleComponent]
    public sealed class V11SupabaseRuntimeConfig : MonoBehaviour
    {
        [SerializeField] private string projectUrl = string.Empty;
        [SerializeField] private string publishableKey = string.Empty;

        public string ProjectUrl => projectUrl;
        public string PublishableKey => publishableKey;
        public bool IsConfigured =>
            TryNormalizeProjectUrl(projectUrl, out _) &&
            !string.IsNullOrWhiteSpace(publishableKey) &&
            publishableKey.Length >= 20;

        public void Configure(string url, string key)
        {
            projectUrl = TryNormalizeProjectUrl(url, out var normalized)
                ? normalized
                : string.Empty;
            publishableKey = key?.Trim() ?? string.Empty;
        }

        public string RpcUrl(string functionName)
        {
            if (!IsConfigured ||
                string.IsNullOrWhiteSpace(functionName) ||
                functionName.IndexOfAny(new[] { '/', '?', '#', ' ' }) >= 0)
            {
                throw new InvalidOperationException("SUPABASE_CONFIG_REQUIRED");
            }

            return $"{projectUrl}/rest/v1/rpc/{functionName}";
        }

        public string AuthTokenUrl()
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException("SUPABASE_CONFIG_REQUIRED");
            }

            return $"{projectUrl}/auth/v1/token?grant_type=refresh_token";
        }

        public static bool TryNormalizeProjectUrl(string value, out string normalized)
        {
            normalized = string.Empty;
            if (!Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var uri) ||
                uri.Scheme != Uri.UriSchemeHttps ||
                string.IsNullOrWhiteSpace(uri.Host) ||
                !uri.Host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase) ||
                !string.IsNullOrEmpty(uri.Query) ||
                !string.IsNullOrEmpty(uri.Fragment))
            {
                return false;
            }

            normalized = $"{Uri.UriSchemeHttps}://{uri.Host}".TrimEnd('/');
            return true;
        }
    }
}
