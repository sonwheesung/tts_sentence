#!/usr/bin/env bash
# PreToolUse 가드: adb/emulator 명령 직전에 이 프로젝트의 에뮬레이터 값을 들이민다.
# SnoreLess(.claude/hooks/emulator-guard.sh) 승계. 값의 정본은 C:/project/common/DEV_ALLOCATION.md §3 이다.
# 왜 훅인가: 안내문은 컴팩트 뒤에 버려진다. 틀리기 직전 그 순간에 사실을 보여 준다.
set -u

payload="$(cat)"
cmd="$(printf '%s' "$payload" | tr '\n' ' ')"

case "$cmd" in
  *adb*|*emulator.exe*|*emulator\ -avd*) ;;
  *) exit 0 ;;
esac

echo "🔴 읽어줘 에뮬레이터 (정본: common/DEV_ALLOCATION.md §3 · common/EMULATOR_POOL.md)"
echo "   AVD tts_sentence · -port 5586 · serial emulator-5586 · ANDROID_AVD_HOME='D:\\emulators\\tts_sentence'"
echo "   ① 모든 adb 에 -s emulator-5586  ② -port 를 빼면 5554 로 가서 남의 에뮬을 덮는다  🚫 남의 AVD·앱은 건드리지 않는다"

ADB="${LOCALAPPDATA:-}/Android/Sdk/platform-tools/adb.exe"
if [ -x "$ADB" ]; then
  echo "   지금 붙어 있는 것: $("$ADB" devices 2>/dev/null | sed '1d;/^$/d' | awk '{print $1}' | tr '\n' ' ')"
fi
exit 0
