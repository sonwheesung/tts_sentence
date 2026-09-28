#!/usr/bin/env node
// OTA 발행 래퍼(docs/BUILD.md §5 · common/OTA_RULES.md §7). 손으로 eas update 를 치지 않는다.
// 승계: C:/project/progamer_story/scripts/ota.mjs (2026-09-28). 저장 모양 가드 대신 DB 마이그레이션 가드를 둔다.
// 🔴 사용자가 OTA 를 지시했을 때만 부른다. 순서: 가드 → 타입체크 → 린트 → 발행.
// 사용: npm run ota -- "YYMMDD :: 요약"
import { execSync, spawnSync } from 'node:child_process';

const msg = process.argv.slice(2).join(' ').trim();
if (!/^\d{6} :: .+/.test(msg)) {
  console.error('🔴 메시지가 필요하다: npm run ota -- "YYMMDD :: 요약"');
  process.exit(1);
}

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// ① 버전 범프 커밋이 HEAD 에 있으면 발행하지 않는다(OTA 매니페스트가 앱 버전을 덮어써 구 기기가 새 버전인 척한다 · 공용 §7)
const headFiles = sh('git show --name-only --format= HEAD').split('\n');
if (headFiles.includes('app.json') && /"version"|versionCode|runtimeVersion/.test(sh('git show HEAD -- app.json'))) {
  console.error('🔴 HEAD 가 app.json 버전을 바꾼 커밋이다. 버전 범프는 AAB 전용이다(공용 §7). 다른 커밋을 얹은 뒤 발행한다.');
  process.exit(1);
}
// ② 커밋 안 된 변경이 있으면 발행하지 않는다(발행한 번들이 어느 커밋인지 모르게 된다)
if (sh('git status --porcelain')) {
  console.error('🔴 커밋 안 된 변경이 있다. 커밋 · 푸시한 뒤 발행한다.');
  process.exit(1);
}
// ③ 네이티브(Kotlin 모듈 · 플러그인)가 마지막 AAB 뒤로 바뀌었으면 발행하지 않는다(공용 §1 · runtimeVersion 을 올리고 AAB 가 먼저다)
const lastAab = sh('git log -1 --format=%H -- app.json');
const nativeChanged = sh(`git diff --name-only ${lastAab} HEAD -- modules plugins`);
if (nativeChanged) {
  console.error('🔴 마지막 AAB 뒤로 네이티브가 바뀌었다. OTA 가 아니라 AAB 다(공용 §1):\n' + nativeChanged);
  process.exit(1);
}
// ④ DB 마이그레이션이 늘었으면 멈추고 사람이 본다(추가만 하는 규약이지만 되돌릴 수 없다 · docs/BUILD.md §5)
const migrationDiff = sh(`git diff -U0 ${lastAab} HEAD -- db/index.ts`);
if (/^\+\s*`/m.test(migrationDiff)) {
  console.error('🔴 마지막 AAB 뒤로 db/index.ts 에 마이그레이션이 더해진 것 같다. 되돌릴 수 없는 변경이라 AAB 로 낸다(docs/BUILD.md §5).');
  process.exit(1);
}

for (const [name, cmd] of [
  ['타입체크', 'npx tsc --noEmit'],
  ['린트', 'npx expo lint'],
]) {
  console.log(`→ ${name}`);
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`🔴 ${name} 실패. 발행하지 않는다`);
    process.exit(1);
  }
}

console.log(`→ 발행: channel production · "${msg}"`);
// shell: true 라 메시지를 따옴표로 감싼다(공백 든 메시지가 인자로 쪼개졌다 · 프로게이머 스토리 2026-09-26)
const r = spawnSync(
  'npx',
  ['eas-cli', 'update', '-p', 'android', '--channel', 'production', '-m', JSON.stringify(msg), '--non-interactive'],
  { shell: true, stdio: 'inherit' },
);
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('\n게시됐다(전달이 아니다). 확인: npx eas-cli update:list --branch production --limit 3 · 폰에서 콜드 스타트 2회 후 설정 화면 마커');
