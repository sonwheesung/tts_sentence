# 프로젝트 스킬 색인 (읽어줘)

`C:\project\common\.claude\skills`(범용 방법론)에서 이식했다. 2026-09-26.
**common 이 원본이다.** 범용 규율이 바뀌면 common 을 고치고 여기로 다시 내린다.
이 프로젝트에서 새로 겪은 함정이 다른 프로젝트에도 통하면 common 으로 올린다.
(승계: `C:\project\Bookmind\.claude\skills\README.md` 의 왕복 규약)

🔴 **값을 베끼지 않는다. 정본을 가리킨다.** 검증 명령의 정본은 `docs/README.md` §3,
포트·에뮬레이터의 정본은 `C:\project\common\DEV_ALLOCATION.md` 다.

---

## 이식한 것 (9종)

| 스킬 | 언제 | 이식 형태 |
|---|---|---|
| `reload-docs` | `/compact` 직후 · 새 세션 착수 전 | common + **읽는 순서 · 컴팩트가 떨어뜨리는 규칙** 절을 더했다 |
| `emulator-test` | 화면을 띄워 확인할 때 | common 의 `<…>` 자리를 이 프로젝트 값으로 채웠다 + **읽어줘 전용 메모**(미디어 세션으로 재생 상태 읽기 등) |
| `test` | "테스트 돌려" · 커밋 전 | common 그대로. 명령은 `docs/README.md` §3 을 읽어서 돈다 |
| `doc-consistency` | 문서 여러 개 갱신 후 · Phase 를 닫을 때 | common 그대로 |
| `gap-hunt` | 새 시스템·사건 추가 후 "빠진 반응 없나" (재생 중 전화·이어폰 뽑힘·오디오 포커스 같은 것) | common 그대로 |
| `devils-advocate` | 큰 기획 결정 전 · 출시 결정 전 | common 그대로 |
| `copy-polish` | 화면 문구 다듬기(외부 검수 결과를 기계로 대조) | common 그대로. 언어가 ko 하나라 다른 언어 반영 단계는 건너뛴다 |
| `wireless-debug` | 실기기(부모님 폰 등)를 무선으로 붙일 때 | common 그대로. Metro 는 `adb -s <serial> reverse tcp:8093 tcp:8093` |
| `check` | `/check` · "수정사항 확인" | `common/FIX_REQUESTS.md` §7.2 · §7.3 원본 복사. 탭 이름만 `tts_sentence`. 🔴 **git 에 올리지 않는다**(아래) |

### 🔴 `check` 는 로컬에만 있다

이 레포는 **공개 저장소**다. `check/SKILL.md` 에 비공개 시트 주소가 들어 있어 폴더째 `.gitignore` 했다(2026-09-26).
형제 앱은 `*.json` 만 뺀다. 새 PC·새 클론에서는 `FIX_REQUESTS.md` §7.1 대로 두 파일을 다시 복사한다.

## 훅 (`.claude/settings.json`)

| 훅 | 무엇 |
|---|---|
| `SessionStart` (compact) | 컴팩트 직후 `reload-docs` 를 먼저 부르게 하고, 요약이 떨어뜨리는 규칙 5개를 다시 보여 준다 |
| `PreToolUse` (Bash·PowerShell) | `adb`·`emulator` 명령 직전에 이 프로젝트의 AVD·포트·serial 과 지금 붙은 기기를 보여 준다(`hooks/emulator-guard.sh` · SnoreLess 승계) |

---

## 이식하지 않은 것

| 스킬 | 이유 |
|---|---|
| `dev-stack` | 서버·Supabase 가 없다 |
| `balance-sim` | 게임이 아니다 |
| `security-audit` | 서버·RLS·로그인이 없다. 공개 레포의 비밀값은 커밋 전 점검으로 막는다(`common/SECRET_HANDLING.md`) |
| `safety-zone` | 사도전 전용 부품 이름이 박혀 있다. 이 앱은 모든 화면 뿌리가 `components/ui.tsx` 의 `Screen` 이다 |
| `i18n-layout-audit` | 화면 언어가 ko 하나다. 언어를 더하면 가져온다 |
| `responsive-media` | 큰 그림·컷신이 없다. 그림을 넣으면 가져온다 |
| `ui-design-reference` | 전역(`~/.claude/skills`)에 이미 있다. 중복 금지 |
