# AI 서비스 기획·개발 도우미

> pibi 스타일 AI 플래닝 플랫폼 MVP

## 빠른 시작

### Firebase 로그인 설정

1. Firebase Console에서 프로젝트를 만들고 웹 앱을 추가합니다.
2. Authentication에서 이메일/비밀번호와 Google 제공업체를 켜고, 승인된 도메인에 `localhost`와 `127.0.0.1`을 추가합니다.
3. `frontend/.env.example`을 `frontend/.env.local`로 복사하고 Firebase 웹 앱의 API 키, Auth 도메인, 프로젝트 ID, 앱 ID를 입력합니다. 웹 설정 값은 클라이언트용이며 관리자 비밀 키를 넣지 마세요.
4. Firebase Console의 프로젝트 설정 > 서비스 계정에서 Admin SDK 키를 발급해 저장소 밖의 안전한 경로에 보관합니다.
5. `backend/.env.example`을 `backend/.env`에 반영하고 `FIREBASE_PROJECT_ID`와 `GOOGLE_APPLICATION_CREDENTIALS`를 설정합니다. 서비스 계정 JSON은 프런트엔드나 저장소에 넣지 마세요.
6. 두 서버를 다시 시작합니다. 로그인 화면에서 이메일 회원가입·로그인·비밀번호 재설정과 Google 로그인을 사용할 수 있습니다.

기존 SQLite 프로젝트는 첫 Firebase 계정이 로그인할 때 그 계정에 귀속됩니다. 이후 프로젝트와 산출물은 계정별로 분리됩니다.

### 1. Groq API 키 설정

```
backend/.env 파일에서:
GROQ_API_KEY=sk-... (https://console.groq.com 에서 무료 발급)
```

### 2. 실행

백엔드는 `127.0.0.1`에만 바인딩됩니다. 샘플 프로젝트가 필요하면 프론트엔드 실행 전에 `VITE_SEED_DEMO=true`를 설정하세요. 기본값은 빈 프로젝트 목록입니다.

```bash
# 방법 A: start.bat 더블클릭 (Windows)

# 방법 B: 터미널에서 직접
# 백엔드
cd backend
set NODE_OPTIONS=--experimental-sqlite
npx tsx watch src/index.ts

# 프론트엔드 (새 터미널)
cd frontend
npm run dev
```

### 3. 접속
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000/api

## 기능

| 화면 | 기능 |
|------|------|
| 대시보드 | 프로젝트 카드 목록, 필터(전체/예정/진행중/종료), 신규 생성 |
| 브레인스토밍 | AI와 아이디어 탐색 → JSON 산출물 자동 저장 |
| 기획서 | 브레인스토밍 결과 기반 Markdown 기획서 생성 |
| 화면 설계 | UI 구조 설계 → 화면 목록 JSON 생성 |
| 개발 | HTML 단일파일 생성 → iframe 즉시 미리보기 |
| 칸반 보드 | 드래그&드롭 스티커 노트 |

## 배포

- **프론트엔드**: `firebase deploy` (Firebase Hosting, `firebase.json`에 설정됨)
- **백엔드**: Railway/Render 같은 Node 호스팅에 올리세요.
  1. `backend/.env`에 `GROQ_API_KEY`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`(서비스 계정 JSON 경로)를 설정
  2. 시작 명령: `npm install && npx tsc && node dist/index.js` (tsconfig outDir 설정 후)
  3. 프론트엔드 `.env`의 API 주소(`src/api/client.ts`의 `BASE`)를 백엔드 공개 URL로 변경
  4. 백엔드 `src/index.ts`의 CORS origin에 배포된 프론트엔드 도메인 추가

> 지금 백엔드는 `127.0.0.1`에만 바인딩되어 있어 로컬 전용입니다. 배포 시 `hostname` 설정을 확인하세요.

## 기술 스택

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + @dnd-kit
- **Backend**: Hono + Node.js built-in SQLite (`node:sqlite`)
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Auth**: Firebase Authentication (이메일/비밀번호) + Firebase Admin SDK ID 토큰 검증
