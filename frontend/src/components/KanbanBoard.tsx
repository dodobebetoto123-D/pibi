import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { api } from '../api/client'
import type { KanbanCard } from '../types'
import { KANBAN_COLUMNS } from '../types'

const CARD_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca',
  '#e9d5ff', '#fed7aa', '#ccfbf1', '#fce7f3',
]

interface SortableCardProps {
  card: KanbanCard
  projectId: string
  onDelete: (id: string) => void
}

function SortableCard({ card, projectId, onDelete }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: card.color,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl p-3 shadow-sm border border-black/5 group relative"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 transition-opacity flex-shrink-0"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug">{card.title}</p>
          {card.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{card.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(card.id)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 text-gray-500 hover:text-red-600 transition-all flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function CardGhost({ card }: { card: KanbanCard }) {
  return (
    <div
      className="rounded-xl p-3 shadow-lg border border-black/10 rotate-2 cursor-grabbing"
      style={{ backgroundColor: card.color }}
    >
      <p className="text-sm font-medium text-gray-800">{card.title}</p>
    </div>
  )
}

interface AddCardFormProps {
  onAdd: (title: string, color: string) => void
  onCancel: () => void
}

function AddCardForm({ onAdd, onCancel }: AddCardFormProps) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) onAdd(title.trim(), color)
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="카드 제목..."
        className="w-full text-sm focus:outline-none mb-2 text-gray-800"
      />
      <div className="flex gap-1 mb-2">
        {CARD_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              color === c ? 'border-gray-600 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => title.trim() && onAdd(title.trim(), color)}
          disabled={!title.trim()}
          className="flex-1 py-1.5 bg-brand-600 text-white text-xs rounded-lg font-medium disabled:opacity-40"
        >
          추가
        </button>
        <button onClick={onCancel} className="flex-1 py-1.5 border border-gray-200 text-xs rounded-lg text-gray-600">
          취소
        </button>
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  projectId: string
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const qc = useQueryClient()
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data: cards = [] } = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => api.kanban.list(projectId),
  })

  const updateMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: Partial<KanbanCard> }) =>
      api.kanban.update(projectId, cardId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban', projectId] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<KanbanCard>) => api.kanban.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban', projectId] })
      setAddingTo(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => api.kanban.delete(projectId, cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban', projectId] }),
  })

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = cards.find((c) => c.id === e.active.id)
    setActiveCard(card ?? null)
  }, [cards])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const draggedCard = cards.find((c) => c.id === active.id)
    if (!draggedCard) return

    // Check if dropped on a column header
    const targetColumn = KANBAN_COLUMNS.find((col) => col.id === over.id)
    if (targetColumn) {
      updateMutation.mutate({ cardId: String(active.id), data: { column_id: targetColumn.id } })
      return
    }

    // Dropped on another card — move to its column
    const targetCard = cards.find((c) => c.id === over.id)
    if (targetCard && targetCard.column_id !== draggedCard.column_id) {
      updateMutation.mutate({
        cardId: String(active.id),
        data: { column_id: targetCard.column_id, position: targetCard.position },
      })
    }
  }, [cards, updateMutation])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 h-full overflow-x-auto overflow-y-hidden">
        {KANBAN_COLUMNS.map((col) => {
          const colCards = cards
            .filter((c) => c.column_id === col.id)
            .sort((a, b) => a.position - b.position)

          return (
            <div
              key={col.id}
              className="flex flex-col w-64 flex-shrink-0"
            >
              {/* Column header */}
              <div className={`rounded-t-xl px-3 py-2 ${col.color} border border-b-0 border-gray-200`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs bg-white/70 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                    {colCards.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className={`flex-1 rounded-b-xl border border-t-0 border-gray-200 ${col.color} p-2 space-y-2 overflow-y-auto scrollbar-thin min-h-0`}>
                <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {colCards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      projectId={projectId}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                </SortableContext>

                {addingTo === col.id ? (
                  <AddCardForm
                    onAdd={(title, color) => {
                      createMutation.mutate({
                        column_id: col.id,
                        title,
                        color,
                        position: colCards.length,
                      })
                    }}
                    onCancel={() => setAddingTo(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingTo(col.id)}
                    className="w-full flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm py-1.5 px-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <Plus size={14} />
                    카드 추가
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeCard && <CardGhost card={activeCard} />}
      </DragOverlay>
    </DndContext>
  )
}
