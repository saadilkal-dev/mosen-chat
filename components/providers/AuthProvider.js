'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useClerk, useUser } from '@clerk/nextjs'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export default function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const clerk = useClerk()
  const [appProfile, setAppProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    setAppProfile(data.user ?? null)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setAppProfile(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    loadProfile().finally(() => setProfileLoading(false))
  }, [isLoaded, isSignedIn, clerkUser?.id, loadProfile])

  const refresh = useCallback(async () => {
    await loadProfile()
  }, [loadProfile])

  const logout = useCallback(async () => {
    await clerk.signOut({ redirectUrl: '/' })
  }, [clerk])

  const mergedUser = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null
    const email =
      appProfile?.email
      || clerkUser.primaryEmailAddress?.emailAddress
      || ''
    const name =
      appProfile?.name
      || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim()
      || email.split('@')[0]
      || ''
    return {
      userId: clerkUser.id,
      name,
      email,
      orgId: appProfile?.orgId ?? null,
      orgName: appProfile?.orgName ?? null,
      role: appProfile?.role || 'leader',
    }
  }, [isSignedIn, clerkUser, appProfile])

  const loading = !isLoaded || (isSignedIn && profileLoading)

  const value = useMemo(
    () => ({ user: mergedUser, loading, refresh, logout }),
    [mergedUser, loading, refresh, logout],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
