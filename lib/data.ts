import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import type { MatchRow, Profile, Terrain } from '@/lib/types'

export type TournamentRow = {
  id: string
  name: string
  date_label: string | null
  location: string | null
  teams: number
  teams_max: number
  fee_fcfa: number
  prize: string | null
  status: string
  poster_url: string | null
}

export type NotificationRow = {
  id: string
  title: string
  body: string | null
  kind: string
  data?: any
  read_at?: string | null
  created_at: string
}

export function useTerrains() {
  const [terrains, setTerrains] = useState<Terrain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setTerrains([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from(T.terrains)
        .select('*')
        .order('created_at', { ascending: false })
      if (err) setError(err.message)
      else {
        setError(null)
        setTerrains((data as Terrain[]) ?? [])
      }
    } catch (e) {
      console.warn('Supabase useTerrains error:', e)
      setError('Hôte Supabase inaccessible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { terrains, loading, error, refresh }
}

export function useMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Best-effort : annule les matchs périmés (min non atteint / non payé)
      void Promise.resolve(supabase.rpc('futto_cancel_stale_matches')).catch(() => null)

      let list: MatchRow[] = []
      // 1. Essai de sélection avec profil hôte
      const { data: joinData, error: joinError } = await supabase
        .from(T.matches)
        .select('*, host:futto_profiles(id, full_name, first_name, pseudo, avatar_url, rating, position)')
        .order('kickoff_at', { ascending: true })

      if (!joinError && joinData) {
        list = joinData as unknown as MatchRow[]
      } else {
        const { data: rawData } = await supabase
          .from(T.matches)
          .select('*')
          .order('kickoff_at', { ascending: true })
        list = (rawData as MatchRow[]) ?? []
      }

      // Si les profils hôtes ne sont pas peuplés par la jointure, on les enrichit
      if (list.length > 0 && !list[0].host) {
        const hostIds = Array.from(new Set(list.map((m) => m.host_id).filter(Boolean)))
        if (hostIds.length > 0) {
          const { data: hostProfiles } = await supabase
            .from(T.profiles)
            .select('id, full_name, first_name, pseudo, avatar_url, rating, position')
            .in('id', hostIds)
          const hostMap = new Map((hostProfiles || []).map((h: any) => [h.id, h]))
          list = list.map((m) => ({
            ...m,
            host: hostMap.get(m.host_id) || null,
          }))
        }
      }

      setMatches(list)
    } catch (e) {
      console.warn('Supabase useMatches error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { matches, loading, refresh }
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setTournaments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let { data } = await supabase
        .from(T.tournaments)
        .select('*')
        .order('created_at', { ascending: false })


      setTournaments((data as TournamentRow[]) ?? [])
    } catch (e) {
      console.warn('Supabase useTournaments error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tournaments, loading, refresh }
}

export function usePlayers(onlyAvailable: boolean = true) {
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setPlayers([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase
        .from(T.profiles)
        .select('*')
        .eq('role', 'player')

      if (onlyAvailable) {
        query = query.eq('is_available_to_play', true)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(40)

      if (error && /is_available_to_play/i.test(error.message)) {
        const { data: fallbackData } = await supabase
          .from(T.profiles)
          .select('*')
          .eq('role', 'player')
          .order('created_at', { ascending: false })
          .limit(40)
        setPlayers((fallbackData as Profile[]) ?? [])
      } else {
        setPlayers((data as Profile[]) ?? [])
      }
    } catch (e) {
      console.warn('Supabase usePlayers error:', e)
    } finally {
      setLoading(false)
    }
  }, [onlyAvailable])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { players, loading, refresh }
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from(T.notifications)
      .select('id, title, body, kind, data, read_at, created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)
    setItems((data as NotificationRow[]) ?? [])
    setLoading(false)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from(T.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', user.id)
      .is('read_at', null)
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    )
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    if (!supabase) return
    await supabase
      .from(T.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    )
  }, [])

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  useEffect(() => {
    void refresh()

    if (!supabase) return

    // Use getSession (sync-compatible) to avoid building .on() after .subscribe() is called
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user || !supabase) return
      const userId = session.user.id

      // Build the full chain before calling subscribe()
      channel = supabase
        .channel(`user-notifs-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'futto_notifications',
            filter: `profile_id=eq.${userId}`,
          },
          () => {
            void refresh()
          },
        )
        .subscribe()
    }).catch(() => { /* ignore offline errors */ })

    return () => {
      cancelled = true
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => undefined)
        channel = null
      }
    }
  }, [refresh])

  return { items, loading, refresh, markAllAsRead, markAsRead, unreadCount }
}

export function useSessionProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }
    void client.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id
      if (!uid) {
        setProfile(null)
        setLoading(false)
        return
      }
      const { data: row } = await client
        .from(T.profiles)
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      setProfile((row as Profile) ?? null)
      setLoading(false)
    })
  }, [])

  return { profile, loading }
}

export type Team = { id: string; name: string }
export type TeamMember = { id: string; display_name: string; phone: string | null }

export function useMyTeam() {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setTeam(null)
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: t } = await supabase
      .from(T.teams)
      .select('id, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setTeam((t as Team) ?? null)

    if (t?.id) {
      const { data: m } = await supabase
        .from(T.teamMembers)
        .select('id, display_name, phone')
        .eq('team_id', t.id)
        .order('created_at', { ascending: true })
      setMembers((m as TeamMember[]) ?? [])
    } else {
      setMembers([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { team, members, loading, refresh }
}
