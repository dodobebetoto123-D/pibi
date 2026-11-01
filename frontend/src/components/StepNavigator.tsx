import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { STEPS } from '../types'

interface StepNavigatorProps {
  currentStep: number
  onSelect: (step: number) => void
  completedSteps: Set<number>
}

export default function StepNavigator({ currentStep, onSelect, completedSteps }: StepNavigatorProps) {
  return (
    <nav className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-3 gap-1 flex-shrink-0">
      <div className="px-2 mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">단계</span>
      </div>
      {STEPS.map((s, idx) => {
        const isDone = completedSteps.has(s.id)
        const isActive = s.id === currentStep
        const isLocked = !isDone && s.id > currentStep && !isActive

        return (
          <button
            key={s.id}
            onClick={() => !isLocked && onSelect(s.id)}
            disabled={isLocked}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group
              ${isActive ? 'bg-brand-50 text-brand-700' : ''}
              ${isDone && !isActive ? 'text-gray-600 hover:bg-gray-50' : ''}
              ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${!isActive && !isDone && !isLocked ? 'text-gray-700 hover:bg-gray-50' : ''}
            `}
          >
            <div className="flex-shrink-0">
              {isDone ? (
                <CheckCircle2 size={18} className="text-brand-500" />
              ) : (
                <Circle
                  size={18}
                  className={isActive ? 'text-brand-500' : 'text-gray-300 group-hover:text-gray-400'}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${isActive ? 'text-brand-700' : ''}`}>
                <span className="mr-1">{s.icon}</span> {s.label}
              </div>
              <div className="text-xs text-gray-400 truncate">{s.description}</div>
            </div>
            {isActive && <ChevronRight size={14} className="text-brand-400 flex-shrink-0" />}
          </button>
        )
      })}

      {/* Connector lines */}
      <div className="px-5 mt-2">
        {STEPS.slice(0, -1).map((s) => (
          <div
            key={`line-${s.id}`}
            className={`h-6 w-0.5 ml-0 my-0.5 ${
              completedSteps.has(s.id) ? 'bg-brand-300' : 'bg-gray-100'
            }`}
            style={{ marginLeft: '8px', display: 'none' }}
          />
        ))}
      </div>
    </nav>
  )
}
