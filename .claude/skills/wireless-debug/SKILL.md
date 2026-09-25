---
name: wireless-debug
description: 실기기를 무선(Wi-Fi)으로 adb 에 붙여 **화면을 보고 좌표로 탭**하는 절차 — 최초 1회 페어링(adb pair + 6자리 코드), 매번 연결(mDNS 자동 발견), 스크린샷(exec-out screencap → Read), px↔dp 환산, 그리고 함정들(adb 가 PATH 에 없다 · -s 없이 쓰면 에뮬레이터로 간다 · adb shell screencap 은 Windows 에서 파일이 깨진다 · 포트가 켤 때마다 바뀐다 · adb 연결과 앱↔개발서버 연결은 별개다). 사용자가 "무선 디버깅"·"폰 연결"·"실기기로 확인"·"화면 봐줘"·"adb 연결"·"wireless debug" 라고 하거나, 에뮬레이터를 못 쓰는 상황에서 실기기 확인이 필요할 때 호출. 에뮬레이터로 도는 시나리오 테스트는 `emulator-test`.
---

# wireless-debug — 실기기를 무선으로 붙여 보고 만지기 (범용)

> **왜**: 에뮬레이터가 못 잡는 것이 있다 — 실제 해상도·밀도, 제조사 스킨, 몰입 모드/시스템 UI,
> 실제 터치 히트박스, 그리고 **에뮬레이터를 다른 용도로 쓰고 있어 못 건드릴 때**.
> USB 케이블 없이 같은 Wi-Fi 만으로 붙는다.
>
> 형제 스킬: 시나리오를 끝까지 도는 것은 `emulator-test`(같은 "보고 탭한다" 방식). 이 스킬은 **연결과 관측**이다.
>
> 🔴 **사용자의 개인 기기다.** 화면·계정·설정을 함부로 건드리지 않는다(§6).

## 0. 준비

| | |
|---|---|
| 기기 | Android **11 이상**(무선 디버깅은 11부터) · 개발자 옵션 켜짐 |
| 네트워크 | PC 와 **같은 Wi-Fi**. 게스트망·AP 격리(Client Isolation)면 안 된다 |
| adb | **platform-tools 30.0+**(`adb pair` 지원). 실측 기준: `1.0.41 / 37.0.0` |

```bash
# 🔴 Windows 에서 adb 는 PATH 에 없는 경우가 많다 — 전체 경로를 변수로 잡고 시작한다
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"     # Windows
# macOS: ~/Library/Android/sdk/platform-tools/adb · Linux: ~/Android/Sdk/platform-tools/adb
"$ADB" version
```

## 1. 최초 1회 — 페어링

기기에서: **설정 → 개발자 옵션 → 무선 디버깅 → 켜기 → "페어링 코드로 기기 페어링"**
→ 화면에 **`IP:포트`** 와 **6자리 코드**가 뜬다(이 창을 닫으면 코드가 무효가 된다).

```bash
"$ADB" pair 192.168.0.22:41234        # ← 페어링 창의 IP:포트 (연결 포트와 다르다!)
# Enter pairing code: 123456
# Successfully paired to ...
```

- **페어링은 한 번이면 된다** — 기기·PC 조합으로 기억된다. 무선 디버깅을 껐다 켜도 다시 안 해도 된다.
- ⚠ **페어링 포트 ≠ 연결 포트.** 페어링 창의 포트는 그 순간만 쓰는 임시 포트다.
- 코드가 안 먹으면: 창을 닫았거나(재발급), 다른 Wi-Fi 이거나, 방화벽.

## 2. 매번 — 연결

**대개 아무것도 안 해도 된다.** adb 가 mDNS 로 알아서 찾는다:

```bash
"$ADB" devices -l
# adb-R3CX40SP08V-n99qTJ._adb-tls-connect._tcp   device   model:SM_S921N ...
```

이 `adb-<시리얼>-xxxx._adb-tls-connect._tcp` 가 **그 기기의 주소(serial)** 다. 안 보이면:

```bash
"$ADB" mdns services                  # 발견 목록 — IP:포트가 여기 나온다
"$ADB" connect 192.168.0.22:44385     # 무선 디버깅 화면에 표시된 IP:포트로 직접
```

🔴 **연결 포트는 무선 디버깅을 껐다 켤 때마다·재부팅할 때마다 바뀐다.**
그래서 **IP:포트를 기억해 두면 안 되고**, 매번 `adb devices` / `mdns services` 로 다시 읽는다.

## 3. 화면 보기

```bash
S="<위에서 읽은 serial>"
"$ADB" -s "$S" exec-out screencap -p > <scratch>/screen.png
```
그다음 **Read 도구로 그 PNG 를 열어** 눈으로 본다.

| 🔴 하지 마라 | 왜 |
|---|---|
| `adb shell screencap -p > x.png` | **Windows 에서 파일이 깨진다** — 셸이 `\n` 을 `\r\n` 으로 바꿔 PNG 가 손상된다. **반드시 `exec-out`** |
| `adb shell screencap -p /sdcard/x.png` + `pull` | 돌긴 하는데 기기에 쓰레기가 남는다. `exec-out` 이면 파일이 안 남는다 |

지금 무슨 화면인지 **이름으로** 확인:

```bash
"$ADB" -s "$S" shell dumpsys window | grep -m2 "mCurrentFocus\|mFocusedApp"
# mCurrentFocus=Window{... host.exp.exponent/...ExperienceActivity}   ← Expo Go
```

## 4. 좌표로 탭 — px 인가 dp 인가

```bash
"$ADB" -s "$S" shell wm size       # Physical size: 1080x2340      ← 물리 px
"$ADB" -s "$S" shell wm density    # Override density: 420          ← 실제 적용 밀도
"$ADB" -s "$S" shell input tap 1350 370
"$ADB" -s "$S" shell input swipe 900 600 300 600 200    # x1 y1 x2 y2 ms
"$ADB" -s "$S" shell input keyevent KEYCODE_BACK        # 하드웨어 뒤로가기
```

🔴 **`input tap` 은 물리 px 이고, 레이아웃 코드는 dp 다.** 환산:

```
dp = px ÷ (density ÷ 160)
예) 2340 × 1080, density 420 → 2.625 배 → 891 × 411 dp (실측: Galaxy S24 가로)
```

⚠ **스크린샷이 축소되어 보일 때**(도구가 "displayed at …, multiply by N" 이라고 알려 준다)
그 배율을 **먼저 곱해 원본 px** 로 만든 뒤 `input tap` 에 넣는다. 이 두 번의 환산을 헷갈리면 엉뚱한 데를 누른다.

## 5. 함정 도감

| 증상 | 원인 · 처방 |
|---|---|
| `adb: command not found` | PATH 에 없다 → §0 처럼 **전체 경로 변수**로 |
| `more than one device` / 엉뚱한 기기에 명령이 감 | 에뮬레이터가 같이 떠 있다 → **모든 명령에 `-s "$S"`**. 예외 없다 |
| `adb devices` 가 비었다 | ① 데몬이 방금 떴다 → 수 초 뒤 재시도 ② 기기 화면이 **잠겨 있다**(잠금 해제 필요) ③ 무선 디버깅이 꺼졌다 ④ Wi-Fi 가 바뀌었다 |
| 갑자기 끊긴다 | 기기가 절전으로 Wi-Fi 를 내린다 → 충전 연결 또는 개발자 옵션 **"화면 켜짐 유지"** |
| 스크린샷이 안 열린다/깨졌다 | `adb shell` 로 받았다 → **`exec-out`**(§3) |
| 붙었는데 **앱이 서버·Metro 에 못 붙는다** | 🔴 **adb 연결과 앱의 네트워크는 별개다.** adb 는 디버깅 채널일 뿐 앱 트래픽을 안 나른다. 앱은 LAN IP·tailnet 주소로 직접 붙어야 한다(각 프로젝트의 개발 스택 문서) |
| 위를 adb 로 해결하고 싶다 | `"$ADB" -s "$S" reverse tcp:<port> tcp:<port>` → 기기의 `localhost:<port>` 가 **PC 로** 온다. 무선에서도 된다. 단 앱 설정을 `localhost` 로 바꿔야 하고 **연결이 끊기면 같이 죽는다** |
| 끝났을 때 | `"$ADB" -s "$S" disconnect` 로 **그 기기만** 끊는다. 🚫 `adb kill-server` 는 남의 세션(에뮬레이터·다른 프로젝트)까지 끊는다 |

## 6. 🔴 사용자의 실기기다 — 지킬 것

- **화면 캡처는 스크래치패드에만.** 알림·연락처·계정 이메일이 찍힐 수 있다 — **레포에 커밋하지 않는다.**
- **계정·결제·시스템 설정을 건드리지 않는다.** 로그인 테스트는 더미 계정으로, 실비밀번호 입력 금지.
- **되돌릴 수 없는 동작**(삭제·구매·전송·탈퇴)은 **누르기 전에 사용자에게 확인**한다.
  화면을 보는 것과 누르는 것은 다르다 — 이 스킬의 기본은 **보는 것**이고, 탭은 목적이 분명할 때만.
- 앱을 강제 종료(`am force-stop`)하거나 데이터를 지우는(`pm clear`) 명령은 **사용자가 요청했을 때만.**
- 다 하고 나면 **무엇을 눌렀는지** 보고에 남긴다(사용자가 자기 기기에서 무슨 일이 있었는지 알아야 한다).

## 7. 프로젝트별로 둘 것

이 문서는 **연결·관측 방법**만 담는다. 아래는 각 레포의 문서·스킬이 정한다:

- 앱이 붙을 개발 서버·Metro 주소(LAN / tailnet / `adb reverse`)와 기동 순서
- 그 기기의 기준 해상도·dp(레이아웃 예산의 기준값)
- 화면 시나리오(무엇을 눌러 무엇을 확인하나) — `emulator-test` 형식의 사이클

> 🔴 **연결됐다 ≠ 확인했다.** 보고할 때 *"스택은 떴다"* 와 *"화면을 눈으로 봤다"* 를 나눠 쓴다.
> 실기기 세션의 값어치는 **눈으로 본 것**에서 나온다.
