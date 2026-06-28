-- 논쟁의 민족 · 커뮤니티 백엔드 스키마 (Supabase / Postgres)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 RUN 하세요.

-- 1) 제출된 토론 주제 테이블
create table if not exists submissions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  q           text not null,                 -- 질문
  a_em        text not null default '🅰️',
  a_lab       text not null,                 -- 선택지 A
  b_em        text not null default '🅱️',
  b_lab       text not null,                 -- 선택지 B
  nick        text not null default '익명',
  cat         text default '커뮤니티',
  votes_a     int  not null default 0,
  votes_b     int  not null default 0,
  reports     int  not null default 0,       -- 신고 누적
  approved    boolean not null default false,-- 운영자 승인(자동 포스팅 대상)
  posted_at   timestamptz                    -- 인스타 발행 시각(중복 방지)
);

create index if not exists submissions_hot
  on submissions ((votes_a + votes_b) desc, created_at desc);

-- 2) 보안(RLS) 켜기
alter table submissions enable row level security;

-- 읽기: 누구나(신고 5회 이상 누적 글은 자동 숨김)
create policy "public read" on submissions
  for select using (reports < 5);

-- 제출: 누구나 가능하되 길이 제한으로 1차 스팸 방지
create policy "public insert" on submissions
  for insert with check (
    char_length(q)     between 4 and 80 and
    char_length(a_lab) between 1 and 20 and
    char_length(b_lab) between 1 and 20
  );

-- 3) 투표는 함수(RPC)로만 — 임의 수정 차단
create or replace function vote(sid bigint, side text)
returns void language sql security definer set search_path = public as $$
  update submissions
     set votes_a = votes_a + (case when side = 'a' then 1 else 0 end),
         votes_b = votes_b + (case when side = 'b' then 1 else 0 end)
   where id = sid;
$$;
grant execute on function vote(bigint, text) to anon;

-- 4) 신고도 함수로
create or replace function report(sid bigint)
returns void language sql security definer set search_path = public as $$
  update submissions set reports = reports + 1 where id = sid;
$$;
grant execute on function report(bigint) to anon;
