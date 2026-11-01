import { useState } from 'react'
import { STEP_GUIDES } from '../types'
import { BookOpen } from 'lucide-react'

interface GuidePanelProps {
  step: number
}

type GuideTab = 'activity' | 'session' | 'project'

export default function GuidePanel({ step }: GuidePanelProps) {
  const [tab, setTab] = useState<GuideTab>('activity')
  const guide = STEP_GUIDES[step] || STEP_GUIDES[0]

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-100 overflow-hidden text-gray-700">
      {/* Header with tabs */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
        <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
          <BookOpen size={14} className="text-gray-500" />
          <span>가이드</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-200/60 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setTab('activity')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              tab === 'activity' ? 'bg-white text-gray-800 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            액티비티
          </button>
          <button
            onClick={() => setTab('session')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              tab === 'session' ? 'bg-white text-gray-800 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            세션
          </button>
          <button
            onClick={() => setTab('project')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              tab === 'project' ? 'bg-white text-gray-800 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            프로젝트
          </button>
        </div>
      </div>

      {/* Guide Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs leading-relaxed">
        {tab === 'activity' && (
          <>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">제목</span>
              <p className="font-bold text-gray-900 text-sm">{guide.title}</p>
            </div>

            <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-blue-700 block mb-1">🎯 목표</span>
              <p className="text-gray-700">{guide.objective}</p>
            </div>

            <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-amber-700 block mb-1">❓ 핵심 질문</span>
              <p className="text-gray-700 font-medium">{guide.coreQuestion}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-600 block mb-2">📋 상세 가이드</span>
              <div className="space-y-2">
                {guide.instructions.map((inst, i) => (
                  <div key={i} className="text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {inst}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'session' && (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="font-bold text-gray-800 block mb-1">세션 진행 안내</span>
              <p className="text-gray-600">
                1개 세션으로 구성된 집중 해커톤/스프린트입니다. 총 4단계를 순서대로 진행하며 각 단계별 산출물이 다음 단계의 입력 프롬프트로 자동 연결됩니다.
              </p>
            </div>
            <div className="text-gray-500 text-[11px]">
              • 브레인스토밍 (30분)<br />
              • 기획서 작성 (40분)<br />
              • 화면 설계 (40분)<br />
              • PoC 개발 (60분)
            </div>
          </div>
        )}

        {tab === 'project' && (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="font-bold text-gray-800 block mb-1">비개발자 바이브 코딩 팁 🌱</span>
              <p className="text-gray-600">
                개발 문법을 몰라도 괜찮습니다! 원하는 기능이나 디자인을 자연어로 설명하면 AI가 자동으로 코드를 생성하고 미리보기에 바로 반영해줍니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
