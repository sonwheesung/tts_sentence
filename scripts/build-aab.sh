#!/usr/bin/env bash
# 내부 테스트 업로드용 AAB 를 굽는다. 절차 정본은 docs/BUILD.md.
# 승계: C:\project\Bookmind\scripts\build-aab.sh (OTA·광고 게이트는 이 앱에 없어서 뺐다 · 2026-09-26).
#
# 🔴 글로 적은 절차는 언젠가 빠진다. 그래서 게이트를 코드에 둔다.
#    값이 없으면 플러그인이 디버그 키로 조용히 떨어지고, 빌드는 성공한다(common/PLAY_FIRST_UPLOAD.md §3).
set -euo pipefail
cd "$(dirname "$0")/.."

KEY_ENV=/c/project/secrets/sentencetts-upload.env
EXPECTED_SHA1="40:14:99:0A:B5:4E:09:B2:1E:EC:B9:0B:E5:B8:D1:F3:5F:E4:49:95"   # 공개값 · docs/BUILD.md §2
ANDROID_SDK="C:\\Users\\user\\AppData\\Local\\Android\\Sdk"

# ── ① 선행 조건 ──
[ -f "$KEY_ENV" ] || { echo "🔴 업로드 키 env 가 없다: $KEY_ENV (docs/BUILD.md §2)"; exit 1; }
set -a; . "$KEY_ENV"; set +a
[ -f "$KEYSTORE_PATH" ] || { echo "🔴 키스토어가 없다: $KEYSTORE_PATH"; exit 1; }
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

VC=$(node -p "require('./app.json').expo.android.versionCode")
VN=$(node -p "require('./app.json').expo.version")
echo "▶ versionCode $VC · version $VN"

echo "▶ 검증 (typecheck · lint)"
npm run --silent typecheck
npm run --silent lint >/dev/null

# ── ② prebuild: 서명 값을 네이티브로 옮긴다 ──
echo "▶ prebuild"
SENTENCETTS_UPLOAD_STORE_FILE="$KEYSTORE_PATH" \
SENTENCETTS_UPLOAD_STORE_PASSWORD="$STORE_PASSWORD" \
SENTENCETTS_UPLOAD_KEY_ALIAS="$KEY_ALIAS" \
SENTENCETTS_UPLOAD_KEY_PASSWORD="$KEY_PASSWORD" \
  npx expo prebuild --platform android --no-install >/dev/null

# prebuild 는 매번 "ios" 스크립트를 끼워 넣는다. iOS 는 범위 밖이다(CLAUDE.md 결정 #1)
node -e "
  const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8'));
  if (p.scripts.ios) { delete p.scripts.ios; fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n'); console.log('  ↩ ios 스크립트를 되돌렸다'); }
"
# prebuild --clean 이 지울 수 있다. git 에 없는 파일이다(common/PLAY_FIRST_UPLOAD.md §5)
[ -f android/local.properties ] || echo "sdk.dir=$(cygpath -m "$ANDROID_HOME")" > android/local.properties

# ── ③ 🔴 게이트: 서명이 android/ 에 실제로 들어갔나 ──
grep -q '^SENTENCETTS_UPLOAD_STORE_FILE=' android/gradle.properties \
  || { echo "🔴 gradle.properties 에 업로드 키가 없다. 디버그 키로 서명된다"; exit 1; }
grep -q 'signingConfigs.upload' android/app/build.gradle \
  || { echo "🔴 release 가 upload 서명을 안 쓴다. 플러그인 앵커가 깨졌다"; exit 1; }
grep -q "versionCode $VC" android/app/build.gradle \
  || { echo "🔴 build.gradle 의 versionCode 가 app.json($VC)과 다르다"; exit 1; }

# ── ④ AAB ──
echo "▶ bundleRelease (몇 분 걸린다. 멈춘 것이 아니다)"
LOG=$(mktemp)
# 🚫 gradlew --stop 을 부르지 않는다. 데몬은 형제 프로젝트와 공용이다(common/DEV_ALLOCATION.md §0.1)
if ! "$PWD/android/gradlew.bat" -p "$PWD/android" app:bundleRelease -x lint -x test --no-daemon >"$LOG" 2>&1; then
  grep -A20 "What went wrong" "$LOG" || tail -40 "$LOG"; exit 1
fi
grep -q "BUILD SUCCESSFUL" "$LOG" || { tail -40 "$LOG"; exit 1; }

AAB=android/app/build/outputs/bundle/release/app-release.aab
[ -f "$AAB" ] || { echo "🔴 AAB 가 안 만들어졌다"; exit 1; }

# ── ⑤ 🔴 서명 주체를 잰다 ──
SHA1=$(keytool -printcert -jarfile "$AAB" 2>/dev/null | grep -m1 'SHA1:' | awk '{print $2}')
[ "$SHA1" = "$EXPECTED_SHA1" ] || { echo "🔴 서명 SHA1 이 업로드 키가 아니다: $SHA1"; exit 1; }
echo "✓ 업로드 키로 서명됨 ($SHA1)"

# ── ⑥ 권한 목록 (산출물에만 있는 병합 결과를 눈으로 본다) ──
echo "▶ 병합 매니페스트의 권한"
unzip -p "$AAB" base/manifest/AndroidManifest.xml | grep -aoE 'android\.permission\.[A-Z_]+' | sort -u | sed 's/^/  /'

# ── ⑦ 보관 (common/BUILD_ARTIFACTS.md §1) ──
OUT="/d/builds/tts_sentence/sentencetts-vc${VC}.aab"
mkdir -p /d/builds/tts_sentence
cp "$AAB" "$OUT"
ls -la "$OUT"
echo "✅ 끝. 업로드: npm run play:upload -- --aab $OUT --track internal --status draft"
