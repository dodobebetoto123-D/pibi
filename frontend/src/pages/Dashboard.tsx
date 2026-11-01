import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, Clock, Info, Bell, FolderKanban } from 'lucide-react'
import { api } from '../api/client'
import type { Project, ProjectStatus } from '../types'
import Navbar from '../components/Navbar'
import { useAuth } from '../auth/AuthContext'

// Live Digital Clock Card
function ClockWidget() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour12: false })
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-[16px] p-6 border border-gray-200 text-center">
      <div className="font-mono text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
        {timeStr}
      </div>
      <div className="text-xs text-gray-400 font-medium">{dateStr}</div>
    </div>
  )
}

// Monthly Calendar Widget
function CalendarWidget() {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const startDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div className="bg-white rounded-[16px] p-5 border border-gray-200">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
        {daysOfWeek.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="py-1.5" />
          const isToday = d === today.getDate()
          return (
            <div
              key={d}
              className={`py-1.5 rounded-lg font-medium transition-colors ${
                isToday
                  ? 'bg-gray-950 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Project Card (Matching Image 1)
function PibiProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  const isDone = project.status === 'done' || project.current_step >= 3

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[16px] p-6 border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors relative group"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
            isDone
              ? 'bg-gray-100 text-gray-700 border-gray-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {isDone ? '완료됨' : '진행중'}
        </span>

        <div className="flex items-center gap-2 text-gray-400">
          <button className="hover:text-gray-600 transition-colors">
            <Info size={14} />
          </button>
          <div className="relative">
            <Bell size={14} className="hover:text-gray-600 transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Project Title */}
      <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
        {project.name}
      </h3>
      <p className="text-xs text-gray-400 mb-5">작성자: super</p>

      {/* Meta Information List */}
      <div className="space-y-2 text-xs text-gray-600 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Users size={14} />
            <span>유형</span>
          </div>
          <span className="font-semibold text-gray-800">그룹</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <FolderKanban size={14} />
            <span>세션</span>
          </div>
          <span className="font-semibold text-gray-800">1개 세션</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={14} />
            <span>기간</span>
          </div>
          <span className="font-mono text-gray-800">Oct 31 08:00 - Oct 31 18:00</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-400 font-mono mb-1.5">
          <span>{isDone ? '10h 경과' : '진행 중'}</span>
          <span>- 남음</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isDone ? 'w-full bg-gray-900' : 'w-2/3 bg-blue-600'
            }`}
          />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'opened' | 'closed'>('all')
  const [showModal, setShowModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  const createMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
      setNewProjectName('')
      navigate(`/project/${p.id}`)
    },
  })

  // Ensure there is at least one sample hackathon project if empty
  useEffect(() => {
    if (!isLoading && projects.length === 0 && import.meta.env.VITE_SEED_DEMO === 'true') {
      api.projects.create({
        name: '2026 AI 서비스 해커톤 (10/31)',
        type: 'web',
        description: '급식 대기열 인식 및 예상 대기시간 알림 서비스',
      }).then(() => {
        qc.invalidateQueries({ queryKey: ['projects'] })
      })
    }
  }, [isLoading, projects.length, qc])

  const filtered = projects.filter((p) => {
    if (filter === 'closed') return p.status === 'done' || p.current_step >= 3
    if (filter === 'opened') return p.status === 'active' || p.current_step > 0
    if (filter === 'scheduled') return p.status === 'planned' && p.current_step === 0
    return true
  })

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <main className="max-w-[1320px] w-full mx-auto px-5 lg:px-10 py-8 lg:py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Main Projects Section */}
          <div className="lg:col-span-2">
            {/* Breadcrumb & Title */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span className="text-xl">⊞</span> 내 프로젝트
                </h1>
                <p className="text-xs text-gray-400 mt-1">학습 여정과 프로젝트 진행 상황을 확인하세요</p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="min-h-11 flex items-center gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-sm font-bold transition-colors"
              >
                <Plus size={15} />
                프로젝트 추가
              </button>
            </div>

            {/* Filter Tabs (All 1, Scheduled, Opened, Closed 1) */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === 'all'
                    ? 'bg-gray-950 text-white border-gray-950 font-bold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                  {projects.length}
                </span>
              </button>

              <button
                onClick={() => setFilter('scheduled')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === 'scheduled'
                    ? 'bg-gray-950 text-white border-gray-950 font-bold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Scheduled</span>
              </button>

              <button
                onClick={() => setFilter('opened')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === 'opened'
                    ? 'bg-gray-950 text-white border-gray-950 font-bold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Opened</span>
              </button>

              <button
                onClick={() => setFilter('closed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === 'closed'
                    ? 'bg-gray-950 text-white border-gray-950 font-bold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Closed</span>
                <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {projects.filter((p) => p.status === 'done' || p.current_step >= 3).length}
                </span>
              </button>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filtered.map((p) => (
                <PibiProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => navigate(`/project/${p.id}`)}
                />
              ))}
            </div>
          </div>

          {/* Right 1 Col: User, Clock, Calendar Widgets */}
          <div className="space-y-5">
            {/* Profile Card */}
            <div className="bg-white rounded-[16px] p-6 border border-gray-200 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-xl">
                {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">{user?.displayName || user?.email}</h3>
                <span className="text-xs text-gray-400">바이브 코더 · 챌린저</span>
              </div>
            </div>

            {/* Live Clock Card */}
            <ClockWidget />

            {/* Monthly Calendar Widget */}
            <CalendarWidget />
          </div>
        </div>
      </main>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] w-full max-w-md p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">새 프로젝트 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">프로젝트 이름 *</label>
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      createMutation.mutate({ name: newProjectName.trim(), type: 'web' })
                    }
                  }}
                  placeholder="예: 2026 AI 서비스 해커톤"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {createMutation.isError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  프로젝트를 만들지 못했습니다: {createMutation.error instanceof Error ? createMutation.error.message : '잠시 후 다시 시도해 주세요.'}
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (newProjectName.trim()) {
                    createMutation.mutate({ name: newProjectName.trim(), type: 'web' })
                  }
                }}
                disabled={!newProjectName.trim() || createMutation.isPending}
                className="flex-1 min-h-11 rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
              >
                {createMutation.isPending ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
