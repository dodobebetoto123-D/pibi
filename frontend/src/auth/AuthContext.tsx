import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { firebaseAuth } from './firebase'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    signIn: async (email, password) => {
      if (!firebaseAuth) throw new Error('Firebase 환경 설정이 필요합니다.')
      await signInWithEmailAndPassword(firebaseAuth, email, password)
    },
    signInWithGoogle: async () => {
      if (!firebaseAuth) throw new Error('Firebase 환경 설정이 필요합니다.')
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
    },
    signUp: async (email, password) => {
      if (!firebaseAuth) throw new Error('Firebase 환경 설정이 필요합니다.')
      await createUserWithEmailAndPassword(firebaseAuth, email, password)
    },
    signOutUser: async () => {
      if (!firebaseAuth) return
      await signOut(firebaseAuth)
    },
    resetPassword: async (email) => {
      if (!firebaseAuth) throw new Error('Firebase 환경 설정이 필요합니다.')
      await sendPasswordResetEmail(firebaseAuth, email)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
