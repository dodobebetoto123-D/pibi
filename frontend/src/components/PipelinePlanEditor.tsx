import { useState, useEffect } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, Code, Link,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Save, Eye, Edit3
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface PipelinePlanEditorProps {
  content: string
  onSave: (content: string) => void
}

const DEFAULT_PLAN_TEMPLATE = `# 1. 시연 범위 분리

## [당일 시연 - 최소 기능 (MVP)]
- 입구 QR 스캔 (PC/노트북 1대 + 웹캠 + 스캔 인식)
- 배식대 QR 스캔: 인식 즉시 학번 검증 및 대기열 등록
- 서버: 스캔 기록(SQLite), 대기 큐 관리, 예상 대기시간 계산
- 입구 화면: 현재 대기자 수 / 예상 대기시간 큰 글씨 실시간 표시
- 예외 처리: QR 미인식 안내 -> 2회 실패 시 학번 직접 입력

## [추후 - 확장 기능]
- 학년별·반별 급식 시간대 자동 분산 스케줄링
- 모바일 학부모 알림 연동

---

# 2. 서비스 데이터 흐름
1. 학생이 입구 카메라에 QR 코드 제시
2. 시스템이 학번 검증 후 대기 순번 및 예상 대기시간 부여
3. 안내 화면에 "N번째 순서입니다. 예상 대기시간 약 X분" 표시
4. 배식 완료 시 대기 큐에서 자동 제거

---

# 3. 안전 및 예외 처리
- 개인정보 보호: 학번과 시각만 최소 수집하며 당일 급식 종료 후 자동 파기
- 미등록 학생: 담당 교사 확인 및 현장 학번 직접 입력 지원`

export default function PipelinePlanEditor({ content, onSave }: PipelinePlanEditorProps) {
  const [text, setText] = useState(content || DEFAULT_PLAN_TEMPLATE)
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('edit')
  const [isSaved, setIsSaved] = useState(true)

  useEffect(() => {
    if (content) {
      setText(content)
      setIsSaved(true)
    }
  }, [content])

  const insertText = (prefix: string, suffix: string = '') => {
    setText((prev) => prev + `\n${prefix}${suffix}`)
    setIsSaved(false)
  }

  const handleSave = () => {
    onSave(text)
    setIsSaved(true)
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Rich Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertText('**', '**')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="굵게"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => insertText('*', '*')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="기울임"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => insertText('<u>', '</u>')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="밑줄"
          >
            <Underline size={14} />
          </button>
          <button
            onClick={() => insertText('~~', '~~')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="취소선"
          >
            <Strikethrough size={14} />
          </button>
          <button
            onClick={() => insertText('`', '`')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="인라인 코드"
          >
            <Code size={14} />
          </button>
          <button
            onClick={() => insertText('[링크 텍스트](url)')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="링크 삽입"
          >
            <Link size={14} />
          </button>

          <span className="w-px h-4 bg-gray-300 mx-1" />

          <button
            onClick={() => insertText('# 제목 1')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="H1"
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => insertText('## 제목 2')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="H2"
          >
            <Heading2 size={14} />
          </button>
          <button
            onClick={() => insertText('### 제목 3')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="H3"
          >
            <Heading3 size={14} />
          </button>

          <span className="w-px h-4 bg-gray-300 mx-1" />

          <button
            onClick={() => insertText('- 리스트 항목')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="글머리 기호"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => insertText('1. 순서 항목')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="번호 매기기"
          >
            <ListOrdered size={14} />
          </button>
          <button
            onClick={() => insertText('> 인용구')}
            className="p-1.5 hover:bg-white rounded text-gray-700 transition-colors"
            title="인용"
          >
            <Quote size={14} />
          </button>
        </div>

        {/* View mode toggle & Save */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                viewMode === 'edit' ? 'bg-white border border-gray-200 font-semibold text-gray-800' : 'text-gray-500'
              }`}
            >
              <Edit3 size={12} /> 편집
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                viewMode === 'preview' ? 'bg-white border border-gray-200 font-semibold text-gray-800' : 'text-gray-500'
              }`}
            >
              <Eye size={12} /> 미리보기
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                viewMode === 'split' ? 'bg-white border border-gray-200 font-semibold text-gray-800' : 'text-gray-500'
              }`}
            >
              나란히
            </button>
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
              isSaved
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save size={13} />
            <span>{isSaved ? '저장됨' : '저장하기'}</span>
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setIsSaved(false)
              }}
              placeholder="AI 파이프라인 기획서를 작성하세요..."
              className="flex-1 w-full p-6 text-sm text-gray-800 leading-relaxed font-mono focus:outline-none resize-none scrollbar-thin"
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`h-full overflow-y-auto p-8 scrollbar-thin bg-gray-50/50 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-[16px] border border-gray-200 prose prose-sm prose-gray">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
