#!/usr/bin/env node
/**
 * Play 업로드 — 서비스 계정으로 Play Developer API 를 직접 부른다.
 *
 * 승계: `C:\project\basketball_story\scripts\play-upload.mjs` 를 그대로 복사했다(2026-09-26 · 읽어줘).
 * 아래 본문의 BUILD·§ 번호는 원본 레포 문서를 가리킨다. 이 레포의 절차는 `docs/BUILD.md`.
 *
 * 🔴 **왜 `eas submit` 이 아닌가**(2026-09-06).
 *    `common/PLAY_RELEASE_AUTOMATION.md` 가 정한 경로는 `eas submit` 이고 그 결정은 유효하다 —
 *    ⚠ **2026-09-24 근거 정정** — `eas.json` 이 없다는 말은 이제 거짓이다(OTA #227 이 만들었다).
 *    🔴 그러나 결론은 살아 있다 — AAB 는 **로컬 gradle** 로 굽는다(BUILD §5.5 의 주소 게이트가 거기 있다).
 *    `eas.json` 은 **OTA 채널 이름**만 들고 있다 · EAS Build 로 굽는 경로는 여전히 안 간다
 *    (로컬 gradle 빌드로 가기로 한 §11 결정과 결이 어긋난다).
 *    `eas submit` 이 하는 일은 **그 서비스 계정으로 Play API 를 부르는 것**이므로
 *    같은 자격으로 같은 API 를 부른다. 업로드 주체는 도구가 아니라 **서비스 계정**이다(그 문서 §0).
 *
 * 🚫 **키를 저장소에 두지 않는다** — 경로만 받는다(기본값은 `C:/project/secrets/…`, 저장소 밖).
 * 🚫 **비밀값을 찍지 않는다** — 계정 이메일과 키 길이까지만(reload-docs 사고 ④).
 *
 * 쓰는 법:
 *   node scripts/play-upload.mjs --aab basketball-vc1.aab --track internal --status draft
 *   node scripts/play-upload.mjs --promote 1 --track internal --status completed   # 이미 올라간 번들을 배포한다
 *
 * 🔴 **같은 번들을 두 번 올릴 수 없다**(Play 가 `versionCode` 중복을 거절한다 · 그 문서 §5.3).
 *    그래서 *올리기*와 *배포하기*가 갈린다 — 뒤엣것이 `--promote`.
 *
 * ⚠ `--status completed` 는 **테스터에게 바로 배포된다.** 기본값은 `draft` 다.
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const AUD = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const keyPath = arg('key', process.env.PLAY_SERVICE_ACCOUNT ?? 'C:/project/secrets/play-service-account.json');
const aabPath = arg('aab');
const promote = arg('promote');
const verify = process.argv.includes('--verify');
const track = arg('track', 'internal');
const status = arg('status', 'draft');
const notes = arg('notes', '');
const pkg = arg('package', JSON.parse(readFileSync('app.json', 'utf8')).expo.android.package);

if (!aabPath && !promote && !verify) {
  console.error('--aab <경로> · --promote <versionCode> · --verify 중 하나가 필요하다'); process.exit(1);
}
if (aabPath && promote) { console.error('--aab 와 --promote 는 함께 못 쓴다'); process.exit(1); }
if (!['draft', 'completed', 'inProgress', 'halted'].includes(status)) {
  console.error(`--status 는 draft|completed 다 (받은 값: ${status})`); process.exit(1);
}

const b64url = (b) => Buffer.from(b).toString('base64url');

/** 서비스 계정 JSON → 액세스 토큰. 라이브러리를 안 쓴다(의존성 0). */
async function token(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE, aud: AUD, iat: now, exp: now + 3600,
  }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).end()
    .sign(sa.private_key).toString('base64url');
  const res = await fetch(AUD, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`토큰 발급 실패 ${res.status}: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function call(tok, url, { method = 'GET', body, contentType } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${tok}`,
      ...(contentType ? { 'content-type': contentType } : {}),
    },
    body,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text.slice(0, 400) }; }
  if (!res.ok) {
    const msg = json?.error?.message ?? JSON.stringify(json).slice(0, 400);
    throw new Error(`${method} ${url.replace(/\?.*/, '')} → ${res.status}\n   ${msg}`);
  }
  return json;
}

const sa = JSON.parse(readFileSync(keyPath, 'utf8'));
const aab = aabPath ? readFileSync(aabPath) : null;

console.log(`패키지   ${pkg}`);
console.log(aab ? `번들     ${aabPath} (${aab.length.toLocaleString()} bytes)`
                : verify ? '번들     (읽기만 한다)'
                : `번들     이미 올라간 versionCode ${promote}`);
console.log(`계정     ${sa.client_email}`);
console.log(`트랙     ${track} · 상태 ${status}`);
console.log('');

const tok = await token(sa);
console.log('✓ 토큰 발급');

const edit = await call(tok, `${API}/applications/${pkg}/edits`, { method: 'POST' });
console.log(`✓ 편집 세션 ${edit.id}`);

// 🔴 --verify — 올린 뒤 «트랙에 실제로 무엇이 있나» 를 API 에 묻는다.
//    콘솔 요약 화면은 versionName 만 보여 줘서 vc1·vc2 를 못 가른다(2026-09-24 실측).
//    ⚠ 아무것도 바꾸지 않는다 — 편집 세션을 커밋하지 않고 지운다.
if (verify) {
  const got = await call(tok, `${API}/applications/${pkg}/edits/${edit.id}/tracks/${track}`);
  for (const r of got.releases ?? []) {
    console.log(`  트랙 ${track} · ${r.status} · versionCode ${(r.versionCodes ?? []).join(', ')}` + (r.name ? ` · 이름 ${r.name}` : ''));
  }
  if (!(got.releases ?? []).length) console.log(`  트랙 ${track} 에 출시가 없다`);
  await call(tok, `${API}/applications/${pkg}/edits/${edit.id}`, { method: 'DELETE' });
  console.log('✓ 편집 세션 폐기 (아무것도 안 바꿨다)');
  process.exit(0);
}

let versionCode = promote;
if (aab) {
  const bundle = await call(tok, `${UPLOAD}/applications/${pkg}/edits/${edit.id}/bundles?uploadType=media`, {
    method: 'POST', body: aab, contentType: 'application/octet-stream',
  });
  versionCode = bundle.versionCode;
  console.log(`✓ 업로드 — versionCode ${bundle.versionCode} · sha256 ${String(bundle.sha256).slice(0, 12)}…`);
}

const release = { versionCodes: [String(versionCode)], status };
if (notes) release.releaseNotes = [{ language: 'en-US', text: notes }];
await call(tok, `${API}/applications/${pkg}/edits/${edit.id}/tracks/${track}`, {
  method: 'PUT', contentType: 'application/json',
  body: JSON.stringify({ track, releases: [release] }),
});
console.log(`✓ 트랙 ${track} 에 배치`);

const done = await call(tok, `${API}/applications/${pkg}/edits/${edit.id}:commit`, { method: 'POST' });
console.log(`✓ 커밋 (edit ${done.id})`);
console.log('');
console.log(`끝. Play Console → 테스트 → 내부 테스트 에서 확인한다.`);
