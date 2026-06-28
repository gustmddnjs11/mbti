// 렌더된 카드를 인스타그램 그래프 API로 발행. 토큰 없으면 드라이런(건너뜀).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'manifest.json'), 'utf8'));

const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const REPO = process.env.GH_REPO || 'gustmddnjs11/mbti';
const BRANCH = process.env.GH_BRANCH || 'main';
const API = 'https://graph.facebook.com/v21.0';

if (!IG_USER_ID || !TOKEN) {
  console.log('⚠️  IG_USER_ID / IG_ACCESS_TOKEN 시크릿이 없어 발행을 건너뜁니다 (드라이런).');
  console.log('    이미지는 posts/ 에 저장·커밋됐어요. 토큰을 추가하면 자동 발행됩니다.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  if (publish.json.id) { posted++; console.log('✅ 발행 완료:', m.file, '→ media', publish.json.id); }
  else console.error('❌ 발행 실패:', JSON.stringify(publish.json));
}
console.log(`🎉 총 ${posted}/${manifest.length}개 발행`);
