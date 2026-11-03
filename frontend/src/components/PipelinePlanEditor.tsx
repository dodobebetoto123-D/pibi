import { useState, useEffect } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, Code, Link,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Save, Eye, Edit3, Download
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface PipelinePlanEditorProps {
  content: string
  notes: string[]
  onSave: (content: string) => Promise<unknown>
}

export default function PipelinePlanEditor({ content, notes, onSave }: PipelinePlanEditorProps) {
  const [text, setText] = useState(content)
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('edit')
  const [isSaved, setIsSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setText(content)
    setIsSaved(true)
  }, [content])

  const insertText = (prefix: string, suffix: string = '') => {
    setText((prev) => prev + `\n${prefix}${suffix}`)
    setIsSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(text)
      setIsSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Rich Toolbar */}
      <fieldset disabled={saving} className="px-4 py-2 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
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
          <button
            type="button"
            disabled={saving || notes.length === 0}
            onClick={() => {
              setText((previous) => `${previous}${previous.trim() ? '\n\n' : ''}## 브레인스토밍 메모\n${notes.map((note) => `- ${note.replace(/\n/g, '\n  ')}`).join('\n')}`)
              setIsSaved(false)
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
            title="브레인스토밍 메모를 기획서 끝에 추가"
          >
            <Download size={12} /> 메모 가져오기
          </button>
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
            onClick={() => void handleSave()}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
              isSaved
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save size={13} />
            <span>{saving ? '저장 중...' : isSaved ? '저장됨' : '저장하기'}</span>
          </button>
        </div>
      </fieldset>
      {error && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

      {/* Editor / Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
            <textarea
              disabled={saving}
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
