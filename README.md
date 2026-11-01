# AI 서비스 기획·개발 도우미

> pibi 스타일 AI 플래닝 플랫폼 MVP

## 빠른 시작 (로컬 개발)

백엔드 서버가 따로 없다. 프론트엔드가 Firestore에 직접 붙고, AI는 Cloudflare Worker를 통한다.

### 1. Firebase 설정
1. Firebase Console에서 프로젝트를 만들고 웹 앱을 추가한다.
2. Authentication에서 이메일/비밀번호 제공업체를 켜고, 승인된 도메인에 `localhost`를 추가한다.
3. Firestore Database를 만든다 (프로덕션 모드, `asia-northeast3`).
4. `firebase deploy --only firestore:rules`로 보안 규칙 배포.

### 2. 환경 변수
`frontend/.env.example`을 `frontend/.env.local`로 복사하고 입력:
- `VITE_FIREBASE_*` — Firebase 웹 앱 설정값
- `VITE_WORKER_URL` — 배포된 Worker 주소 (로컬 테스트는 `npx wrangler dev`)

### 3. AI Worker (로컬 테스트)
```bash
cd worker
npm install
# .dev.vars.example을 .dev.vars로 복사하고 GROQ_API_KEY 입력
npx wrangler dev   # http://localhost:8787
```

### 4. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## 기능

| 화면 | 기능 |
|------|------|
| 대시보드 | 프로젝트 카드 목록, 필터(전체/예정/진행중/종료), 신규 생성 |
| 브레인스토밍 | AI와 아이디어 탐색 → JSON 산출물 자동 저장 |
| 기획서 | 브레인스토밍 결과 기반 Markdown 기획서 생성 |
| 화면 설계 | UI 구조 설계 → 화면 목록 JSON 생성 |
| 개발 | HTML 단일파일 생성 → iframe 즉시 미리보기 |
| 칸반 보드 | 드래그&드롭 스티커 노트 |

## 배포 (전부 무료, 카드 불필요)

구조: 프론트엔드(Firebase Hosting) + DB(Firestore) + AI(Cloudflare Worker). 백엔드 서버가 따로 필요 없다.

### 1. Firestore 만들기 (최초 1회)
1. [Firebase Console](https://console.firebase.google.com) → pibi-5fb39 → Firestore Database
2. "데이터베이스 만들기" → **프로덕션 모드** → 리전 `asia-northeast3 (서울)`
3. 규칙 배포:
```bash
firebase deploy --only firestore:rules
```

### 2. AI Worker 배포 (Cloudflare)
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GROQ_API_KEY   # Groq 키 입력
npx wrangler deploy
```
배포 후 출력되는 `https://pibi-ai.<계정>.workers.dev` 주소를 복사.

### 3. 프론트엔드 배포
```bash
# frontend/.env.local에 추가:
# VITE_WORKER_URL=https://pibi-ai.<계정>.workers.dev
firebase deploy --only hosting
```
Firebase Console > Authentication > 승인된 도메인에 배포 도메인(`pibi-5fb39.web.app` 등) 추가 필요.

> 무료 한도: Firestore(Spark) 읽기 5만/일·쓰기 2만/일·저장 1GB, Worker 10만 요청/일. 개인 사용에는 충분.

## 기술 스택

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + @dnd-kit (Firebase Hosting)
- **DB**: Cloud Firestore (Spark 플랜, 보안 규칙으로 본인 데이터만 접근)
- **AI**: Groq API — Cloudflare Worker 프록시 경유 (Firebase ID 토큰 검증, 무료 10만 요청/일)
- **Auth**: Firebase Authentication (이메일/비밀번호)
