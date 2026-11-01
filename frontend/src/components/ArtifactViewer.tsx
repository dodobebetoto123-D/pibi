import ReactMarkdown from 'react-markdown'
import type { StepArtifact } from '../types'

interface ArtifactViewerProps {
  artifacts: StepArtifact[]
  step: number
}

const STEP_TITLES = ['브레인스토밍 결과', '기획서', '화면 설계', '생성된 코드']

export default function ArtifactViewer({ artifacts, step }: ArtifactViewerProps) {
  const mdArt = artifacts.find((a) => a.type === 'markdown')
  const jsonArt = artifacts.find((a) => a.type === 'json')
  const htmlArt = artifacts.find((a) => a.type === 'html')

  if (artifacts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
        <div>
          <div className="text-4xl mb-3">📄</div>
          <p className="text-sm font-medium">아직 산출물이 없어요</p>
          <p className="text-xs mt-1 opacity-70">AI와 대화하면 산출물이 자동으로 저장됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 scrollbar-thin">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{STEP_TITLES[step]} 산출물</h3>

      {mdArt && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
          <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Markdown</div>
          <div className="prose prose-sm prose-gray max-w-none">
            <ReactMarkdown>{mdArt.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {jsonArt && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
          <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">JSON</div>
          <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 rounded p-3 max-h-80 scrollbar-thin">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(jsonArt.content), null, 2)
              } catch {
                return jsonArt.content
              }
            })()}
          </pre>
        </div>
      )}

      {htmlArt && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
          <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">HTML 코드</div>
          <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 rounded p-3 max-h-80 scrollbar-thin">
            {htmlArt.content}
          </pre>
        </div>
      )}
    </div>
  )
}
