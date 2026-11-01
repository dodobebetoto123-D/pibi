import { useState } from 'react'
import { Play, Wrench, RotateCcw, Smartphone, Monitor } from 'lucide-react'

interface ScreenDesignPreviewProps {
  htmlContent?: string
  onBuild: () => void
  onFix: () => void
  building: boolean
}

export default function ScreenDesignPreview({
  htmlContent,
  onBuild,
  onFix,
  building,
}: ScreenDesignPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [simulatedTime] = useState('21:38')
  const [queueCount, setQueueCount] = useState(12)
  const [simulatedStatus, setSimulatedStatus] = useState<'idle' | 'scanning' | 'success'>('idle')

  const handleSimulateScan = () => {
    setSimulatedStatus('scanning')
    setTimeout(() => {
      setSimulatedStatus('success')
      setQueueCount((c) => c + 1)
      setTimeout(() => setSimulatedStatus('idle'), 2500)
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-0.5 rounded-[12px] border border-gray-200">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded transition-colors ${
                device === 'desktop' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="데스크톱 뷰"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded transition-colors ${
                device === 'mobile' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="모바일 뷰"
            >
              <Smartphone size={14} />
            </button>
          </div>
          <span className="text-xs text-gray-600">화면 프로토타입 인터랙션</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBuild}
            disabled={building}
            className="min-h-10 flex items-center gap-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Play size={12} />
            <span>PoC로 이동</span>
          </button>
          <button
            onClick={onFix}
            disabled={building}
            className="min-h-10 flex items-center gap-1.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-[12px] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Wrench size={12} />
            <span>{building ? '점검 중...' : 'AI 점검'}</span>
          </button>
          <button
            onClick={() => {
              setQueueCount(12)
              setSimulatedStatus('idle')
            }}
            className="min-h-10 flex items-center gap-1 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-[12px] text-xs transition-colors"
          >
            <RotateCcw size={12} />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* Main Mockup Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gray-50">
        <div
          className={`transition-all duration-300 rounded-[16px] border border-gray-200 overflow-hidden flex flex-col bg-white ${
            device === 'mobile' ? 'w-[380px] h-[640px]' : 'w-full max-w-4xl h-[540px]'
          }`}
        >
          {/* Mockup Header (성광중학교 학생식당) */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🏫</span>
              <span className="font-bold text-sm tracking-wide text-gray-900">성광중학교 학생식당</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="font-mono text-gray-500">현재 시각 {simulatedTime}</span>
              <button className="px-3 min-h-9 bg-gray-100 hover:bg-gray-200 rounded-[8px] text-xs font-medium transition-colors">
                배식대
              </button>
              <button className="px-3 min-h-9 bg-gray-100 hover:bg-gray-200 rounded-[8px] text-xs font-medium transition-colors">
                관리자
              </button>
            </div>
          </div>

          {/* Mockup Body Content */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white">
            {/* Live Queue Banner */}
            <div className="mb-6 flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-[12px] border border-gray-200">
              <div className="text-xs text-gray-600">
                현재 대기자 <span className="text-gray-900 font-bold font-mono text-sm ml-1">{queueCount}명</span>
              </div>
              <div className="w-px h-3 bg-gray-300" />
              <div className="text-xs text-gray-600">
                예상 대기시간 <span className="text-blue-600 font-bold font-mono text-sm ml-1">약 {Math.ceil(queueCount * 0.8)}분</span>
              </div>
            </div>

            {/* Instruction Title */}
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
              QR을 화면에 대주세요
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              입구 QR 스캔 후 대기열에 바로 등록됩니다
            </p>

            {/* Camera View Area Mockup */}
            <div
              onClick={handleSimulateScan}
              className={`w-72 h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${
                simulatedStatus === 'scanning'
                  ? 'border-blue-600 bg-blue-50'
                  : simulatedStatus === 'success'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-600 hover:bg-blue-50'
              }`}
            >
              {simulatedStatus === 'idle' && (
                <>
                  <div className="w-12 h-12 rounded-[12px] bg-gray-100 flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
                    📷
                  </div>
                  <span className="text-xs text-gray-700 font-medium">카메라 권한을 확인해 주세요</span>
                  <span className="text-[10px] text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    (클릭하여 QR 스캔 시뮬레이션 테스트)
                  </span>
                </>
              )}

              {simulatedStatus === 'scanning' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-700 font-semibold">QR 코드 인식 중...</span>
                </div>
              )}

              {simulatedStatus === 'success' && (
                <div className="flex flex-col items-center gap-1.5 animate-bounce">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">
                    ✓
                  </div>
                  <span className="text-xs text-emerald-800 font-bold">인식 성공! 대기열 등록 완료</span>
                  <span className="text-[10px] text-emerald-700">대기 번호 #{queueCount}번</span>
                </div>
              )}
            </div>

            {/* Fallback button */}
            <div className="mt-6 w-full max-w-xs">
              <button
                onClick={() => {
                  const num = prompt('학번을 입력해주세요 (예: 20415):')
                  if (num) {
                    setQueueCount((c) => c + 1)
                    alert(`학번 ${num} 학생이 대기열에 등록되었습니다.`)
                  }
                }}
                className="w-full min-h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-sm font-bold transition-colors active:scale-98"
              >
                QR 없는 학생 · 학번 직접 입력
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
