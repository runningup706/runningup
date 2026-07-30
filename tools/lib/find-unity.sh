#!/usr/bin/env bash
# 이 머신에 설치된 Unity Editor 실행 파일을 찾는다.
#
# 이전에는 한 사람의 맥 경로가 하드코딩돼 있어서, Unity Hub로 정상 설치한
# 다른 머신에서는 스크립트가 그냥 실패했다. Hub 기본 위치, 수동 설치 위치,
# 환경 변수를 순서대로 본다.
#
# 사용법:  unity_bin="$(find_unity_editor "6000.3.20f1")"
# 못 찾으면 exit 2와 함께 무엇을 설치해야 하는지 알린다.

find_unity_editor() {
  local required_version="${1:-}"
  local candidates=()

  # 1. 명시적 지정이 항상 이긴다.
  if [[ -n "${RUNNINGUP_UNITY_BIN:-}" ]]; then
    candidates+=("$RUNNINGUP_UNITY_BIN")
  fi

  # 2. Unity Hub 기본 설치 위치.
  if [[ -n "$required_version" ]]; then
    candidates+=(
      "/Applications/Unity/Hub/Editor/$required_version/Unity.app/Contents/MacOS/Unity"
      "$HOME/Applications/Unity/Hub/Editor/$required_version/Unity.app/Contents/MacOS/Unity"
      "/opt/unity/editors/$required_version/Editor/Unity"
      "$HOME/Unity/Hub/Editor/$required_version/Editor/Unity"
    )
  fi

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  # 3. Hub가 설치한 다른 버전이라도 찾아서, 버전이 다르다는 것을 알려 준다.
  local hub_root
  for hub_root in \
    "/Applications/Unity/Hub/Editor" \
    "$HOME/Applications/Unity/Hub/Editor" \
    "$HOME/Unity/Hub/Editor"
  do
    [[ -d "$hub_root" ]] || continue
    local installed
    installed="$(ls -1 "$hub_root" 2>/dev/null | tr '\n' ' ')"
    [[ -n "$installed" ]] || continue
    {
      echo "BLOCKED_TOOLCHAIN: Unity $required_version is not installed."
      echo "Unity Hub was found at $hub_root with these versions: $installed"
      echo "Open Unity Hub, go to Installs, and add exactly $required_version."
      echo "The project pins that version in client/unity/ProjectSettings/ProjectVersion.txt."
    } >&2
    return 2
  done

  {
    echo "BLOCKED_TOOLCHAIN: no Unity Editor found on this machine."
    echo "Install Unity Hub, then add Unity $required_version from the Installs tab."
    echo "If the editor lives somewhere unusual, set RUNNINGUP_UNITY_BIN to its"
    echo "executable, for example:"
    echo "  export RUNNINGUP_UNITY_BIN=\"/Applications/Unity/Hub/Editor/$required_version/Unity.app/Contents/MacOS/Unity\""
  } >&2
  return 2
}

# 프로젝트가 고정한 Unity 버전을 ProjectVersion.txt에서 읽는다.
read_pinned_unity_version() {
  local repo_dir="${1:?repository directory is required}"
  local version_file="$repo_dir/client/unity/ProjectSettings/ProjectVersion.txt"
  if [[ ! -f "$version_file" ]]; then
    echo "ProjectVersion.txt is missing at $version_file" >&2
    return 2
  fi
  # 형식:  m_EditorVersion: 6000.3.20f1
  sed -n 's/^m_EditorVersion: *//p' "$version_file" | head -n 1 | tr -d '\r'
}
