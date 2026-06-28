// IG 장기 토큰 자동 갱신 → GitHub 시크릿 업데이트 (GH_PAT 있을 때만 동작)
// GH_PAT 없으면 안전하게 건너뜀(이 경우 ~60일마다 수동 재발급 필요).
import { execSync } from 'node:child_process';

const TOKEN = process.env.IG_ACCESS_TOKEN;
const PAT = process.env.GH_PAT;
const REPO = process.env.GH_REPO || 'gustmddnjs11/mbti';

if (!TOKEN) { console.log('토큰 없음 — 갱신 건너뜀'); process.exit(0); }
if (!PAT) {
  console.log('ℹ️  GH_PAT 시크릿이 없어 토큰 자동 갱신을 건너뜁니다.');
  console.log('   (GH_PAT를 추가하면 토큰이 영구 자동 갱신돼요. SETUP.md 참고)');
  process.exit(0);
}

const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
const j = await r.json().catch(() => ({}));
if (!j.access_token) {
  // 토큰이 24시간 미만이거나 만료 등 → 다음 실행 때 재시도
  console.log('🔁 이번엔 갱신 안 함:', JSON.stringify(j));
  process.exit(0);
}

try {
  execSync(`gh secret set IG_ACCESS_TOKEN -R ${REPO}`, {
    input: j.access_token,
    env: { ...process.env, GH_TOKEN: PAT },
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const days = Math.round((j.expires_in || 0) / 86400);
  console.log(`🔄 토큰 갱신 완료 (만료까지 약 ${days}일). 시크릿 업데이트됨.`);
} catch (e) {
  console.log('⚠️ 시크릿 업데이트 실패(GH_PAT 권한 확인):', e.message);
}
