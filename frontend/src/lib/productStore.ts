import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { firestore } from '../auth/firebase'
import type { Locale } from '../contexts/LocaleContext'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  locale: Locale
  browserNotifications: boolean
  updatedAt: string
}

export interface ProjectInvitation {
  id: string
  project_id: string
  project_name: string
  email: string
  inviter_uid: string
  inviter_name: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  expires_at: Timestamp
  read_at?: string
  accepted_at?: string
  accepted_by?: string
}

function db() {
  if (!firestore) throw new Error('Firestore가 초기화되지 않았습니다')
  return firestore
}

const users = () => collection(db(), 'users')
const invitations = () => collection(db(), 'invitations')
const projectRef = (projectId: string) => doc(db(), 'projects', projectId)
const userRef = (uid: string) => doc(db(), 'users', uid)

export const productStore = {
  async ensureProfile(user: User): Promise<UserProfile> {
    const ref = userRef(user.uid)
    const snap = await getDoc(ref)
    const current = snap.data()
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName || current?.displayName || user.email?.split('@')[0] || '',
      locale: current?.locale === 'en' || (!current?.locale && localStorage.getItem('pibi.locale') === 'en') ? 'en' : 'ko',
      browserNotifications: current?.browserNotifications === true,
      updatedAt: new Date().toISOString(),
    }
    await setDoc(ref, { ...profile, ...(current?.createdAt ? {} : { createdAt: profile.updatedAt }) }, { merge: true })
    return profile
  },

  async updateProfile(uid: string, profile: Pick<UserProfile, 'displayName' | 'locale' | 'browserNotifications'>) {
    await setDoc(userRef(uid), { ...profile, updatedAt: new Date().toISOString() }, { merge: true })
  },

  subscribeProfile(uid: string, callback: (profile: Partial<UserProfile> | null) => void): Unsubscribe {
    return onSnapshot(userRef(uid), (snap) => callback(snap.exists() ? snap.data() as UserProfile : null))
  },

  async createInvitation(input: {
    projectId: string
    projectName: string
    email: string
    inviter: User
  }): Promise<ProjectInvitation> {
    const email = input.email.trim().toLowerCase()
    if (!email || !email.includes('@')) throw new Error('유효한 이메일 주소를 입력해 주세요.')
    if (input.inviter.email?.trim().toLowerCase() === email) throw new Error('본인 계정은 초대할 수 없습니다.')
    const ref = doc(invitations())
    const now = new Date()
    const row = {
      project_id: input.projectId,
      project_name: input.projectName,
      email,
      inviter_uid: input.inviter.uid,
      inviter_name: input.inviter.displayName || input.inviter.email || 'pibi 사용자',
      status: 'pending' as const,
      created_at: now.toISOString(),
      expires_at: Timestamp.fromDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
    }
    await setDoc(ref, row)
    return { id: ref.id, ...row }
  },

  async getInvitation(id: string): Promise<ProjectInvitation | null> {
    const snap = await getDoc(doc(db(), 'invitations', id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as ProjectInvitation) : null
  },

  subscribeInvitations(uid: string, email: string, callback: (items: ProjectInvitation[]) => void): Unsubscribe {
    const received = new Map<string, ProjectInvitation>()
    const sent = new Map<string, ProjectInvitation>()
    const emit = () => callback([...received.values(), ...sent.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)))
    const stopReceived = onSnapshot(query(invitations(), where('email', '==', email.trim().toLowerCase())), (snap) => {
      received.clear()
      snap.docs.forEach((item) => received.set(item.id, { id: item.id, ...item.data() } as ProjectInvitation))
      emit()
    })
    const stopSent = onSnapshot(query(invitations(), where('inviter_uid', '==', uid)), (snap) => {
      sent.clear()
      snap.docs.forEach((item) => sent.set(item.id, { id: item.id, ...item.data() } as ProjectInvitation))
      emit()
    })
    return () => { stopReceived(); stopSent() }
  },

  async markInvitationRead(id: string) {
    await updateDoc(doc(db(), 'invitations', id), { read_at: new Date().toISOString() })
  },

  async acceptInvitation(invitation: ProjectInvitation, user: User) {
    const email = user.email?.trim().toLowerCase()
    if (!email || email !== invitation.email.toLowerCase()) {
      throw new Error('초대받은 이메일 계정으로 로그인해 주세요.')
    }
    const invitationRef = doc(db(), 'invitations', invitation.id)
    const memberRef = doc(db(), 'projects', invitation.project_id, 'members', user.uid)
    const userProjectRef = doc(db(), 'users', user.uid, 'projects', invitation.project_id)
    await runTransaction(db(), async (transaction) => {
      const inviteSnap = await transaction.get(invitationRef)
      if (!inviteSnap.exists()) throw new Error('초대를 찾을 수 없습니다.')
      const current = inviteSnap.data()
      if (current.status !== 'pending' || current.expires_at.toMillis() < Date.now()) {
        throw new Error('초대가 만료되었거나 취소되었습니다.')
      }
      const projectSnap = await transaction.get(projectRef(invitation.project_id))
      if (!projectSnap.exists()) throw new Error('프로젝트를 찾을 수 없습니다.')
      transaction.set(memberRef, {
        uid: user.uid,
        email,
        display_name: user.displayName ?? '',
        role: 'editor',
        invitation_id: invitation.id,
        joined_at: new Date().toISOString(),
      })
      transaction.set(userProjectRef, {
        project_id: invitation.project_id,
        project_name: projectSnap.data().name,
        joined_at: new Date().toISOString(),
      })
      transaction.update(invitationRef, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.uid,
      })
    })
  },

  async listProjectsForUser(uid: string) {
    const memberDocs = await getDocs(collection(db(), 'users', uid, 'projects'))
    const projects = await Promise.all(memberDocs.docs.map(async (item) => {
      const snap = await getDoc(projectRef(item.id))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    }))
    return projects.filter((item): item is { id: string; [key: string]: unknown } => item !== null)
  },
}
