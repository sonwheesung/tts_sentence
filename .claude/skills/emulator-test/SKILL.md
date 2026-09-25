---
name: emulator-test
description: Drive an Expo/React Native app on a real Android emulator end-to-end ("에뮬레이터 테스트", "에뮬로 띄워서 테스트", "화면 직접 보면서 터치 테스트", "run an emulator cycle", "E2E on emulator"). Claude boots the AVD, builds/installs the dev app, then SEES screens via screencap→Read and TAPS by coordinate — catching real-device render/transition/touch bugs that unit/component tests can't. Runs user-defined parameterized scenarios ("cycles") with mandatory preconditions. Use when the user wants visual/touch verification of a flow on device; for unit/component regression use the project's test runner instead.
---

# Emulator Test — see-and-tap E2E on Android (generic)

Claude가 안드로이드 에뮬레이터로 앱을 **실제 띄우고, 스크린샷으로 보고, 좌표로 탭**해 사용자 정의 시나리오(사이클)를 끝까지 돈다. 단위·컴포넌트 테스트가 못 보는 **실기기 렌더·전이·터치**를 사람 눈으로 잡는다(테스트 PASS인데 실기기 버그 = 거짓 확신).

> **읽어줘(tts_sentence) 판**: common 판의 플레이스홀더를 이 프로젝트 값으로 채웠다(2026-09-26). 값의 정본은 `C:\project\common\DEV_ALLOCATION.md` §1·§3 이다. 그쪽이 바뀌면 여기도 고친다.

## 진행 규율 (불변)

```
사이클 실행 → 오류 발견 시 → 즉시 수정 → 다시 시연(클린할 때까지) → 애매한 사항은 마지막에 한꺼번에 질문
```

- **오류**(크래시·렌더 깨짐·터치 무반응·잘못된 텍스트/수치)는 도중에 고치고 재시연. 고침은 등재·사각 분석·형제 사냥(grep 전수)까지 = 완료.
- **애매한 사항**(취향·문구·밸런스 의문)은 건드리지 말고 메모, 오류 다 고친 뒤 모아서 질문.
- **계정 안전**: 인증 테스트는 **더미/QA 계정만** — 사용자 실계정·실비밀번호 입력 금지.

## 0. 사전조건 확인

> 🔴 **2026-09-08 정책 변경 — ~~공용 2대 + 클레임~~ 은 폐지됐다.**
> **프로젝트마다 자기 AVD 를 외장 `D:\emulators\<프로젝트명>` 에 만든다.**
> 정본은 [`C:\project\common\EMULATOR_POOL.md`](../../../EMULATOR_POOL.md) — **값을 여기 베끼지 말고 거기서 읽는다**
> (정책이 3주에 두 번 바뀌었다. 베끼면 이 파일이 또 낡는다).
>
> ⚠ **외장은 콜드 부팅이 7.8배 느리다**(259초 · 내장 33초). 실패가 아니라 느린 것이다 — 그 문서 §0 을 먼저 읽어라.

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"      # Windows. macOS/Linux: ~/Library/Android/sdk · ~/Android/Sdk
EMU="$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe"

# ① 지금 무엇이 붙어 있나 — **내 것만** 건드리기 위해 먼저 본다
"$ADB" devices
"$ADB" -s emulator-5586 emu avd name    # 🔴 포트로 AVD 를 식별하지 않는다. 이름을 물어본다

# ② 내 AVD 가 없으면 만든다 (프로젝트당 한 번)
export ANDROID_AVD_HOME='D:\emulators	ts_sentence'    # 🔴 이 줄을 빼먹으면 C: 에 만들어진다
mkdir -p "/d/emulators/tts_sentence"
avdmanager create avd -n tts_sentence -k "system-images;android-35;google_apis;x86_64" -d pixel_6
```

🔴 **포트는 [`DEV_ALLOCATION.md`](../../../DEV_ALLOCATION.md) §3 표에서 배정받는다**(짝수 5554~5680).
🟢 시스템 이미지는 SDK(C:)에 공유로 남는다 — 외장에 가는 건 `userdata` 뿐이라 중복되지 않는다.

🔴 **모든 adb 명령에 `-s <serial>`. 예외 없다** — 실기기·형제 에뮬레이터가 같이 붙어 있다.

```bash
SER=emulator-5586      # 🔴 맨 위에서 한 번 정하고 모든 명령에 붙인다
```

🔴 **`emu kill` 만 위험한 게 아니다 — `input tap` 이 더 위험하다**(2026-09-08 dungeon_guide 지적).
```
emu kill      → 남의(또는 사용자 폰의) 에뮬을 끈다
input tap     → 🔴 사용자 폰에 **맹목적으로 좌표를 찍는다.** 되돌릴 수 없는 것을 누를 수 있다
input text    → 🔴 사용자 폰에 글자를 넣는다
```
🔴 **위험 순서는 `input` > `screencap` > `emu kill` 이다**(2026-09-08 농구명가 재정렬):
```
input tap/text  🔴 남의 폰에 좌표를 찍고 글자를 넣는다. 되돌릴 수 없다
exec-out screencap  🔴 **남의 화면을 보고 판정한다.** 이 스킬의 존재 이유가 통째로 엉뚱한 기기의 것이 된다 — 조용해서 더 나쁘다
emu kill        끄고 끝난다
```

🔴 **검출을 "금지 동사 열거"로 하지 마라 — 열거하면 또 빠뜨린다.**
```
"emu kill" 로 검출            →  1곳
동사 열거(emu|shell|install)  →  8곳     ← exec-out 이 빠졌다
🟢 허용 목록(기기를 안 골라도 되는 것만 통과)  → 10곳
```
→ **`devices`·`wait-for-device`(연결 전)·`pair`·`connect`·`mdns` 처럼 기기를 안 고르는 게 정상인 것만 통과시키고,
  목록에 없는 동사는 전부 FAIL.** 농구명가는 변이로 `bugreport`(아무도 안 쓰는 동사)를 넣어 걸리는지 확인했다.
⚠ `$ADB` 를 안 쓰고 `adb` 로 직접 부르는 줄도 같이 본다.

## 1. 부팅 + 빌드·설치

```bash
export ANDROID_AVD_HOME='D:\emulators	ts_sentence'   # 🔴 띄울 때도 필요하다
"$EMU" -avd tts_sentence -port 5586 -no-snapshot -no-snapshot-save -no-boot-anim -gpu auto &
# 🔴 -port 고정: 빼면 조용히 5554 로 가서 **남의 에뮬을 덮는다**
# 🔴 -no-snapshot-save: 빼면 종료할 때 snapshots/default_boot 가 **GB 단위로** 쌓인다
#    (실제로 당함 — 2026-09-01 my_word 세션이 이 옵션을 빠뜨려 2.6G 를 남겼다)
# ⚠ 창이 안 뜨고 죽으면(`Failed to load opengl32sw`) -no-window -gpu swiftshader_indirect 를 더한다.
#    headless 여도 screencap·input tap 은 그대로 된다.
"$ADB" -s "$SER" wait-for-device
until [ "$("$ADB" -s "$SER" shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
# Expo 앱 빌드+설치(첫회 수십 분). JDK·ANDROID_HOME 환경 맞춰서:
ANDROID_SERIAL=emulator-5586 npx expo run:android --port 8093 --device tts_sentence   # 🔴 Expo Go 는 안 된다(로컬 Kotlin 모듈)
# dev-client 런처면 Metro 서버 행 탭 / dev 메뉴 Continue.
```

- 이미 설치돼 있으면 재빌드 말고 `"$ADB" -s "$SER" shell monkey -p com.vivacegames.sentencetts -c android.intent.category.LAUNCHER 1`로 앱만 재실행.
- ⚠ Expo 프로젝트면 `metro.config.js` blockList로 `.test/.spec` 파일을 번들에서 제외해야 require.context가 테스트 파일을 끌어와 깨지지 않는다.

## 2. 보고-판단-탭 루프 (핵심)

한 동작 = 한 확인. 화면 안 보고 연속 탭 금지.

```bash
"$ADB" -s "$SER" exec-out screencap -p > shot.png
```
→ **Read(shot.png)** → 다음 동작 판단 → 탭 → 다시 screencap.

### ⚠ 좌표 환산 (가장 자주 틀림)

- screencap PNG는 기기 네이티브 해상도(예 1080×W). Read로 열면 harness가 축소 표시하고 **"× N.NN" 배율 안내**를 붙인다.
- **내가 본 좌표 × (안내 배율) = 기기 좌표.** `adb shell input tap` 은 **기기 좌표**를 받는다 → 항상 본 좌표에 그 배율을 곱해 탭한다(안 곱하면 빗나감).

```bash
"$ADB" -s "$SER" shell input tap <devX> <devY>            # 기기 좌표(= 본 좌표 × 배율)
"$ADB" -s "$SER" shell input text "hello"
"$ADB" -s "$SER" shell input swipe <x1> <y1> <x2> <y2> 300
"$ADB" -s "$SER" shell input keyevent 4                   # 뒤로
```

### 빗나가면 — uiautomator bounds

RN 텍스트 노드는 안 잡혀도 **버튼 bounds는 잡힌다**.

```bash
MSYS_NO_PATHCONV=1 "$ADB" -s "$SER" shell uiautomator dump /sdcard/ui.xml   # Git Bash: 프리픽스 필수(/sdcard 경로 망가짐 방지)
MSYS_NO_PATHCONV=1 "$ADB" -s "$SER" shell cat /sdcard/ui.xml > ui.xml
# bounds="[x1,y1][x2,y2]" 중심 = ((x1+x2)/2,(y1+y2)/2) 로 탭(이미 기기 좌표 — 배율 곱 X)
```

## 3. 관찰 포인트

- **표시 텍스트**: placeholder 날것(`{name}`)·조사/복수형 깨짐·잘못된 이름을 스크린샷에서 눈으로 — 이게 see-and-tap의 고유 가치(엔진 sim은 key로만 해소해 표시 텍스트를 못 본다).
- **진행 게이트·자동 넘김**: 멈춤 지점이 곧 확인 포인트.
- **dev 전용 화면**: 빌드 환경 플래그(`__DEV__`/`EXPO_PUBLIC_APP_ENV` 류)로 노출되는 디버그/시뮬 화면 확인.

## 4. 끝나면

- **결과 기록**: 사이클·날짜·사전조건·PASS/오류·애매(질문대기). 핵심 스크린샷만 보관.
- 오류 고쳤으면 프로젝트 엣지케이스 레지스트리에 등재 + 형제 사냥 + 영향 계층 테스트.
### 🔴 반납 — 셋을 다 해야 끝이다

```bash
"$ADB" -s emulator-5586 emu kill      # 🔴 -s 없이 부르면 붙어 있는 아무 기기로 간다
```

🟢 **내 AVD 라 앱을 지울 필요도, 클레임을 해제할 필요도 없다** — 프로젝트별로 되돌린 이득이다.
⚠ **다만 외장은 부팅이 4분이다.** 곧 다시 쓸 거면 **끄지 말고 켜 둔다**(EMULATOR_POOL §0).
🔴 **`emu kill` 에 `-s` 를 빼지 마라 — 하필 kill 이라 최악이다**(2026-09-08 농구명가 발견).
프로젝트별 AVD 가 돼도 **`adb` 서버는 한 대**라, `-s` 없는 명령은 **붙어 있는 아무 기기**로 간다.
§2.1(실기기가 붙어 있으면 그쪽으로 간다)과 같은 모양인데 **끄는 명령**이라 대가가 다르다.
⚠ 2026-09-08 실측: `-s` 없는 `emu kill` 이 **4개 프로젝트 스킬**에 실행 명령으로 있었다.

🚫 **남의 에뮬은 건드리지 않는다** — `force-stop` · 특히 `adb kill-server`(남의 연결이 같이 끊긴다).
   끄기 전에 `emu avd name` 으로 **내 것인지 확인**한다.

## 사이클 사전조건 — 필수 기입 7항목

재현 가능해야 테스트다. 케이스마다 빠짐없이: ① 빌드/환경 ② 계정 상태(신규/기존) ③ 과금/권한 상태 ④ 보유 자원(인벤토리) ⑤ 도메인 상태(진행도·날짜·엔티티 구성) ⑥ **선행 화면**(직전에 있던 화면) ⑦ **선행 동작**(무엇을 해서 여기 왔나). 그 뒤 절차·기대·관찰 포인트.

> 같은 화면이라도 *어떤 경로로 왔는가*가 상태를 가른다(게이트·캐시·세션). ⑥⑦을 생략하면 버그가 재현 안 된다.

## 읽어줘 전용 메모 (2026-09-26 실측)

- 재생 상태는 화면보다 **미디어 세션**이 정확하다. 화면을 끈 채로도 읽힌다:
  `"$ADB" -s "$SER" shell dumpsys media_session | grep -A16 'package=com.vivacegames.sentencetts' | grep -oE 'state=[A-Z]+\([0-9]\)|description=[^,]*'`
- 화면 끄기/켜기: `input keyevent 223` / `224` + `wm dismiss-keyguard`. 잠금화면 [다음]: `cmd media_session dispatch next`.
- 포그라운드 서비스 확인: `dumpsys activity services com.vivacegames.sentencetts | grep isForeground`.
- 딥링크로 화면 이동: `am start -a android.intent.action.VIEW -d "sentencetts://player" com.vivacegames.sentencetts`.
- ⚠ 이 AVD 의 Google TTS 에는 **한국어 목소리가 없다**(en-US 만). 한국어 발음 확인은 실기기에서 한다.
- ⚠ `input text` 는 한글을 못 친다. 테스트 문장은 영어로 넣는다.
