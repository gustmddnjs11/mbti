// 렌더된 카드를 인스타그램 그래프 API로 발행. 토큰 없으면 드라이런(건너뜀).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'manifest.json'), 'utf8'));

let IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const REPO = process.env.GH_REPO || 'gustmddnjs11/mbti';
const BRANCH = process.env.GH_BRANCH || 'main';
// Instagram 로그인 방식(graph.instagram.com). IG_USER_ID는 토큰에서 자동 조회.
const API = 'https://graph.instagram.com/v21.0';

if (!TOKEN) {
  console.log('⚠️  IG_ACCESS_TOKEN 시크릿이 없어 발행을 건너뜁니다 (드라이런).');
  console.log('    이미지는 posts/ 에 저장·커밋됐어요. 토큰을 추가하면 자동 발행됩니다.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 토큰만 있으면 계정 ID 자동 조회 (사용자가 ID를 직접 찾을 필요 없음)
if (!IG_USER_ID) {
  const r = await fetch(`${API}/me?fields=user_id,username&access_token=${TOKEN}`);
  const j = await r.json().catch(() => ({}));
  IG_USER_ID = j.user_id || j.id;
  if (!IG_USER_ID) { console.error('❌ 토큰에서 계정 ID를 못 가져왔어요:', JSON.stringify(j)); process.exit(1); }
  console.log('👤 인스타 계정:', j.username || '(이름미상)', '/ ID', IG_USER_ID);
}

async function postForm(url, params) {
  const r = await fetch(url, { method: 'POST', body: new URLSearchParams(params) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, json: j };
}

async function waitRaw(url) {
  for (let i = 0; i < 12; i++) {
    try { const r = await fetch(url, { method: 'HEAD' }); if (r.ok) return true; } catch {}
    await sleep(4000);
  }
  return false;
}

let posted = 0;
for (const m of manifest) {
  const imageUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/posts/${m.file}`;
  console.log('🖼  image:', imageUrl);
  await waitRaw(imageUrl);

  const create = await postForm(`${API}/${IG_USER_ID}/media`, {
    image_url: imageUrl, caption: m.caption, access_token: TOKEN,
  });
  if (!create.json.id) { console.error('❌ 컨테이너 생성 실패:', JSON.stringify(create.json)); continue; }

  await sleep(3000);
  const publish = await postForm(`${API}/${IG_USER_ID}/media_publish`, {
    creation_id: create.json.id, access_token: TOKEN,
  });
  if (!publish.json.id) { console.error('❌ 발행 실패:', JSON.stringify(publish.json)); continue; }
  posted++; console.log('✅ 발행 완료:', m.file, '→ media', publish.json.id);

  // 첫 댓글로 투표 유도 (권한 없으면 무시)
  if (m.a && m.b) {
    const vote = `🗳️ 댓글 투표 ㄱㄱ!\nⒶ ${m.a}\nⒷ ${m.b}\n\n→ 댓글에 A 또는 B + 이유! 가장 많은 쪽이 오늘의 승자 🏆`;
    const c = await postForm(`${API}/${publish.json.id}/comments`, { message: vote, access_token: TOKEN });
    if (c.json.id) console.log('   💬 투표 댓글 작성 완료');
    else console.log('   ⚠️ 투표 댓글 실패(권한 필요할 수 있음):', JSON.stringify(c.json));
  }
}
console.log(`🎉 총 ${posted}/${manifest.length}개 발행`);
