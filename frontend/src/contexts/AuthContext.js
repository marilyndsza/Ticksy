import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
const DEMO_EMAIL = 'demo@ticksy.app'
const DEMO_LOGIN_IDS = new Set(['demo', 'ticksy-demo', DEMO_EMAIL])

export const useAuth = () => useContext(AuthContext)

const normalizeIdentifier = (value = '') => value.trim().toLowerCase()

const resolveLoginEmail = (identifier) => {
  const normalized = normalizeIdentifier(identifier)
  if (!normalized) return ''
  if (DEMO_LOGIN_IDS.has(normalized)) return DEMO_EMAIL
  return normalized
}

const getLoginId = (user) => {
  if (!user?.email) return ''
  if (user.email.toLowerCase() === DEMO_EMAIL) return 'demo'
  return user.email.split('@')[0]
}

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  getLoginId(user) ||
  'Trainer'

const withTimeout = (promise, message = 'Request timed out. Please check your connection and try again.') =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), 12000)
    }),
  ])

const isSupabaseAuthLoadError = (error) => {
  const message = error?.message || String(error || '')
  const name = error?.name || ''
  const stack = error?.stack || ''
  return (
    message.includes('Load failed') &&
    (
      !name ||
      name.includes('Auth') ||
      stack.includes('AuthRetryableFetchError') ||
      stack.includes('CustomAuthError') ||
      stack.includes('supabase')
    )
  )
}

const clearSupabaseAuthStorage = () => {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('sb-') && key.includes('-auth-token'))
      .forEach((key) => window.localStorage.removeItem(key))
  } catch (error) {
    console.error('Failed to clear Supabase auth storage', error)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleAuthRuntimeError = (event) => {
      if (!isSupabaseAuthLoadError(event.error || event.message)) return
      event.preventDefault()
      console.error('Supabase auth load failed; clearing local session', event.error || event.message)
      clearSupabaseAuthStorage()
      setUser(null)
      setLoading(false)
    }

    const handleAuthRejection = (event) => {
      if (!isSupabaseAuthLoadError(event.reason)) return
      event.preventDefault()
      console.error('Supabase auth refresh failed; clearing local session', event.reason)
      clearSupabaseAuthStorage()
      setUser(null)
      setLoading(false)
    }

    window.addEventListener('error', handleAuthRuntimeError)
    window.addEventListener('unhandledrejection', handleAuthRejection)

    const bootstrapAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(data?.session?.user ?? null)
      } catch (sessionError) {
        console.error('Failed to restore Supabase session', sessionError)
        clearSupabaseAuthStorage()
        setUser(null)

        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch (signOutError) {
          console.error('Failed to clear broken Supabase session', signOutError)
        }
      } finally {
        setLoading(false)
      }
    }

    bootstrapAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('error', handleAuthRuntimeError)
      window.removeEventListener('unhandledrejection', handleAuthRejection)
    }
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({ email, password }),
      'Sign up is taking too long. Please check your Supabase setup and try again.'
    )
    if (error) throw error
    return data
  }

  const signIn = async (identifier, password) => {
    const email = resolveLoginEmail(identifier)
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'Login is taking too long. Please check your Supabase setup and try again.'
    )
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfileName = async (fullName) => {
    const nextName = fullName.trim()
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: nextName,
        name: nextName,
      },
    })
    if (error) throw error
    setUser((prev) => ({
      ...(prev || {}),
      ...(data?.user || {}),
      user_metadata: {
        ...(prev?.user_metadata || {}),
        ...(data?.user?.user_metadata || {}),
      },
    }))
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, getLoginId, getDisplayName, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  )
}
