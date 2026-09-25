# TTS_SYSTEM — 음성 프리셋 · 합성 · 캐시 · 라이선스

## 0. 구현 현황

| 항목 | 상태 | 비고 |
|---|---|---|
| 엔진 목록 조회 | ✅ | `TtsManager.engines` · 매니페스트 `<queries>` TTS_SERVICE 필요 |
| 목소리 목록 조회 | ✅ | 에뮬레이터(Google 엔진)는 en-US 9개만 설치돼 있었다(2026-09-26 실측) |
| 파일 합성(`synthesizeToFile`) + 무음 꼬리 | ✅ | `WavPadder` · 1초 간격 파일 1,995ms 실측 |
| 합성 캐시 | ✅ | `features/tts.ts` · 설정에서 비우기 |
| 음성 프리셋 CRUD · 기본 지정 | ✅ | `app/preset/*` |
| 첫 실행 기본 프리셋 자동 생성 | ✅ | 한국어 목소리가 없으면 엔진 기본 목소리 |
| 한국어 목소리 없음 안내 | ✅ | 목소리 관리 화면 상단 · 휴대폰 TTS 설정 열기(`com.android.settings.TTS_SETTINGS`) |

---

## 1. 음성 프리셋

프리셋 = **엔진 + 목소리 + 속도 + 높낮이** + 이름. 사용자가 "여러 TTS" 라고 부른 것이다(CLAUDE.md 결정 #3).

| 필드 | 뜻 | 범위 |
|---|---|---|
| `name` | 화면에 보이는 이름 | 1~30자 |
| `engine` | 엔진 패키지명(`com.google.android.tts` 등). `NULL` 이면 기기 기본 엔진 | |
| `voice` | `Voice.getName()`. `NULL` 이면 그 엔진의 기본 목소리 | |
| `rate` | `setSpeechRate` 값 | 0.5 ~ 2.0 (0.1 단위) · 기본 1.0 |
| `pitch` | `setPitch` 값 | 0.5 ~ 2.0 (0.1 단위) · 기본 1.0 |

- 기본 프리셋 id 는 `settings.default_preset_id` 에 둔다(DATABASE.md). 프리셋 행에 `is_default` 를 두지 않는다.
  둘이 기본이 되는 상태를 스키마가 아예 못 만들게 하려는 것이다.
- **첫 실행**: 프리셋이 0개면 `기본 목소리`(엔진·목소리 `NULL`, 1.0/1.0)를 만들고 기본으로 지정한다.
  한국어 목소리가 있으면 그중 하나를 고른다(`ko` 로케일 · 네트워크 불필요 · 설치됨).

## 2. 엔진 · 목소리 조회

- 엔진: `TextToSpeech.getEngines()` → `{ name, label }[]`, 기본 엔진은 `getDefaultEngine()`.
- 목소리: 엔진별로 `TextToSpeech(context, listener, engine)` 을 만들고 초기화가 끝나면 `getVoices()`.
  - **걸러 낸다**: `isNetworkConnectionRequired()` 가 참인 것 · `KEY_FEATURE_NOT_INSTALLED` 가 있는 것.
    기둥 3(기기 안에서 끝난다)이다. 네트워크 목소리는 오프라인에서 합성이 실패한다.
  - 한국어(`ko`)를 앞에, 나머지는 로케일 순.
- 🔴 **한국어 목소리가 없는 기기가 있다.** 그러면 한국어 문장을 영어 목소리가 읽어 알아듣기 어렵다.
  목소리 관리 화면 맨 위에 안내와 [휴대폰 음성 설정 열기] 버튼을 띄운다. 부모님 폰에 설치할 때 한국어 음성 데이터를 먼저 확인한다.
- 목소리 이름은 기계 이름(`ko-kr-x-ism-local`)이라 화면에는 **로케일 + 순번**으로 보인다(`한국어 목소리 3`).

## 3. 합성

```
text, preset(engine, voice, rate, pitch), gapMs
  → key = sha256(engine|voice|rate|pitch|text)
  → cache/tts/<key>.wav 없으면 synthesizeToFile 로 만든다
  → cache/tts/<key>_g<gapMs>.wav 없으면 끝에 gapMs 만큼 무음을 붙여 만든다
  → 재생 서비스에 파일 경로를 넘긴다
```

- 합성은 엔진별 `TextToSpeech` 인스턴스 하나로 **순서대로** 한다. 한 인스턴스에 동시에 여러 요청을 넣으면
  `UtteranceProgressListener` 로 끝을 구분해야 하므로 요청마다 `utteranceId` 를 달고 완료를 기다린다.
- 목소리가 이 기기에 없으면(`voice` 이름으로 못 찾음) 엔진 기본 목소리로 합성한다(CLAUDE.md §8).
- 무음 꼬리: WAV(PCM 16bit) `data` 청크 뒤에 0 을 `sampleRate × channels × 2 × gapMs/1000` 바이트 붙이고
  RIFF·data 크기를 고친다. **간격을 파일에 넣는 이유**는 PLAYER_SYSTEM.md §3.
- ⚠ 엔진이 WAV 가 아닌 형식을 쓰면(확인한 엔진 없음) 무음을 붙이지 않고 원본을 쓴다. 간격이 0 이 된다.

## 4. 캐시

- 위치: `Paths.cache/tts/`. OS 가 비울 수 있는 자리다. 재생 전에 **파일이 있는지 매번 확인**하고 없으면 다시 만든다.
- 키에 본문·프리셋 값이 다 들어가므로 문장·프리셋을 고치면 새 키가 된다. 옛 파일은 남는다.
- 설정 화면에 **음성 캐시 비우기**를 둔다(용량 표시).

## 5. 라이선스 판단 (2026-09-25)

| 방식 | 판단 |
|---|---|
| 기기 내장 엔진을 `TextToSpeech` API 로 호출 | ✅ 채택. 앱이 음성 데이터를 **포함하지도 배포하지도 않는다.** 사용자가 기기에 이미 가진 엔진을 OS 표준 API 로 부른다. 광고가 붙은 TTS 낭독 앱이 Play 에 다수 있는 방식이다 |
| 합성 결과를 앱 캐시에서 재생 | ✅ 사용자 본인 기기에서 본인이 듣는 용도 |
| 합성 결과 내보내기·공유 | 🚫 만들지 않는다(결정 #4). 엔진 음성의 재배포로 읽힐 수 있다 |
| 클라우드 TTS(Google Cloud 등) | 🚫 유료 |
| 오픈소스 음성 모델 내장(Piper 등) | 🚫 모델마다 라이선스가 다르다(비상업 CC-BY-NC 가 섞여 있다) · 용량 |

- ⏸ **확인 못 한 것**: "Speech Services by Google" 온디바이스 엔진의 약관에 상업 앱 호출을 명시적으로 허용하는 문장.
  2026-09-25 검색에서 공식 문장을 찾지 못했다. **금지 문장도 찾지 못했다.** 출시를 정할 때 다시 확인한다.
  부모님용 비공개 사용에는 영향이 없다.
