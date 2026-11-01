import { useState } from 'react'
import { Plus, Trash2, Sparkles, Check, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import type { StickyNote } from '../types'

interface BrainstormCanvasProps {
  notes: StickyNote[]
  onAddNote: (content: string, color: string) => void
  onUpdateNote: (id: string, data: Partial<StickyNote>) => void
  onDeleteNote: (id: string) => void
  onSuggestNotes: () => void
  suggesting: boolean
}

const NOTE_COLORS = [
  { id: 'yellow', bg: '#fef08a', text: '#713f12', border: '#fde047' },
  { id: 'green', bg: '#bbf7d0', text: '#14532d', border: '#86efac' },
  { id: 'blue', bg: '#bfdbfe', text: '#1e3a8a', border: '#93c5fd' },
  { id: 'pink', bg: '#fecaca', text: '#881337', border: '#fca5a5' },
  { id: 'purple', bg: '#e9d5ff', text: '#581c87', border: '#d8b4fe' },
]

export default function BrainstormCanvas({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSuggestNotes,
  suggesting,
}: BrainstormCanvasProps) {
  const [zoom, setZoom] = useState(100)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleStartEdit = (note: StickyNote) => {
    setEditingId(note.id)
    setEditText(note.content)
  }

  const handleSaveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateNote(id, { content: editText.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] select-none relative overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="h-10 px-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between text-xs text-gray-500 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live · synced</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="font-semibold text-gray-700">{notes.length} notes</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSuggestNotes}
            disabled={suggesting}
            className="min-h-9 flex items-center gap-1 px-3 bg-blue-600 text-white rounded-[12px] font-medium hover:bg-blue-700 transition-colors text-xs disabled:opacity-50"
          >
            <Sparkles size={12} className={suggesting ? 'animate-spin' : ''} />
            <span>{suggesting ? 'AI 노트 생성 중...' : 'AI 아이디어 포스트잇 생성'}</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-gray-600">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 hover:bg-white rounded transition-colors"
              title="축소"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[11px] font-mono px-1">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="p-1 hover:bg-white rounded transition-colors"
              title="확대"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-white rounded transition-colors"
              title="100% 리셋"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Canvas Area */}
      <div
        className="flex-1 overflow-auto p-8 relative scrollbar-thin"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
        }}
      >
        {notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-3xl mb-4 shadow-xs">
              📝
            </div>
            <p className="font-bold text-gray-700 text-base mb-1">아직 브레인스토밍 포스트잇이 없어요</p>
            <p className="text-xs text-gray-400 max-w-sm mb-4">
              상단의 [+ 노트 추가] 버튼을 눌러 메모를 붙이거나, AI에게 아이디어를 물어보고 자동으로 포스트잇을 생성해보세요!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onAddNote('문제정의 : 새로운 서비스 아이디어', '#fef08a')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Plus size={14} />
                첫 포스트잇 추가
              </button>
              <button
                onClick={onSuggestNotes}
                disabled={suggesting}
                className="min-h-11 px-4 bg-blue-600 text-white rounded-[12px] text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                AI 추천 포스트잇 만들기
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {notes.map((note) => {
              const isEditing = editingId === note.id

              return (
                <div
                  key={note.id}
                  className="rounded-2xl p-4 shadow-md hover:shadow-lg transition-all border group relative flex flex-col min-h-[170px]"
                  style={{
                    backgroundColor: note.color || '#fef08a',
                    borderColor: 'rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between mb-2">
                    {/* Color picker dots */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onUpdateNote(note.id, { color: c.bg })}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                            note.color === c.bg ? 'scale-125 border-gray-600' : 'border-black/10'
                          }`}
                          style={{ backgroundColor: c.bg }}
                        />
                      ))}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-black/40 hover:text-red-600 rounded hover:bg-black/5 transition-all"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Note Body */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex flex-col h-full gap-2">
                        <textarea
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) handleSaveEdit(note.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 w-full bg-white/70 border border-black/10 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-black/20 resize-none font-medium leading-relaxed"
                          rows={4}
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 text-[11px] bg-black/10 rounded text-gray-700"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-2 py-0.5 text-[11px] bg-gray-900 text-white rounded font-medium flex items-center gap-1"
                          >
                            <Check size={11} /> 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(note)}
                        className="cursor-pointer text-xs leading-relaxed text-gray-800 font-medium whitespace-pre-wrap h-full"
                        title="클릭하여 편집"
                      >
                        {note.content}
                      </div>
                    )}
                  </div>

                  {/* Card bottom hint */}
                  {!isEditing && (
                    <div className="mt-2 text-[10px] text-black/30 font-mono">
                      더블클릭 또는 클릭하여 수정
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
