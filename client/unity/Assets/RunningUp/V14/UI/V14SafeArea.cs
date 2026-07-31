// 노치·상태바·제스처 바를 피해 UI를 안전영역 안에 배치한다.
//
// 무엇이 문제였나
// --------------
// 사용자 신고: "제일 위는 폰 기본 상단에 뜨는 거랑 가끔 부딪쳐. 아래쪽도 뒤로가기 누르려면
// 폰 자체에서 뜨는 아래쪽 버튼이 같이 눌러져."
//
// 원인은 설정과 코드 양쪽이었다. ProjectSettings 의 androidRenderOutsideSafeArea 가 1 이라
// 앱이 노치 아래까지 그리는데, 클라이언트 코드 어디에도 Screen.safeArea 를 읽는 곳이
// 없었다. 상단 HUD 는 화면 맨 위에 92px 로 고정, 하단 내비는 맨 아래에 154px 로 고정이니
// 상태바와 제스처 바에 그대로 겹친다.
//
// 왜 레터박스로 안 고쳤나
// ---------------------
// androidRenderOutsideSafeArea 를 0 으로 두면 Unity 가 노치 주변을 검은 띠로 막는다.
// 간단하지만 2.5D 라이브 저니 배경이 화면 끝까지 차는 것이 이 앱의 잠긴 디자인이므로,
// 그 방식은 디자인을 바꾸는 셈이 된다.
//
// 그래서 배경(approvedJourneyBackdrop)은 화면 전체를 유지하고, UI 가 들어 있는 flowRoot
// 하나만 안전영역으로 좁힌다. 모든 화면과 상·하단 크롬이 flowRoot 밑에 있으므로 한 곳을
// 고치면 전부 해결된다.
//
// 제스처 바에 대하여
// ----------------
// Unity 의 Screen.safeArea 는 디스플레이 컷아웃은 반영하지만, 안드로이드의 제스처 내비
// 영역(systemGestures)까지 항상 빼주지는 않는다. 그래서 가능하면 안드로이드에 직접
// 물어보고, 실패하면 Screen.safeArea 만으로 동작한다. 물어보기가 실패해도 앱은 멀쩡하다.
//
// 실기기 확인 전까지 이 파일은 검증되지 않은 상태다. 에뮬레이터 수치로 대체하지 않는다.

using System;
using UnityEngine;

namespace RunningUp.V14.UI
{
    [DisallowMultipleComponent]
    public sealed class V14SafeArea : MonoBehaviour
    {
        private RectTransform target;

        private Rect appliedSafeArea = Rect.zero;
        private Vector2Int appliedResolution = Vector2Int.zero;
        private ScreenOrientation appliedOrientation = ScreenOrientation.AutoRotation;

        /// 안드로이드가 알려준 추가 여백(px). 컷아웃 밖의 시스템 바·제스처 영역.
        /// 조회는 안드로이드 UI 스레드에서 비동기로 이뤄지므로 다음 프레임에 반영된다.
        private Vector4 nativeInsets = Vector4.zero;   // x=left y=right z=top w=bottom
        private bool nativeInsetsPending;

        /// 조회가 아예 불가능한 환경(에디터, 조회 실패)인지. 한 번 실패하면 다시 묻지 않는다.
        private bool nativeInsetsUnavailable;

        public void Bind(RectTransform rectTransform)
        {
            target = rectTransform;
            appliedSafeArea = Rect.zero;      // 강제 재적용
            RequestNativeInsets();
            Apply();
        }

        private void Update()
        {
            if (target == null)
            {
                return;
            }

            // 회전, 멀티윈도우 크기 변경, 제스처 바 표시 전환에서 모두 값이 달라진다.
            var resolution = new Vector2Int(Screen.width, Screen.height);
            var changed =
                Screen.safeArea != appliedSafeArea ||
                resolution != appliedResolution ||
                Screen.orientation != appliedOrientation;

            if (changed)
            {
                RequestNativeInsets();
            }

            if (changed || nativeInsetsPending)
            {
                Apply();
            }
        }

        private void Apply()
        {
            if (target == null || Screen.width <= 0 || Screen.height <= 0)
            {
                return;
            }

            nativeInsetsPending = false;
            appliedSafeArea = Screen.safeArea;
            appliedResolution = new Vector2Int(Screen.width, Screen.height);
            appliedOrientation = Screen.orientation;

            var safe = Screen.safeArea;

            // 안드로이드가 알려준 여백과 비교해 더 안쪽을 택한다. 둘 중 하나만 정확한
            // 경우가 있어 max 를 쓴다 — 덜 잘라서 겹치는 것보다 조금 더 잘라내는 편이 낫다.
            var left = Mathf.Max(safe.xMin, nativeInsets.x);
            var right = Mathf.Max(Screen.width - safe.xMax, nativeInsets.y);
            var top = Mathf.Max(Screen.height - safe.yMax, nativeInsets.z);
            var bottom = Mathf.Max(safe.yMin, nativeInsets.w);

            // 화면을 통째로 잘라먹는 값이 들어오면 무시한다. 잘못된 인셋 하나로 UI 가
            // 완전히 사라지는 것이 가장 나쁜 실패다.
            if (left + right >= Screen.width * 0.5f || top + bottom >= Screen.height * 0.5f)
            {
                left = safe.xMin;
                right = Screen.width - safe.xMax;
                top = Screen.height - safe.yMax;
                bottom = safe.yMin;
            }

            var min = new Vector2(left / Screen.width, bottom / Screen.height);
            var max = new Vector2(
                (Screen.width - right) / Screen.width,
                (Screen.height - top) / Screen.height);

            target.anchorMin = min;
            target.anchorMax = max;
            target.offsetMin = Vector2.zero;
            target.offsetMax = Vector2.zero;
        }

        // -------------------------------------------------------------------
        // 안드로이드 인셋 조회 — 실패해도 앱이 멈추지 않도록 전부 감싼다
        // -------------------------------------------------------------------
        private void RequestNativeInsets()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (nativeInsetsUnavailable)
            {
                return;
            }

            try
            {
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                if (activity == null)
                {
                    nativeInsetsUnavailable = true;
                    return;
                }

                // getRootWindowInsets 는 View 메서드라 안드로이드 UI 스레드에서만
                // 호출할 수 있다. Unity 메인 스레드는 UI 스레드가 아니다.
                activity.Call("runOnUiThread", new AndroidJavaRunnable(() =>
                {
                    try
                    {
                        using var window = activity.Call<AndroidJavaObject>("getWindow");
                        using var decor = window.Call<AndroidJavaObject>("getDecorView");
                        using var insets = decor.Call<AndroidJavaObject>("getRootWindowInsets");
                        if (insets == null)
                        {
                            return;
                        }

                        if (TryReadTypedInsets(insets, out var typed))
                        {
                            nativeInsets = typed;
                        }
                        else
                        {
                            // API 28~29 경로. 타입별 조회가 없다.
                            nativeInsets = new Vector4(
                                insets.Call<int>("getSystemWindowInsetLeft"),
                                insets.Call<int>("getSystemWindowInsetRight"),
                                insets.Call<int>("getSystemWindowInsetTop"),
                                insets.Call<int>("getSystemWindowInsetBottom"));
                        }

                        nativeInsetsPending = true;
                    }
                    catch (Exception)
                    {
                        // 조회 실패는 치명적이지 않다. Screen.safeArea 만으로 계속한다.
                        nativeInsetsUnavailable = true;
                    }
                }));
            }
            catch (Exception)
            {
                nativeInsetsUnavailable = true;
            }
#else
            nativeInsetsUnavailable = true;
#endif
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        /// API 30+ 의 WindowInsets.Type 기반 조회. 제스처 영역까지 포함된다.
        private static bool TryReadTypedInsets(AndroidJavaObject insets, out Vector4 result)
        {
            result = Vector4.zero;
            try
            {
                using var type = new AndroidJavaClass("android.view.WindowInsets$Type");
                var mask = type.CallStatic<int>("systemBars") |
                           type.CallStatic<int>("displayCutout") |
                           type.CallStatic<int>("systemGestures");
                using var value = insets.Call<AndroidJavaObject>("getInsets", mask);
                result = new Vector4(
                    value.Get<int>("left"),
                    value.Get<int>("right"),
                    value.Get<int>("top"),
                    value.Get<int>("bottom"));
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
#endif
    }
}
