import { useState, useRef, useEffect } from 'react'
import {
  CheckCircle2, Terminal, Play, RefreshCw, Maximize2, ExternalLink,
  Code2, Sparkles, Smartphone, Monitor
} from 'lucide-react'
import type { VibeRequest } from '../types'

interface PocDevHubProps {
  htmlContent: string
  requests: VibeRequest[]
  onRegenerate: () => void
  onOpenWorkspace?: () => void
}

const DEFAULT_DEMO_APP = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>급식 대기열 관리 시스템</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen flex flex-col items-center justify-center p-4">
  <div class="w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🌱</span>
        <h1 class="text-base font-bold text-gray-900">성광중 급식 대기열</h1>
      </div>
      <span class="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-mono border border-blue-200">
        Live
      </span>
    </div>

    <!-- Status cards -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
        <span class="text-xs text-gray-600 block mb-1">현재 대기 인원</span>
        <span id="queueCount" class="text-3xl font-extrabold text-blue-600 font-mono">14</span>
        <span class="text-xs text-gray-500 ml-1">명</span>
      </div>
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
        <span class="text-xs text-gray-600 block mb-1">예상 대기 시간</span>
        <span id="waitTime" class="text-3xl font-extrabold text-blue-600 font-mono">11</span>
        <span class="text-xs text-gray-500 ml-1">분</span>
      </div>
    </div>

    <!-- QR Scan Area -->
    <div class="bg-white rounded-2xl p-6 border-2 border-dashed border-gray-300 text-center mb-5 hover:border-blue-600 transition-colors">
      <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
        📱
      </div>
      <p class="text-sm font-bold text-gray-900 mb-1">QR 코드를 스캔하세요</p>
      <p class="text-xs text-gray-600 mb-4">카메라에 QR을 대면 순번이 자동 발급됩니다</p>
      <button onclick="simulateScan()" class="px-5 min-h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors active:scale-95">
        시뮬레이션 QR 인식 테스트
      </button>
    </div>

    <!-- Direct input -->
    <div class="flex gap-2">
      <input id="studentId" placeholder="학번 직접 입력 (예: 20101)" class="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-600 font-mono" />
      <button onclick="registerStudent()" class="px-4 min-h-10 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl text-sm font-bold transition-colors">
        등록
      </button>
    </div>

    <!-- Live Toast -->
    <div id="toast" class="hidden mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 text-center animate-fade-in font-medium">
    </div>
  </div>

  <script>
    let count = 14;
    function updateDisplay() {
      document.getElementById('queueCount').innerText = count;
      document.getElementById('waitTime').innerText = Math.max(1, Math.ceil(count * 0.8));
    }
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 3000);
    }
    function simulateScan() {
      count++;
      updateDisplay();
      showToast('✓ QR 인식 완료! 대기번호 #' + count + '번으로 등록되었습니다.');
    }
    function registerStudent() {
      const input = document.getElementById('studentId');
      if (!input.value.trim()) return alert('학번을 입력해주세요.');
      count++;
      updateDisplay();
      showToast('✓ ' + input.value + ' 학생이 대기열에 추가되었습니다.');
      input.value = '';
    }
  </script>
</body>
</html>`

export default function PocDevHub({
  htmlContent,
  requests,
  onRegenerate,
  onOpenWorkspace,
}: PocDevHubProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'requests' | 'code'>('preview')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const rawHtml = htmlContent?.trim() ? htmlContent : DEFAULT_DEMO_APP

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(rawHtml)
    doc.close()
  }, [rawHtml, refreshKey])

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 overflow-hidden">
      {/* Top Banner (pibi desktop에서 만들어요) */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-blue-50 text-blue-700 flex items-center justify-center text-base border border-blue-200">
            🌱
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              pibi 바이브 코딩 허브
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                실시간 동작 중
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              우측 채팅으로 "버튼 색 바꿔줘", "기능 추가해줘"라고 말하면 실시간으로 코드가 갱신됩니다.
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-0.5 rounded-[12px] border border-gray-200 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'preview' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              미리보기
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'requests' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>봄비의 요청</span>
              <span className="text-[10px] bg-gray-200 px-1.5 py-0.2 rounded-full font-mono">
                {requests.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'code' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              HTML 코드
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab 1: Live Interactive Preview */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Browser Address Bar */}
            <div className="h-11 px-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="bg-white px-3 py-1 rounded-full font-mono text-[11px] text-gray-600 border border-gray-200">
                  http://localhost:5173/preview/app.html
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 p-0.5 rounded-[8px] border border-gray-200">
                  <button
                    onClick={() => setDevice('desktop')}
                    className={`p-1.5 rounded-[6px] ${device === 'desktop' ? 'bg-white text-gray-900' : 'text-gray-500'}`}
                    title="데스크톱"
                  >
                    <Monitor size={12} />
                  </button>
                  <button
                    onClick={() => setDevice('mobile')}
                    className={`p-1.5 rounded-[6px] ${device === 'mobile' ? 'bg-white text-gray-900' : 'text-gray-500'}`}
                    title="모바일"
                  >
                    <Smartphone size={12} />
                  </button>
                </div>

                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="p-2 hover:bg-gray-100 rounded-[8px] text-gray-600 hover:text-gray-900 transition-colors"
                  title="새로고침"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Iframe */}
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto">
              <iframe
                key={refreshKey}
                ref={iframeRef}
                sandbox="allow-scripts allow-forms allow-modals"
                className={`bg-white rounded-[16px] border border-gray-200 transition-all ${
                  device === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
                }`}
                title="Live Vibe App Preview"
              />
            </div>
          </div>
        )}

        {/* Tab 2: 봄비의 요청 History */}
        {activeTab === 'requests' && (
          <div className="flex-1 overflow-y-auto p-6 bg-white scrollbar-thin">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  봄비의 요청 히스토리 (바이브 코딩 로그)
                </h4>
                <span className="text-xs text-gray-500 font-mono">최근 요청 목록</span>
              </div>

              {requests.length === 0 ? (
                <div className="p-8 rounded-[16px] bg-white border border-gray-200 text-center text-gray-600">
                  <p className="text-sm font-semibold mb-1">아직 요청한 프롬프트가 없어요</p>
                  <p className="text-xs text-gray-500">
                    우측 채팅창에 "이 버튼 파란색으로 바꿔줘"처럼 편하게 요청해보세요!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req, i) => (
                    <div
                      key={req.id || i}
                      className="bg-white rounded-[16px] p-4 border border-gray-200 flex items-start gap-3 hover:border-gray-300 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-700">사용자 요청</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(req.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {req.prompt}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            빌드 완료 ✓
                          </span>
                          <span className="text-[10px] text-blue-700">
                            미리보기에 즉시 반영됨
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: HTML Code Viewer */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col bg-white p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <span className="font-mono">단일 HTML 번들 (CDN 기반 빌드 불필요)</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawHtml)
                  alert('코드가 클립보드에 복사되었습니다!')
                }}
                className="min-h-9 px-4 bg-blue-600 hover:bg-blue-700 rounded-[12px] text-white font-medium transition-colors"
              >
                코드 복사
              </button>
            </div>
            <pre className="flex-1 overflow-auto bg-gray-50 p-4 rounded-[16px] border border-gray-200 font-mono text-xs text-gray-800 scrollbar-thin">
              {rawHtml}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
