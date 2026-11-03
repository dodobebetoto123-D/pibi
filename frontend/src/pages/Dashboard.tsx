import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, Clock, FolderKanban } from 'lucide-react'
import { api } from '../api/client'
import type { Project } from '../types'
import Navbar from '../components/Navbar'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

// Live Digital Clock Card
function ClockWidget({ locale }: { locale: 'ko' | 'en' }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const languageTag = locale === 'ko' ? 'ko-KR' : 'en-US'
  const timeStr = time.toLocaleTimeString(languageTag, { hour12: false })
  const dateStr = time.toLocaleDateString(languageTag, {
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
function CalendarWidget({ locale }: { locale: 'ko' | 'en' }) {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const startDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  const daysOfWeek = locale === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
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
function PibiProjectCard({ project, onClick, locale }: { project: Project; onClick: () => void; locale: 'ko' | 'en' }) {
  const isDone = project.status === 'done' || project.current_step >= 3
  const projectType: Record<string, string> = locale === 'ko'
    ? { web: '웹', mobile: '모바일', api: 'API', data: '데이터', other: '기타' }
    : { web: 'Web', mobile: 'Mobile', api: 'API', data: 'Data', other: 'Other' }
  const updatedAt = project.updated_at ? new Date(project.updated_at) : null
  const progress = isDone ? 100 : Math.max(0, Math.min(100, ((project.current_step + 1) / 4) * 100))

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
          {isDone ? (locale === 'ko' ? '완료됨' : 'Complete') : (locale === 'ko' ? '진행 중' : 'In progress')}
        </span>

      </div>

      {/* Project Title */}
      <h3 className="text-base text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
        {project.name}
      </h3>
      <p className="min-h-9 text-xs text-gray-500 mb-5 line-clamp-2">{project.description || (locale === 'ko' ? '설명이 추가되지 않았습니다.' : 'No description added.')}</p>

      {/* Meta Information List */}
      <div className="space-y-2 text-xs text-gray-600 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Users size={14} />
            <span>{locale === 'ko' ? '유형' : 'Type'}</span>
          </div>
          <span className="font-semibold text-gray-800">{projectType[project.type] ?? project.type}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <FolderKanban size={14} />
            <span>{locale === 'ko' ? '단계' : 'Step'}</span>
          </div>
          <span className="font-semibold text-gray-800">{project.current_step + 1} / 4</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={14} />
            <span>{locale === 'ko' ? '최근 수정' : 'Updated'}</span>
          </div>
          <span className="font-mono text-gray-800">{updatedAt && !Number.isNaN(updatedAt.valueOf()) ? updatedAt.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US') : '—'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-400 font-mono mb-1.5">
          <span>{isDone ? (locale === 'ko' ? '완료' : 'Complete') : (locale === 'ko' ? '진행 중' : 'In progress')}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isDone ? 'bg-gray-900' : 'bg-blue-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'opened' | 'closed'>('all')
  const [showModal, setShowModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const { data: projects = [], isLoading, error: projectsError } = useQuery({
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

  const matchesFilter = (project: Project, selected: typeof filter) => {
    if (selected === 'closed') return project.status === 'done' || project.current_step >= 3
    if (selected === 'opened') return project.status === 'active' || project.current_step > 0
    if (selected === 'scheduled') return project.status === 'planned' && project.current_step === 0
    return true
  }
  const filters: { value: typeof filter; label: string }[] = [
    { value: 'all', label: locale === 'ko' ? '전체' : 'All' },
    { value: 'scheduled', label: locale === 'ko' ? '예정' : 'Scheduled' },
    { value: 'opened', label: locale === 'ko' ? '진행 중' : 'Opened' },
    { value: 'closed', label: locale === 'ko' ? '완료' : 'Closed' },
  ]
  const filtered = projects.filter((project) => matchesFilter(project, filter))

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
                <h1 className="text-2xl text-gray-900 tracking-tight flex items-center gap-2">
                  <span className="text-xl">⊞</span> {t('myProjects')}
                </h1>
                <p className="text-xs text-gray-400 mt-1">{locale === 'ko' ? '학습 여정과 프로젝트 진행 상황을 확인하세요' : t('projectProgress')}</p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="min-h-11 flex items-center gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-sm font-bold transition-colors"
              >
                <Plus size={15} />
                {t('addProject')}
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2" aria-label={locale === 'ko' ? '프로젝트 상태 필터' : 'Project status filters'}>
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === value
                      ? 'border-gray-950 bg-gray-950 font-bold text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${filter === value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {projects.filter((project) => matchesFilter(project, value)).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Project Cards Grid */}
            {projectsError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{projectsError instanceof Error ? projectsError.message : '프로젝트를 불러오지 못했습니다.'}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isLoading ? <p className="col-span-full py-12 text-center text-sm text-gray-500">{locale === 'ko' ? '프로젝트를 불러오는 중...' : 'Loading projects...'}</p> : projects.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><FolderKanban size={22} /></div>
                  <h2 className="text-lg text-gray-900">{t('emptyTitle')}</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{t('emptyDescription')}</p>
                  <button onClick={() => setShowModal(true)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} />{t('createProject')}</button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="col-span-full py-10 text-center text-sm text-gray-500">{locale === 'ko' ? '이 필터에 해당하는 프로젝트가 없습니다.' : 'No projects match this filter.'}</p>
              ) : filtered.map((p) => (
                <PibiProjectCard
                  key={p.id}
                  project={p}
                  locale={locale}
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
                <span className="text-xs text-gray-400">{user?.email}</span>
              </div>
            </div>

            {/* Live Clock Card */}
            <ClockWidget locale={locale} />

            {/* Monthly Calendar Widget */}
            <CalendarWidget locale={locale} />
          </div>
        </div>
      </main>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] w-full max-w-md p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('newProject')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">{t('projectName')} *</label>
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      createMutation.mutate({ name: newProjectName.trim(), type: 'web' })
                    }
                  }}
                placeholder={locale === 'ko' ? '예: 학습 계획 도우미' : 'e.g. Study planner'}
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
                {t('cancel')}
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
                {createMutation.isPending ? t('creating') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
