# 인스타 자동 포스팅 — 켜는 법

매일 08:00(한국시간)에 토론 카드 2개를 자동으로 만들어 인스타그램에 올립니다.
지금은 **이미지 생성·커밋까지는 작동**하고, 아래 토큰을 넣으면 **실제 발행**이 켜집니다.

## 작동 구조
```
매일 08시 → GitHub Actions
  → 토론 주제 2개 선택 → 1080×1080 카드 렌더(automation/render.mjs)
  → posts/ 에 이미지 커밋·푸시 (공개 raw 주소 생성)
  → 인스타 그래프 API로 발행 (automation/post.mjs)
```

## 발행을 켜려면 (한 번만 세팅)

### 1) 인스타를 프로페셔널 계정으로
인스타 앱 → 설정 → 계정 → **프로페셔널(비즈니스/크리에이터) 계정으로 전환** → 페이스북 페이지 연결.

### 2) Meta 개발자 앱 + 토큰 발급
1. https://developers.facebook.com → 앱 만들기(비즈니스 유형)
2. 제품에 **Instagram Graph API** 추가
3. **그래프 API 탐색기**에서 권한 `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` 선택 후 토큰 발급
4. **장기 토큰(60일)**으로 교환 (안내: developers.facebook.com/docs/instagram-api → Getting Started)
5. 내 **IG 비즈니스 계정 ID** 확인 (`me/accounts` → 페이지 → `instagram_business_account`)

> 이 단계는 같이 진행하면 됩니다. 막히면 캡처 보내주세요.

### 3) GitHub 비밀(secret) 등록
레포 → Settings → Secrets and variables → Actions → New secret 로 2개 추가:
- `IG_USER_ID` : 인스타 비즈니스 계정 ID
- `IG_ACCESS_TOKEN` : 장기 액세스 토큰

(선택) Variables 탭에 `IG_HANDLE` = `@당신의핸들` 추가하면 카드에 핸들이 찍힙니다.

또는 터미널에서:
```
gh secret set IG_USER_ID -b "1784xxxxxxxxxxx"
gh secret set IG_ACCESS_TOKEN -b "EAAG...토큰..."
gh variable set IG_HANDLE -b "@관점토크"
```

## 테스트 (지금 바로 가능)
레포 → Actions → "매일 인스타 자동 포스팅" → **Run workflow** 버튼.
토큰이 없어도 `posts/` 에 이미지가 생성·커밋됩니다(드라이런). 토큰을 넣으면 실제 발행까지 됩니다.

또는 터미널: `gh workflow run daily-post.yml`

## (선택) 토큰 영구 자동 갱신 — GH_PAT 등록
장기 토큰은 ~60일이면 만료돼요. 아래를 한 번 해두면 **매일 자동 갱신되어 영원히 안 만져도 됩니다.**
1. GitHub → 우측 상단 프로필 → **Settings**(계정 설정) → 맨 아래 **Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. Repository access: **Only select repositories → `mbti`** 선택
4. Permissions → Repository permissions → **Secrets: Read and write** 체크
5. 생성된 토큰 복사 → 레포 **Settings → Secrets and variables → Actions** → New secret
   - Name: `GH_PAT` / Secret: (복사한 토큰)
- 안 해도 자동 포스팅은 됩니다. 다만 ~60일 뒤 토큰을 수동 재발급해야 해요.

## 참고 / 한계
- 인스타 그래프 API는 하루 25개까지 발행 가능 (우리는 2개라 여유).
- 투표 댓글 작성은 `instagram_business_manage_comments` 권한이 필요할 수 있어요(없으면 발행은 되고 댓글만 건너뜀).
- 캐러셀/스토리/릴스는 v1 미지원(단일 이미지 게시만). 필요 시 확장.
