import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'ko' | 'en'

const messages = {
  ko: {
    home: '홈', workspace: '작업 공간', settings: '계정 설정', signOut: '로그아웃',
    notifications: '알림', emptyTitle: '아직 프로젝트가 없습니다',
    emptyDescription: '아이디어를 첫 프로젝트로 만들어 보세요.', createProject: '프로젝트 만들기',
    addProject: '프로젝트 추가', newProject: '새 프로젝트 만들기', projectName: '프로젝트 이름',
    create: '생성하기', cancel: '취소', creating: '생성 중...',
    account: '계정', displayName: '표시 이름', email: '이메일', language: '언어',
    browserNotifications: '브라우저 알림', save: '변경사항 저장', saved: '저장했습니다',
    password: '비밀번호 변경', currentPassword: '현재 비밀번호', newPassword: '새 비밀번호',
    confirmPassword: '새 비밀번호 확인', updatePassword: '비밀번호 변경',
    invites: '초대', inviteToProject: '프로젝트 초대', inviteEmail: '초대할 이메일',
    sendInvite: '초대 링크 만들기', copyInvite: '초대 링크 복사', inviteCreated: '초대 링크를 만들었습니다.',
    acceptInvite: '초대 수락', invitationExpired: '초대가 만료되었거나 취소되었습니다.',
    invitationWrongAccount: '초대를 받은 이메일 계정으로 로그인해 주세요.',
    invitationAccepted: '프로젝트에 참여했습니다.', pending: '대기 중', accepted: '수락됨',
    noNotifications: '새 알림이 없습니다', accept: '수락', open: '열기',
    myProjects: '내 프로젝트', projectProgress: '프로젝트 진행 상황을 확인하세요.',
    back: '뒤로', nextStep: '다음 단계로', precheck: '사전 점검', checking: '점검 중...',
    versionHistory: '버전 기록', addNote: '노트 추가', import: '가져오기',
    projectLoading: '작업 공간 로딩 중...',
  },
  en: {
    home: 'Home', workspace: 'Workspace', settings: 'Account settings', signOut: 'Sign out',
    notifications: 'Notifications', emptyTitle: 'No projects yet',
    emptyDescription: 'Turn your first idea into a project.', createProject: 'Create your first project',
    addProject: 'Add project', newProject: 'Create a project', projectName: 'Project name',
    create: 'Create', cancel: 'Cancel', creating: 'Creating...',
    account: 'Account', displayName: 'Display name', email: 'Email', language: 'Language',
    browserNotifications: 'Browser notifications', save: 'Save changes', saved: 'Saved',
    password: 'Change password', currentPassword: 'Current password', newPassword: 'New password',
    confirmPassword: 'Confirm new password', updatePassword: 'Update password',
    invites: 'Invitations', inviteToProject: 'Invite to project', inviteEmail: 'Email to invite',
    sendInvite: 'Create invite link', copyInvite: 'Copy invite link', inviteCreated: 'Invite link created.',
    acceptInvite: 'Accept invitation', invitationExpired: 'This invitation expired or was canceled.',
    invitationWrongAccount: 'Sign in with the email address that received this invitation.',
    invitationAccepted: 'You joined the project.', pending: 'Pending', accepted: 'Accepted',
    noNotifications: 'No new notifications', accept: 'Accept', open: 'Open',
    myProjects: 'My projects', projectProgress: 'Review your project progress.',
    back: 'Back', nextStep: 'Next step', precheck: 'Review', checking: 'Reviewing...',
    versionHistory: 'Version history', addNote: 'Add note', import: 'Import',
    projectLoading: 'Loading workspace...',
  },
} as const

type MessageKey = keyof typeof messages.ko
interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    localStorage.getItem('pibi.locale') === 'en' ? 'en' : 'ko'
  )
  useEffect(() => localStorage.setItem('pibi.locale', locale), [locale])
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key) => messages[locale][key] ?? messages.ko[key],
  }), [locale])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used inside LocaleProvider')
  return context
}
