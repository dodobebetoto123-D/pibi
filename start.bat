@echo off
echo === AI 서비스 기획·개발 도우미 시작 ===
echo.

REM 백엔드 실행 (.env 자동 로드)
echo [1/2] 백엔드 서버 시작 (http://localhost:3000)...
start "AI Planner - Backend" cmd /k "cd /d %~dp0backend && set NODE_OPTIONS=--experimental-sqlite && npx tsx watch --env-file=.env src/index.ts"

timeout /t 3 /nobreak > nul

REM 프론트엔드 실행
echo [2/2] 프론트엔드 개발 서버 시작 (http://localhost:5173)...
start "AI Planner - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 잠시 후 브라우저에서 http://localhost:5173 을 열어보세요!
pause
