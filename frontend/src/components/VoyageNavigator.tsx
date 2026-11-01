import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react'
import { STEPS } from '../types'

interface VoyageNavigatorProps {
  currentStep: number
  onSelect: (step: number) => void
  completedSteps: Set<number>
}

export default function VoyageNavigator({
  currentStep,
  onSelect,
  completedSteps,
}: VoyageNavigatorProps) {
  return (
    <div className="flex flex-col bg-white border-r border-gray-100 overflow-hidden flex-shrink-0 w-64 select-none">
      {/* Navigator Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-800">보이지 네비게이터</span>
        <span className="text-[10px] text-gray-400 font-mono">v0.2.14</span>
      </div>

      {/* Session Card (Matching Image 2/3/4/5) */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="bg-white rounded-[12px] p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-[6px] bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              <span className="text-xs font-bold text-gray-800 truncate">AI 서비스 챌린지</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">
              진행중
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
            <Clock size={11} />
            <span>Oct 31 08:00</span>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {STEPS.map((s, idx) => {
          const isDone = completedSteps.has(s.id)
          const isActive = s.id === currentStep

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : isDone
                  ? 'text-gray-700 hover:bg-gray-50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <Circle
                    size={16}
                    className={isActive ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold truncate ${isActive ? 'text-blue-800 font-bold' : ''}`}>
                  <span className="mr-1">{s.icon}</span>
                  {s.label}
                </div>
                <div className="text-[10px] text-gray-400 truncate mt-0.5">
                  {s.description}
                </div>
              </div>

              {isActive && (
                  <ChevronRight size={13} className="text-blue-600 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
