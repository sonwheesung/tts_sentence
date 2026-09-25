# docs — 색인 · 구현 현황

## 1. 문서 목록

| 문서 | 범위 | 상태 |
|---|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | 설계 정본 · 기둥 · 결정 로그 | ✅ |
| [`PLAN.md`](./PLAN.md) | Phase 0~5 | ✅ |
| [`DOC_DISCIPLINE.md`](./DOC_DISCIPLINE.md) | 문서 작업법 | ✅ |
| [`TTS_SYSTEM.md`](./TTS_SYSTEM.md) | 음성 프리셋 · 합성 · 캐시 · 라이선스 | ✅ |
| [`PLAYER_SYSTEM.md`](./PLAYER_SYSTEM.md) | 대기열 · 반복 · 백그라운드 재생 | ✅ |
| [`DATABASE.md`](./DATABASE.md) | 스키마 · 마이그레이션 | ✅ |
| [`UI_GUIDE.md`](./UI_GUIDE.md) | 화면 표 · 토큰 · 금지 목록 | ✅ |
| [`BUILD.md`](./BUILD.md) | 업로드 키 · AAB · Play 업로드 · 빌드 실측 | ✅ |

## 2. 구현 현황

| 영역 | 상태 | 비고 |
|---|---|---|
| 뼈대(Phase 0) | ✅ | |
| 네이티브 모듈(Phase 1) | ✅ | `modules/sentence-audio` (Kotlin 4파일) |
| 문장 · 프리셋(Phase 2) | 🔨 | 코드 완료 · 기기 확인 일부 |
| 재생목록 · 플레이어 UI(Phase 3) | ✅ | |
| 설정 · 광고 자리(Phase 4) | 🔨 | 릴리스 APK 없음 |

상세 현황은 각 시스템 문서 §0 과 `PLAN.md` 가 정본이다.

## 3. 검증 루틴

```bash
npm run typecheck
npm run lint
npm run build:aab      # 릴리스 AAB (서명 게이트 포함 · docs/BUILD.md)
```

에뮬레이터: AVD `tts_sentence` · `emulator-5586` · Metro 8093 (`common/DEV_ALLOCATION.md`).
🔴 모든 `adb` 에 `-s emulator-5586` 을 붙인다.

```bash
# 개발 빌드 설치 + Metro (Expo Go 는 안 된다. 로컬 네이티브 모듈이 있다)
ANDROID_SERIAL=emulator-5586 npx expo run:android --port 8093 --device tts_sentence
```

⚠ `@expo/vector-icons` 15.1.1 은 peer `expo-font` 를 최신(57)으로 끌어와 앱이 켜지자마자 죽었다
(`NoSuchMethodError … ReturnTypeKt.getDirectConverter`). `expo-font ~14.0.12` 를 직접 의존성 + `overrides` 로 고정했다.
`npx expo install --check` 는 이것을 **못 잡았다**(2026-09-26).

## 4. 아키텍처 원칙

- 서버 없음 · 기기 SQLite 가 정본(CLAUDE.md §4·§6).
- 재생 대기열은 네이티브 서비스가 쥔다(PLAYER_SYSTEM.md).
