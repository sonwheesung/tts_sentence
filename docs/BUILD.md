# BUILD — 릴리스 빌드 · 업로드 키 · Play 업로드

순서의 정본은 `C:\project\common\PLAY_FIRST_UPLOAD.md`, 함정 도감은 `PLAY_RELEASE_AUTOMATION.md` §5 다.
여기에는 **이 앱의 값과 그날 실측**만 적는다.

## 0. 현황

| 항목 | 상태 |
|---|---|
| Play 앱 | ✅ **읽어줘** · 앱 ID `4973195218256924403` · `com.vivacegames.sentencetts` · 기본 언어 ko-KR · 앱 · 무료 · 자동 보호 켜짐 (2026-09-26 생성) |
| 업로드 키 | ✅ 2026-09-26 생성 (§2) |
| AAB vc1 (0.1.0) | ✅ 구움 · `D:\builds\tts_sentence\sentencetts-vc1.aab` (59,654,197 bytes) · 업로드 키 서명 확인 |
| 서비스 계정 → 이 앱 권한 | ❌ **사용자 몫** (§4) |
| 내부 테스트 업로드 · 게시 | ❌ 위가 끝나야 한다 |

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

🔴 ①은 **권한 부여**라 세션이 하지 않는다(2026-09-26 자동 모드 분류기가 막았다). 사용자가 하거나, 사용자가 명시적으로 세션에 맡긴다.
정책의 정본: `common/PLAY_RELEASE_AUTOMATION.md` §4 (테스트 트랙 권한은 상시 · 프로덕션은 영구히 끈다).
