export type ProjectStatus = 'planned' | 'active' | 'done'
export type ProjectType = 'web' | 'mobile' | 'api' | 'data' | 'other'

export interface Project {
  id: string
  name: string
  owner_uid?: string
  type: ProjectType
  description: string
  status: ProjectStatus
  current_step: number
  created_at: string
  updated_at: string
}

export interface StepArtifact {
  id: string
  project_id: string
  step: number
  type: 'json' | 'markdown' | 'html' | string
  content: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  project_id: string
  step: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface KanbanCard {
  id: string
  project_id: string
  column_id: string
  title: string
  description: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export type KanbanColumn = {
  id: string
  label: string
  color: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: '할 일', color: 'bg-gray-100' },
  { id: 'in-progress', label: '진행 중', color: 'bg-blue-50' },
  { id: 'review', label: '리뷰', color: 'bg-yellow-50' },
  { id: 'done', label: '완료', color: 'bg-green-50' },
]

export interface StickyNote {
  id: string
  project_id: string
  content: string
  color: string
  x: number
  y: number
  created_at: string
  updated_at: string
}

export interface VibeRequest {
  id: string
  project_id: string
  prompt: string
  status: string
  created_at: string
}

export interface StepInspection {
  id: string
  project_id: string
  step: number
  score: number
  status: 'needs_improvement' | 'good'
  feedback: string[]
  updated_at: string
}

export interface StepGuide {
  title: string
  objective: string
  coreQuestion: string
  instructions: string[]
}

export const STEP_GUIDES: Record<number, StepGuide> = {
  0: {
    title: 'AI 서비스 브레인스토밍',
    objective: '사용자의 다양한 불편과 요구를 탐색하여 해결할 가치가 있는 문제를 발견하고, 팀 토의를 통해 AI로 해결할 하나의 서비스 아이디어를 선정할 수 있습니다.',
    coreQuestion: '우리는 누구의 어떤 문제를 해결하고 싶은가? 그리고 생성형 AI는 이 문제를 어떻게 더 효과적으로 해결할 수 있을까?',
    instructions: [
      '1. 주변 사람들의 불편, 일상 문제, 학교·가정·사회에서 발생하는 문제를 자유롭게 작성하세요.',
      '2. 각 문제에 대해 누가(사용자), 어떤 상황에서, 무엇이 불편한지를 구체적으로 정리하세요.',
      '3. AI를 활용하면 해결할 수 있는 아이디어를 가능한 많이 제안하세요.',
      '4. 아이디어를 필요성, 실현 가능성, 사회적 가치 기준으로 비교하여 최종 서비스 아이디어 1개를 선정하세요.'
    ]
  },
  1: {
    title: 'AI 서비스 파이프라인 기획',
    objective: '사용자 문제를 한 문장으로 정의하고, 입력 데이터부터 AI 결과까지 이어지는 실행 가능한 서비스 설계를 작성합니다.',
    coreQuestion: '우리 서비스는 어떤 입력을 받아 어떤 AI 처리를 거쳐 사용자에게 어떤 도움을 제공해야 하는가?',
    instructions: [
      '1. 문제 당사자·상황·불편·기대 변화를 포함해 문제를 한 문장으로 다시 정의하세요.',
      '2. 입력 데이터, 인식 도구(이미지·포즈·소리·음성·공공데이터 등), 생성형 AI의 역할, 사용자 결과를 순서대로 설계하세요.',
      '3. 각 단계의 오류 가능성, 데이터 편향, 개인정보·안전 문제와 대응 방안을 적으세요.',
      '4. 팀원별 역할과 시연 시나리오를 포함한 서비스 기획서를 완성하세요.'
    ]
  },
  2: {
    title: '화면 설계',
    objective: '기획한 AI 서비스의 핵심 사용자 흐름을 웹 화면으로 구현하고, 입력부터 결과까지 작동하는 시연을 완성합니다.',
    coreQuestion: '사용자가 핵심 기능을 한 번의 흐름으로 경험하도록 어떤 화면과 상호작용을 구현할 수 있을까?',
    instructions: [
      '1. 기획서의 핵심 사용자 여정을 시작 화면, 입력 화면, AI 처리 안내, 결과 화면으로 나누어 구성하세요.',
      '2. 이미지·포즈·소리·음성·공공데이터 중 선택한 입력과 인식 결과, 생성형 AI의 해설·추천·생성 결과를 화면에 연결하세요.',
      '3. 정상 작동 사례와 오인식·정보 부족 상황에서의 안내, 재시도 방법, 안전 문구를 구현하세요.',
      '4. 팀원이 사용자 역할을 맡아 입력부터 결과까지 시연하고, 발견한 문제를 수정한 프로토타입을 완성하세요.'
    ]
  },
  3: {
    title: 'PoC 개발 (바이브 코딩)',
    objective: '기획 문서 및 화면설계 내용을 바탕으로 실제로 동작하는 웹 서비스를 완성합니다.',
    coreQuestion: '실제로 동작하는 형태의 서비스가 나오기 위해서는 어떻게 구현해야 할까?',
    instructions: [
      '1. "이 버튼 색상 바꿔줘", "QR 입력 기능 연결해줘"처럼 자연어로 편하게 AI에게 요청하세요.',
      '2. 생성된 웹앱 미리보기를 직접 클릭해보고 버튼과 데이터가 잘 동작하는지 확인하세요.',
      '3. 발견한 버그나 추가하고 싶은 디테일은 채팅으로 바로 수정 요청하세요.',
      '4. 언제든 전체화면으로 최종 시연용 웹앱을 확인해보세요.'
    ]
  }
}

export const STEPS = [
  { id: 0, label: 'AI 서비스 브레인스토밍', shortLabel: '브레인스토밍', icon: '💡', description: '아이디어 탐색 & 스티커 메모' },
  { id: 1, label: 'AI 서비스 파이프라인 기획', shortLabel: '파이프라인 기획', icon: '📋', description: '상세 기획서 작성' },
  { id: 2, label: '화면 설계', shortLabel: '화면 설계', icon: '🎨', description: 'UI 컴포넌트 & 목업' },
  { id: 3, label: 'PoC 개발', shortLabel: 'PoC 개발', icon: '💻', description: '바이브 코딩 & 실제 앱 동작' },
]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: '예정',
  active: '진행중',
  done: '종료',
}
