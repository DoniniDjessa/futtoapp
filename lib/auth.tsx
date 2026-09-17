import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { T, isBoAliasEmail } from '@/lib/tables'
import { markPermissionsPending } from '@/lib/permission-flags'
import type { Profile } from '@/lib/types'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (params: {
    email: string
    password: string
    fullName: string
    pseudo: string
  }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  setAvailableToPlay: (available: boolean) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  try {
    const cols =
      'id, email, pseudo, full_name, first_name, phone, position, city, avatar_url, cover_url, is_available_to_play, skill_level, rating, role, created_at'

    let res = await supabase.from(T.profiles).select(cols).eq('id', userId).maybeSingle()

    if (res.error?.code === 'PGRST205') {
      res = await supabase
        .from('profiles')
        .select(
          'id, email, full_name, first_name, phone, position, city, avatar_url, cover_url, role, created_at',
        )
        .eq('id', userId)
        .maybeSingle()
    } else if (
      res.error &&
      (/pseudo/i.test(res.error.message) ||
        /cover_url/i.test(res.error.message) ||
        /is_available_to_play/i.test(res.error.message))
    ) {
      res = await supabase
        .from(T.profiles)
        .select(
          'id, email, full_name, first_name, phone, position, city, avatar_url, role, created_at',
        )
        .eq('id', userId)
        .maybeSingle()
    }

    if (res.error) return null

    const data = res.data as Profile | null
    // Si la note est l'ancienne valeur par défaut 3.0 ou 0, la réinitialiser à null (Note : Néant)
    if (data && (Number(data.rating) === 3.0 || Number(data.rating) === 3)) {
      data.rating = null
      void Promise.resolve(
        supabase.from(T.profiles).update({ rating: null }).eq('id', userId),
      ).catch(() => null)
    }

    return data
  } catch (e) {
    console.warn('Supabase fetchProfile error (hôte inaccessible ou hors ligne):', e)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id
      if (!uid) {
        setProfile(null)
        return
      }
      setProfile(await fetchProfile(uid))
    } catch (e) {
      console.warn('Supabase getUser error:', e)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let mounted = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return
        setSession(data?.session ?? null)
        if (data?.session?.user) {
          setProfile(await fetchProfile(data.session.user.id))
          void import('@/lib/push').then(({ registerForPushNotifications }) =>
            registerForPushNotifications(data.session!.user.id),
          )
        }
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Supabase getSession error (projet en pause ou hors ligne):', err?.message || err)
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, next) => {
      setSession(next)
      if (next?.user) {
        setProfile(await fetchProfile(next.user.id))
        void import('@/lib/push').then(({ registerForPushNotifications }) =>
          registerForPushNotifications(next.user.id),
        )
      } else setProfile(null)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const clean = email.trim().toLowerCase()
    if (isBoAliasEmail(clean)) {
      return { error: 'Compte backoffice — connecte-toi sur le web admin.' }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: clean,
      password,
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signUp = useCallback(
    async (params: {
      email: string
      password: string
      fullName: string
      pseudo: string
    }) => {
      if (!supabase) return { error: 'Supabase non configuré' }
      const email = params.email.trim().toLowerCase()
      const pseudo = params.pseudo
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
      if (isBoAliasEmail(email)) {
        return { error: 'Utilise un email personnel pour l’app joueur.' }
      }
      if (pseudo.length < 3) {
        return { error: 'Pseudo : 3 caractères minimum (lettres, chiffres, . _ -).' }
      }
      if (params.password.length < 6) {
        return { error: 'Mot de passe : 6 caractères minimum.' }
      }
      const fullName = params.fullName.trim()
      if (!fullName) return { error: 'Nom complet requis.' }

      const { data: taken } = await supabase
        .from(T.profiles)
        .select('id')
        .ilike('pseudo', pseudo)
        .maybeSingle()
      if (taken) return { error: 'Ce pseudo est déjà pris.' }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: params.password,
        options: {
          data: {
            full_name: fullName,
            first_name: fullName.split(' ')[0],
            pseudo,
          },
        },
      })
      if (error) return { error: error.message }

      if (data.user) {
        const row = {
          id: data.user.id,
          email,
          pseudo,
          full_name: fullName,
          first_name: fullName.split(' ')[0],
          skill_level: 'amateur',
          rating: null,
          is_available_to_play: false,
          role: 'player' as const,
        }
        const up = await supabase.from(T.profiles).upsert(row)
        if (up.error) {
          if (/pseudo|duplicate|unique/i.test(up.error.message)) {
            return { error: 'Ce pseudo est déjà pris.' }
          }
          if (up.error.code === 'PGRST205') {
            await supabase.from('profiles').upsert(row)
          } else if (/skill_level|rating|column/i.test(up.error.message)) {
            const { error: up2 } = await supabase.from(T.profiles).upsert({
              id: data.user.id,
              email,
              pseudo,
              full_name: fullName,
              first_name: fullName.split(' ')[0],
              role: 'player' as const,
            })
            if (up2) return { error: up2.message }
          } else {
            return { error: up.error.message }
          }
        }
        await markPermissionsPending()
      }
      return {}
    },
    [],
  )

  const setAvailableToPlay = useCallback(
    async (available: boolean): Promise<{ error?: string }> => {
      const currentUid = session?.user?.id
      if (!supabase || !currentUid) return { error: 'Non connecté' }
      setProfile((prev) => (prev ? { ...prev, is_available_to_play: available } : null))
      try {
        const { error } = await supabase
          .from(T.profiles)
          .update({ is_available_to_play: available })
          .eq('id', currentUid)
        if (error && !/is_available_to_play/i.test(error.message)) {
          return { error: error.message }
        }
        await refreshProfile()
        return {}
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Erreur réseau' }
      }
    },
    [session, refreshProfile],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setAvailableToPlay,
    }),
    [loading, session, profile, signIn, signUp, signOut, refreshProfile, setAvailableToPlay],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
