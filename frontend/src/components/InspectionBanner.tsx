import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import type { StepInspection } from '../types'

interface InspectionBannerProps {
  inspection: StepInspection | null
  loading: boolean
  onInspect: () => void
}

export default function InspectionBanner({ inspection, loading, onInspect }: InspectionBannerProps) {
  if (!inspection && !loading) {
    return (
      <div className="bg-amber-50/70 border-b border-amber-200/60 px-5 py-3 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
          <span>아직 사전 점검을 진행하지 않았습니다. [사전 점검] 버튼을 눌러 AI 코치의 피드백을 받아보세요.</span>
        </div>
        <button
          onClick={onInspect}
          className="min-h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold transition-colors"
        >
          사전 점검 시작
        </button>
      </div>
    )
  }

  const isGood = inspection?.status === 'good' || (inspection?.score ?? 0) >= 80

  return (
    <div className={`border-b px-5 py-3.5 transition-colors ${
      isGood ? 'bg-emerald-50/70 border-emerald-200/60' : 'bg-amber-50/80 border-amber-200/70'
    }`}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          {isGood ? (
            <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          )}
          <span className={`text-xs font-bold ${isGood ? 'text-emerald-800' : 'text-amber-900'}`}>
            {isGood ? '기준 충족' : '보완 필요'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            isGood ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
          }`}>
            점수 {inspection?.score ?? 0}/100
          </span>
        </div>

        <button
          onClick={onInspect}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          title="다시 점검하기"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? '점검 중...' : '다시 점검'}</span>
        </button>
      </div>

      <div className="space-y-1 pl-6">
        {inspection?.feedback.map((item, idx) => (
          <p key={idx} className={`text-xs leading-relaxed ${isGood ? 'text-emerald-900/90' : 'text-amber-900/90'}`}>
            • {item}
          </p>
        ))}
      </div>
    </div>
  )
}
