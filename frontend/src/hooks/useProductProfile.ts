import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { productStore, type UserProfile } from '../lib/productStore'

export function useProductProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    return productStore.subscribeProfile(user.uid, setProfile)
  }, [user])

  return profile
}
