// Supabase 공용 헬퍼 (anon 공개키만 사용 — 비밀키 불필요)
export const SB_URL = 'https://aklvacriteprocjmqndl.supabase.co';
export const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbHZhY3JpdGVwcm9jam1xbmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTEwMzAsImV4cCI6MjA5ODIyNzAzMH0.Xong7ScNZlGYLY1v--73Zk5TNeoXMilPCpP1ZTo9PY8';

const headers = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };

// 승인됨 + 미발행 중 가장 인기 있는 글 1개
export async function topCommunity() {
  const r = await fetch(`${SB_URL}/rest/v1/submissions?approved=eq.true&posted_at=is.null&select=*`, { headers });
  if (!r.ok) return null;
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  rows.sort((a, b) => (b.votes_a + b.votes_b) - (a.votes_a + a.votes_b));
  return rows[0];
}

// 발행 완료 표시(중복 발행 방지) — 보안 함수(RPC)로
export async function markPosted(id) {
  await fetch(`${SB_URL}/rest/v1/rpc/mark_posted`, {
    method: 'POST', headers, body: JSON.stringify({ sid: id }),
  });
}
