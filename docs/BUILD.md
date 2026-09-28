# BUILD — 릴리스 빌드 · 업로드 키 · Play 업로드

순서의 정본은 `C:\project\common\PLAY_FIRST_UPLOAD.md`, 함정 도감은 `PLAY_RELEASE_AUTOMATION.md` §5 다.
여기에는 **이 앱의 값과 그날 실측**만 적는다.

## 0. 현황

| 항목 | 상태 |
|---|---|
| Play 앱 | ✅ **낭랑**(콘솔 등록명은 아직 `읽어줘` · 결정 #15) · 앱 ID `4973195218256924403` · `com.vivacegames.sentencetts` · 기본 언어 ko-KR · 앱 · 무료 · 자동 보호 켜짐 (2026-09-26 생성) |
| 업로드 키 | ✅ 2026-09-26 생성 (§2) |
| AAB vc1 (0.1.0) | ✅ 구움 · `D:\builds\tts_sentence\sentencetts-vc1.aab` (59,654,197 bytes) · 업로드 키 서명 확인 |
| 서비스 계정 → 이 앱 권한 | ✅ 2026-09-28 · `앱을 테스트 트랙으로 출시` 만(프로덕션 꺼짐 확인). 세션이 권한 창을 채우고 **적용·저장·예 는 사용자가 눌렀다**(자동 모드 분류기가 세션의 권한 부여를 막았다) |
| 내부 테스트 업로드 · 게시 | ✅ **vc3 (0.3.0) 2026-09-28 게시** · OTA 첫 탑재(§3.2 · §5). 이전: **vc2 (0.2.0) 게시**(API `internal completed versionCode 2`) · 앱 이름 낭랑 · 안 쓰는 권한 제거. 이전: vc1 (0.1.0) 18:36 · `internal · completed`(API 확인) · 테스터 `사장님 검증 전용`(2명) + **`가족`(2명 · 2026-09-28 사용자 지시로 추가 · 새로고침 후 유지 확인)** · 검토되지 않음 · 신규 설치 19.8MB · 프로덕션 출시 0건(API 확인) |

## 1. 왜 스크립트인가

`npm run build:aab` (`scripts/build-aab.sh`) 가 전부 한다: 검증 → prebuild(서명 값 주입) → 🔴 게이트(서명이 `android/` 에 들어갔나 · versionCode 일치) → `bundleRelease` → 🔴 서명 SHA1 대조 → 병합 권한 출력 → `D:\builds\tts_sentence\sentencetts-vc<N>.aab` 로 보관.
값이 없으면 플러그인(`plugins/with-upload-signing.js`)이 디버그 키로 조용히 떨어지고 빌드는 성공한다. 그래서 게이트를 코드에 뒀다(`PLAY_FIRST_UPLOAD.md` §3).

## 2. 업로드 키: 🔴 잃으면 되돌릴 수 없다

| | |
|---|---|
| 키스토어 | `C:\project\secrets\sentencetts-upload.jks` (저장소 밖) |
| 비밀번호 · 별칭 | `C:\project\secrets\sentencetts-upload.env` (`KEYSTORE_PATH` · `STORE_PASSWORD` · `KEY_ALIAS` · `KEY_PASSWORD`) · 🚫 값을 문서·로그에 안 적는다 |
| 소유자 | `CN=sentencetts, O=vivacegames, C=KR` · RSA 2048 · 10000일 |
| SHA-1 (공개값) | `40:14:99:0A:B5:4E:09:B2:1E:EC:B9:0B:E5:B8:D1:F3:5F:E4:49:95` |
| SHA-256 (공개값) | `B6:7E:38:FD:AF:78:F6:97:71:A6:B7:8D:13:C4:4C:BD:38:61:54:1D:51:6B:A7:F4:B0:25:0F:EA:11:87:2C:44` |

⚠ 원본은 C: 에 둔다. 외장에만 두지 않는다(`common/BUILD_ARTIFACTS.md` §4).
⏸ 백업 사본은 아직 없다. 형제 앱 키들과 같은 방식으로 백업할지 사용자에게 확인한다.

## 3. vc1 실측 (2026-09-26)

- 빌드 시간: 약 15분(첫 릴리스 빌드 · 다른 작업과 겹쳐 느렸다)
- 병합 매니페스트 권한 9개: `ACCESS_NETWORK_STATE` · `DUMP` · `FOREGROUND_SERVICE` · `FOREGROUND_SERVICE_MEDIA_PLAYBACK` · `INTERNET` · `READ_EXTERNAL_STORAGE` · `VIBRATE` · `WAKE_LOCK` · `WRITE_EXTERNAL_STORAGE`
  - ⚠ 앱이 쓰지 않는 것: `DUMP` · `READ/WRITE_EXTERNAL_STORAGE` · `VIBRATE` (Expo 템플릿·라이브러리가 넣었다). **vc2 에서 `blockedPermissions` 로 뺀다.** 내부 테스트는 막지 않는다
  - 🔴 `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 은 **이 앱의 핵심이라 뺄 수 없다**(백그라운드 재생 · 기둥 2). SnoreLess 는 이 권한 때문에 **검토 제출 단계에서 FGS 시연 영상**을 요구받았다(`common/PLAY_CONSOLE_STATUS.md`). 내부 테스트는 검토가 없어 지금은 안 걸리고, **비공개·프로덕션으로 갈 때** 영상이 필요하다
- 미결정 B(`INTERNET`) 는 그대로다
- ✅ **릴리스 빌드를 켜 봤다**(SnoreLess vc11 교훈 · `common/PLAY_CONSOLE_STATUS.md`). 같은 서명·같은 JS 로 `assembleRelease`(x86_64) APK 를 뽑아 `emulator-5586` 에 깔았다:
  첫 화면까지 뜸 · `ReactNativeJS: Running "main"` · 문장 추가 → [듣기] → 미디어 세션 `PLAYING` · FATAL 0.
  ⚠ bundletool 이 이 PC 에 없어서 AAB 자체가 아니라 **같은 설정의 APK** 로 쟀다. 기기에 개발 빌드가 있었다면 서명이 달라 지우고 깔아야 한다

## 3.1 vc2 실측 (2026-09-28)

- 바뀐 것: 앱 이름 **낭랑**(결정 #15 · `aapt2 dump badging` 으로 `application-label:'낭랑'` 확인) · `blockedPermissions` 에 `DUMP` · `READ/WRITE_EXTERNAL_STORAGE` · `VIBRATE`
- 앱이 요청하는 권한 5개(기기 `dumpsys package` 실측): `FOREGROUND_SERVICE` · `FOREGROUND_SERVICE_MEDIA_PLAYBACK` · `INTERNET` · `ACCESS_NETWORK_STATE` · `WAKE_LOCK`
  - ⚠ `build-aab.sh` 의 권한 출력에는 `DUMP` 가 **여전히 찍힌다.** 매니페스트의 문자열을 훑기 때문이다. 이것은 요청 권한이 아니라 androidx profileinstaller 수신기의 `android:permission="android.permission.DUMP"`(부르는 쪽이 가져야 하는 권한)다. 요청 권한은 기기에서 `dumpsys package` 로 본다
- 릴리스 APK(같은 서명)를 vc1 위에 덮어 깔았다: 저장해 둔 문장이 남아 있었다 · [듣기] → `PLAYING` · FATAL 0
- 게시 경고는 vc1 과 같은 1개(가독화 파일 없음). 「지원 기기 변경」 안내가 떴지만 제외된 기기 목록은 비어 있었다
- ⚠ 콘솔 「저장 및 출시」 첫 클릭 뒤 확인창이 JS 로는 안 잡혔다. 스크린샷으로 확인창을 보고 `find` 로 그 안의 버튼을 눌렀다. **누른 뒤에는 API `--verify` 로 completed 를 확인한다**(첫 시도 뒤에는 draft 그대로였다)
- Play 의 표시 이름은 아직 `읽어줘`/`(unreviewed)` 다. 스토어 등록정보를 만들 때 바꾼다

## 3.2 vc3 실측 (2026-09-28 · OTA 첫 탑재)

- 바뀐 것: `expo-updates ~29.0.20`(결정 #16) · 탭바 높이를 `64 + insets.bottom` 으로(3버튼 내비게이션에 가리던 것) · 광고 자리 숨김(결정 #17) · 설정 맨 아래 빌드 마커
- 🔴 첫 빌드는 **자원 부족으로 죽었다**(`fork: Resource temporarily unavailable` · Gradle Worker Daemon 비정상 종료). 형제 세션 빌드와 겹친 시각이었다. 코드는 그대로 두고 한 번 더 돌려 통과했다(`common/PLAY_FIRST_UPLOAD.md` §5 의 lint 부하 사례와 같은 결)
- 채널 헤더 `{"expo-channel-name":"production"}` · runtime `1.0.0`(strings.xml) · 임베드 매니페스트 commitTime `2026-09-28T12:59:48Z`(새로 구웠다)
- 릴리스 APK 를 vc2 위에 깔아 콜드 스타트: 로그 `No update available`(서버 연결 정상 · 공용 §3.1 ③) · 설정 마커 `runtime 1.0.0 · update embedded · 2026-09-28 12:59`
- **3버튼 내비게이션으로 바꿔서** 확인했다: vc2 는 탭 글자가 바에 가렸고, vc3 는 탭 · 미니 플레이어가 바 위에 선다
- AAB 63.2MB(expo-updates 로 +3.5MB) · 신규 설치 23.3MB · 지원 기기 변화 0(전화 12,335)
- 내부 테스트 게시(API `internal completed versionCode 3`) · 프로덕션 0

## 5. OTA (expo-updates · 2026-09-28 · CLAUDE.md 결정 #16)

공용 원리는 `C:\project\common\OTA_RULES.md`, 이 앱의 모양은 프로게이머 스토리(`progamer_story/docs/BUILD.md` §4) 승계. 여기는 값과 절차만 적는다.

| 항목 | 값 |
|---|---|
| EAS 계정 · 프로젝트 | `shs00925` · `@shs00925/sentencetts` (`app.json` `extra.eas.projectId`) |
| runtimeVersion | **`1.0.0` 고정 문자열**. 🔴 네이티브(모듈 · 권한 · 플러그인 · SDK · **`modules/sentence-audio` Kotlin**)를 바꾸면 손으로 올리고 그때는 AAB 가 먼저다 |
| 채널 | `production`. `app.json` `updates.requestHeaders` 로 바이너리에 박는다(🔴 로컬 Gradle 빌드는 eas.json 채널을 안 읽는다 · 공용 §5) |
| 받는 시점 | `checkAutomatically: ON_LOAD` · 콜드 스타트에만 받는다 · 보장선은 **콜드 2회**(공용 §2) |
| 확인 마커 | 설정 화면 맨 아래 `버전 · 빌드 · 업데이트` 줄 |
| 닿는 빌드 | **vc3 부터.** vc1 · vc2 에는 expo-updates 가 없어 OTA 를 영영 못 받는다. 부모님 폰은 Play 에서 vc3 로 한 번 업데이트해야 한다 |

**OTA 로 되는 것**: JS · 화면 · 문구 · 이미지. **AAB 만**: Kotlin 모듈 · 권한 · 플러그인 · 폰트(공용 §1).
⚠ DB 마이그레이션(`db/index.ts`)은 추가만 하는 규약이라 OTA 로 나가도 옛 JS 가 새 DB 를 읽을 수 있다. 그래도 **열을 지우거나 뜻을 바꾸는 변경은 AAB 로만** 낸다(공용 §6 과 같은 이유).

**발행**(🔴 사용자가 지시할 때만 · 공용 §7):

```bash
npm run ota -- "YYMMDD :: 요약"      # 가드(HEAD 버전 범프 · 미커밋) → typecheck → lint → eas update --channel production
npx eas-cli update:list --branch production --limit 3   # exit 0 은 게시일 뿐 · 실제 목록을 본다
```

발행 뒤 폰에서 **최근 앱 목록에서 밀어 없애고 두 번** 켜서 설정의 마커가 바뀌는지 본다.

**AAB 를 구울 때마다**(공용 §3.1): `npm run build:aab` 가 임베드 매니페스트 산출물을 지우고 굽고, 채널 헤더가 매니페스트에 박혔는지 잰다.

## 4. 업로드: 🔴 선행 조건 (사용자 몫)

브라우저로는 AAB 를 못 올린다(파일 입력 10MB 상한 · vc1 은 59.7MB). 서비스 계정으로 API 를 부른다.

```
① Play Console → 사용자 및 권한 → 서비스 계정 → 앱 권한 → 「애플리케이션 추가」→ 읽어줘
     ☑ 앱을 테스트 트랙으로 출시      ← 이것만
     ☐ 프로덕션으로 출시              ← 꺼진 채로 확인
     ☐ 테스트 트랙 관리 및 테스터 목록 수정
   → 적용 → 변경사항 저장 → 확인 다이얼로그 「예」
② npm run play:upload -- --aab D:/builds/tts_sentence/sentencetts-vc1.aab --track internal --status draft
③ 콘솔 → 테스트 → 내부 테스트 → 테스터 목록 「사장님 검증 전용」 연결 → 출시 검토 → 게시
```

⚠ 게시 때 경고 1개: *가독화 파일 없음*(R8 을 안 켜서다 · Re:Read 와 같다 · 게시를 막지 않는다).
폰에는 한동안 `com.vivacegames.sentencetts (unreviewed)` 로 뜬다. 스토어 등록정보가 없어서 붙는 임시 이름이다.
테스터 참여 링크는 콘솔 → 내부 테스트 → 테스터 → 링크 복사. 🚫 공개 저장소라 링크를 문서에 적지 않는다.

🔴 ①은 **권한 부여**라 세션이 하지 않는다(2026-09-26 자동 모드 분류기가 막았다). 사용자가 하거나, 사용자가 명시적으로 세션에 맡긴다.
정책의 정본: `common/PLAY_RELEASE_AUTOMATION.md` §4 (테스트 트랙 권한은 상시 · 프로덕션은 영구히 끈다).
