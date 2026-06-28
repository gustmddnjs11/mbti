// 매일 토론 카드 2개를 1080x1080 PNG로 렌더링 (Puppeteer로 card.html 그림)
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(POSTS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const topics = JSON.parse(fs.readFileSync(path.join(__dirname, 'topics.json'), 'utf8'));
const HANDLE = process.env.IG_HANDLE || '@mbti_nonjaeng';
const N = topics.length;
const day = Math.floor(Date.now() / 86400000);

// 하루 단위로 결정되는 셔플 → 같은 날 중복 없이, 날마다 다른 2개
function dayPicks(n, seed, k) {
  const a = [...Array(n).keys()];
  let s = (seed * 9301 + 49297) % 233280;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
const picks = dayPicks(N, day, 2);
const stamp = new Date().toISOString().slice(0, 10);

const html = fs.readFileSync(path.join(__dirname, 'card.html'), 'utf8');
const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

const manifest = [];
let pos = 0;
for (const idx of picks) {
  const t = topics[idx];
  pos++;
  const palette = (day + pos) % 5; // 매일·카드마다 배경 변주 (알고리즘 비독창성 회피)
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const dataUrl = await page.evaluate((topic) => {
    drawCard(topic);
    return document.getElementById('cv').toDataURL('image/png');
  }, { ...t, handle: HANDLE, palette });
  const file = `${stamp}-${pos}.png`;
  fs.writeFileSync(path.join(POSTS, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  manifest.push({
    file, caption: caption(t, day + pos),
    a: t.a.lab.replace(/<br>/g, ' '), b: t.b.lab.replace(/<br>/g, ' '),
  });
  await page.close();
  console.log('✅ rendered', file, '—', t.q);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('📦 manifest:', manifest.map((m) => m.file).join(', '));

function caption(t, i) {
  const openers = [
    '👉 당신의 선택은? 이유까지 댓글로 🔥',
    '🅰️냐 🅱️냐… 댓글에서 한판 붙자 ⚔️',
    '당신은 어느 쪽? 댓글로 토론 ㄱㄱ 🗯️',
    '이건 진짜 갈린다 😳 댓글로 투표!',
    '정답 없는 논쟁! 너의 선택은 👇',
  ];
  const tails = [
    '친구 소환해서 같이 토론 👀',
    '의견 다른 친구 태그 ㄱㄱ 🏷️',
    '댓글에 A/B + 이유 남겨줘!',
  ];
  const base = ['#MBTI', '#엠비티아이', '#mbti토론', '#성격유형', '#논쟁의민족', '#밸런스게임', '#mbti밸런스', '#토론주제'];
  const byTheme = {
    연애: ['#연애', '#연애토론', '#커플', '#연애상담'],
    이별: ['#이별', '#이별후', '#연애', '#재회'],
    딜레마: ['#딜레마', '#도덕적딜레마', '#가치관'],
    엉뚱: ['#쓸데없는논쟁', '#엉뚱한질문', '#밸런스게임'],
    공포: ['#공포', '#생존', '#좀비'],
    만약에: ['#만약에', '#가정', '#상상'],
    가치관: ['#가치관', '#일상논쟁'],
    일상: ['#일상', '#mbti일상'],
  };
  const tags = base.concat(byTheme[t.theme] || []);
  const op = openers[i % openers.length];
  const tl = tails[i % tails.length];
  return `${t.q}\n\nⒶ ${t.a.lab.replace(/<br>/g, ' ')}\nⒷ ${t.b.lab.replace(/<br>/g, ' ')}\n\n${op}\n${tl}\n.\n.\n${tags.join(' ')}`;
}
