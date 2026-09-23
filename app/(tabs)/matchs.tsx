import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Check, Clock, Crown, Lock, Mail, MapPin, Users } from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useAppDialog } from '@/components/AppDialog'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useMatches } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { colors, formatFCFA, lightColors, toColor, withAlpha } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import type { MatchRow } from '@/lib/types'

const filters = ['Tous', 'Amical', 'Public', 'Privé'] as const
type FilterType = (typeof filters)[number]

type DisplayMatch = {
  id: string
  title: string
  type: 'Amical' | 'Public' | 'Privé' | 'Tournoi'
  terrain: string
  zone: string
  date: string
  time: string
  format: string
  spotsTaken: number
  spotsTotal: number
  price: number
  host: string
  hostId: string
  visibility: 'private' | 'public' | 'both'
  isDb?: boolean
}

function mapDbMatch(m: MatchRow): DisplayMatch {
  let type: DisplayMatch['type'] = 'Amical'
  if (m.visibility === 'private' || m.title.toLowerCase().startsWith('privé')) {
    type = 'Privé'
  } else if (m.visibility === 'public') {
    type = 'Public'
  }
  if (m.title.toLowerCase().includes('tournoi')) type = 'Tournoi'

  let dateStr = 'Bientôt'
  let timeStr = '18:00'
  if (m.kickoff_at) {
    const d = new Date(m.kickoff_at)
    dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatStr = m.format ? m.format.replace('v', ' contre ') : '5 contre 5'

  const hostName =
    m.host?.pseudo ? `@${m.host.pseudo}` :
    m.host?.full_name ||
    m.host?.first_name ||
    'Organisateur'

  return {
    id: m.id,
    title: m.title,
    type,
    terrain: m.terrain_label || m.zone || 'Terrain FUTTO',
    zone: m.zone || 'Abidjan',
    date: dateStr,
    time: timeStr,
    format: formatStr,
    spotsTaken: m.spots_taken ?? 0,
    spotsTotal: m.spots_total || 10,
    price: m.price_participation ?? 0,
    host: hostName,
    hostId: m.host_id,
    visibility: m.visibility,
    isDb: true,
  }
}

export default function MatchsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const dialog = useAppDialog()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { matches: dbMatches, loading, refresh } = useMatches()
  const [filter, setFilter] = useState<FilterType>('Tous')
  const [myMemberships, setMyMemberships] = useState<Record<string, 'invited' | 'joined' | 'left'>>({})
  const [refreshing, setRefreshing] = useState(false)

  // Load user's memberships from Supabase (including 'invited' and 'joined')
  const loadMemberships = useCallback(async () => {
    if (!supabase || !user) {
      setMyMemberships({})
      return
    }
    const { data } = await supabase
      .from(T.matchPlayers)
      .select('match_id, status')
      .eq('profile_id', user.id)
    if (data) {
      const map: Record<string, 'invited' | 'joined' | 'left'> = {}
      for (const row of data) {
        if (row.match_id && row.status) {
          map[row.match_id] = row.status as 'invited' | 'joined' | 'left'
        }
      }
      setMyMemberships(map)
    }
  }, [user])

  useEffect(() => {
    void loadMemberships()
  }, [loadMemberships])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refresh(), loadMemberships()])
    } finally {
      setRefreshing(false)
    }
  }, [refresh, loadMemberships])

  // Flux de données réel depuis Supabase (matchs à venir uniquement)
  const allMatches = useMemo(() => {
    const now = Date.now()
    return (dbMatches || [])
      .filter(
        (m) =>
          m.status !== 'cancelled' &&
          m.status !== 'played' &&
          Boolean(m.kickoff_at && new Date(m.kickoff_at).getTime() > now),
      )
      .map(mapDbMatch)
  }, [dbMatches])

  // RÈGLE CRITIQUE : Dans l'onglet et dans toute l'app, un match privé créé par un autre utilisateur
  // n'est visible que si cet utilisateur t'a envoyé une invitation ou si tu es l'hôte.
  const visibleMatches = useMemo(() => {
    return allMatches.filter((m) => {
      const isPrivate = m.visibility === 'private' || m.type === 'Privé'
      if (!isPrivate) return true
      if (!user) return false
      // Hôte du match : voit toujours son match privé
      if (m.hostId === user.id) return true
      // Joueur ayant reçu une invitation ou ayant déjà rejoint
      const status = myMemberships[m.id]
      return status === 'invited' || status === 'joined'
    })
  }, [allMatches, user, myMemberships])

  const filteredList = useMemo(() => {
    if (filter === 'Tous') return visibleMatches
    if (filter === 'Privé') {
      return visibleMatches.filter((m) => m.type === 'Privé' || m.visibility === 'private')
    }
    return visibleMatches.filter((m) => m.type === filter)
  }, [visibleMatches, filter])

  async function toggleJoin(m: DisplayMatch) {
    if (!supabase || !user) {
      router.push('/login')
      return
    }
    const sb = supabase
    const status = myMemberships[m.id]
    const isJoined = status === 'joined'

    if (isJoined) {
      dialog.showDialog({
        title: 'Quitter ce match ?',
        message: `Souhaites-tu te retirer du match « ${m.title} » ? Ta place sera libérée pour d'autres joueurs.`,
confirmText: 'Quitter le match',
          onConfirm: async () => {
            setMyMemberships((prev) => ({ ...prev, [m.id]: 'left' }))
            try {
              await sb
              .from(T.matchPlayers)
              .update({ status: 'left' })
              .eq('match_id', m.id)
              .eq('profile_id', user.id)
            void refresh()
            void loadMemberships()
          } catch (e) {
            console.warn('Erreur lors du départ du match:', e)
          }
        },
        cancelText: 'Annuler',
      })
    } else {
      try {
        const { error } = await supabase.rpc('futto_join_match', { p_match_id: m.id })
        if (error) {
          await supabase.from(T.matchPlayers).upsert({
            match_id: m.id,
            profile_id: user.id,
            status: 'joined',
          })
        }
        setMyMemberships((prev) => ({ ...prev, [m.id]: 'joined' }))
        dialog.showDialog({
          title: 'Bienvenue dans le match !',
          message: `Tu as rejoint « ${m.title} ». Retrouve la compo et toutes les infos sur la fiche du match.`,
          confirmText: 'Voir le match',
          onConfirm: () => router.push(`/match/${m.id}`),
          cancelText: 'Fermer',
        })
        void refresh()
        void loadMemberships()
      } catch (e) {
        console.warn('Erreur pour rejoindre le match:', e)
      }
    }
  }

  async function acceptInvite(m: DisplayMatch) {
    if (!supabase || !user) {
      router.push('/login')
      return
    }
    try {
      const { error } = await supabase.rpc('futto_join_match', { p_match_id: m.id })
      if (error) {
        await supabase
          .from(T.matchPlayers)
          .update({ status: 'joined' })
          .eq('match_id', m.id)
          .eq('profile_id', user.id)
      }
      setMyMemberships((prev) => ({ ...prev, [m.id]: 'joined' }))
      dialog.showDialog({
        title: 'Invitation acceptée !',
        message: `Tu participes maintenant au match « ${m.title} ».`,
        confirmText: 'Voir la compo',
        onConfirm: () => router.push(`/match/${m.id}`),
        cancelText: 'Fermer',
      })
      void refresh()
      void loadMemberships()
    } catch (e: any) {
      dialog.showDialog({
        title: 'Erreur',
        message: e?.message || "Impossible d'accepter l'invitation pour le moment.",
        confirmText: 'OK',
      })
    }
  }

  async function declineInvite(m: DisplayMatch) {
    if (!supabase || !user) return
    const sb = supabase
    dialog.showDialog({
      title: 'Décliner l’invitation ?',
      message: `Es-tu sûr de vouloir refuser l’invitation pour « ${m.title} » ?`,
      confirmText: 'Décliner',
      onConfirm: async () => {
        setMyMemberships((prev) => ({ ...prev, [m.id]: 'left' }))
        try {
          await sb
            .from(T.matchPlayers)
            .update({ status: 'left' })
            .eq('match_id', m.id)
            .eq('profile_id', user.id)
          void refresh()
          void loadMemberships()
        } catch (e) {
          console.warn('Erreur pour décliner:', e)
        }
      },
      cancelText: 'Annuler',
    })
  }

  function getTypeBadge(type: DisplayMatch['type']) {
    let bg = withAlpha(palette.primary)
    let color = toColor(palette.primary)
    if (type === 'Public') {
      bg = withAlpha(palette.accent)
      color = toColor(palette.accent)
    } else if (type === 'Tournoi') {
      bg = withAlpha(palette.gold)
      color = toColor(palette.gold)
    } else if (type === 'Privé') {
      bg = withAlpha(palette.primary)
      color = toColor(palette.primary)
    }
    return (
      <YStack
        paddingHorizontal={10}
        paddingVertical={4}
        borderRadius={999}
        backgroundColor={bg}
        alignSelf="flex-start"
      >
        <Text color={color} fontSize={11} style={{ ...fonts.bold }}>
          {type}
        </Text>
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg} paddingTop={52}>
      {/* Header aligned with futto demo */}
      <YStack paddingHorizontal={20} marginBottom={14}>
        <ScreenHeader
          title="Rejoindre un match"
          subtitle="Aucun ami dispo ? Rejoins une partie ouverte"
          right={
            <Pressable
              onPress={() => router.push('/creer')}
              style={{
                borderRadius: 999,
                backgroundColor: palette.primary,
                paddingHorizontal: 16,
                paddingVertical: 9,
                shadowColor: palette.primary,
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                + Créer
              </Text>
            </Pressable>
          }
        />
      </YStack>

      {/* Horizontal filter pills */}
      <YStack marginBottom={14}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {filters.map((f) => {
            const active = f === filter
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? palette.primary : palette.card,
                  borderWidth: 1,
                  borderColor: active ? palette.primary : palette.border,
                }}
              >
                <Text
                  color={active ? '#fff' : palette.textMuted}
                  fontSize={13}
                  style={{ ...(active ? fonts.bold : fonts.medium) }}
                >
                  {f}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </YStack>

      {/* Match cards list */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {filteredList.length === 0 ? (
          filter === 'Privé' ? (
            /* UI dédiée pour l'onglet Privé quand il n'y a aucun match privé accessible */
            <YStack
              alignItems="center"
              justifyContent="center"
              paddingVertical={36}
              paddingHorizontal={24}
              backgroundColor={palette.card}
              borderRadius={24}
              borderWidth={1}
              borderColor={palette.border}
              gap={14}
              marginTop={12}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${palette.primary}18`,
                  borderWidth: 1.5,
                  borderColor: `${palette.primary}33`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={28} color={palette.primary} />
              </View>
              <YStack alignItems="center" gap={6}>
                <Text
                  fontFamily="$heading"
                  fontSize={18}
                  color={palette.text}
                  textAlign="center"
                  style={{ ...fonts.bold }}
                >
                  Aucun match privé
                </Text>
                <Text
                  color={palette.textMuted}
                  fontSize={13}
                  textAlign="center"
                  lineHeight={19}
                  style={{ ...fonts.regular, maxWidth: 300 }}
                >
                  Les matchs privés sont réservés à des cercles fermés. Tu ne peux voir un match privé que si l'organisateur t'a envoyé une invitation ou si tu en es l'hôte.
                </Text>
              </YStack>
              <Button
                marginTop={6}
                backgroundColor={palette.primary}
                borderRadius={999}
                height={44}
                paddingHorizontal={22}
                onPress={() => router.push('/creer')}
              >
                <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                  + Créer un match privé
                </Text>
              </Button>
            </YStack>
          ) : (
            <YStack
              alignItems="center"
              justifyContent="center"
              paddingVertical={44}
              paddingHorizontal={20}
              backgroundColor={palette.card}
              borderRadius={20}
              borderWidth={1}
              borderColor={palette.border}
              gap={12}
              marginTop={12}
            >
              <YStack
                width={56}
                height={56}
                borderRadius={28}
                backgroundColor={`${palette.primary}18`}
                alignItems="center"
                justifyContent="center"
              >
                <Users size={28} color={palette.primary} />
              </YStack>
              <Text
                fontFamily="$heading"
                fontSize={18}
                color={palette.text}
                textAlign="center"
                style={{ ...fonts.bold }}
              >
                {loading
                  ? 'Chargement des matchs...'
                  : filter === 'Tous'
                    ? 'Aucun match ouvert pour le moment'
                    : `Aucun match de type "${filter}"`}
              </Text>
              <Text
                color={palette.textMuted}
                fontSize={13}
                textAlign="center"
                style={{ ...fonts.regular, maxWidth: 280 }}
              >
                {loading
                  ? 'Connexion au serveur FUTTO en cours'
                  : 'Sois le premier à lancer une partie et invite des joueurs de ta zone !'}
              </Text>
              {!loading && (
                <Button
                  marginTop={8}
                  backgroundColor={palette.primary}
                  borderRadius={999}
                  height={44}
                  paddingHorizontal={22}
                  onPress={() => router.push('/creer')}
                >
                  <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                    + Créer un match
                  </Text>
                </Button>
              )}
            </YStack>
          )
        ) : (
          filteredList.map((m) => {
            const myStatus = myMemberships[m.id]
            const isJoined = myStatus === 'joined'
            const isInvited = myStatus === 'invited'
            const isHost = Boolean(user && m.hostId === user.id)
            const isPrivate = m.type === 'Privé' || m.visibility === 'private'
            const full = m.spotsTaken >= m.spotsTotal
            const pct = Math.min(100, Math.round((m.spotsTaken / m.spotsTotal) * 100))

            return (
              <YStack
                key={m.id}
                backgroundColor={palette.card}
                borderRadius={20}
                padding={16}
                borderWidth={1}
                borderColor={isInvited ? palette.primary : palette.border}
                gap={12}
              >
                {/* Banner invitation reçue */}
                {isInvited && (
                  <XStack
                    backgroundColor={`${palette.primary}18`}
                    paddingHorizontal={12}
                    paddingVertical={8}
                    borderRadius={12}
                    alignItems="center"
                    gap={8}
                    borderWidth={1}
                    borderColor={`${palette.primary}33`}
                  >
                    <Mail size={15} color={palette.primary} />
                    <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }} flex={1}>
                      Invitation reçue · {m.host} t'a invité à ce match privé
                    </Text>
                  </XStack>
                )}

                {/* Banner hôte privé */}
                {isHost && isPrivate && (
                  <XStack
                    backgroundColor={`${palette.primary}10`}
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={10}
                    alignItems="center"
                    gap={8}
                  >
                    <Crown size={14} color={palette.primary} />
                    <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }} flex={1}>
                      Ton match privé · Visible par toi et tes invités
                    </Text>
                  </XStack>
                )}

                {/* Card top */}
                <XStack justifyContent="space-between" alignItems="flex-start" gap={8}>
                  <Pressable
                    onPress={() => router.push(`/match/${m.id}`)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <Text
                      fontFamily="$heading"
                      fontSize={19}
                      color={palette.text}
                      numberOfLines={1}
                      style={{ ...fonts.bold }}
                    >
                      {m.title}
                    </Text>
                    <Text
                      color={palette.textMuted}
                      fontSize={12}
                      marginTop={2}
                      style={{ ...fonts.regular }}
                    >
                      Organisé par {m.host}
                    </Text>
                  </Pressable>
                  {getTypeBadge(m.type)}
                </XStack>

                {/* 2x2 grid */}
                <XStack flexWrap="wrap" gap={8} marginTop={2}>
                  <XStack alignItems="center" gap={6} width="48%">
                    <MapPin size={15} color={palette.primary} />
                    <Text
                      color={palette.textMuted}
                      fontSize={12}
                      numberOfLines={1}
                      style={{ ...fonts.regular, flex: 1 }}
                    >
                      {m.terrain}
                    </Text>
                  </XStack>

                  <XStack alignItems="center" gap={6} width="48%">
                    <Clock size={15} color={palette.primary} />
                    <Text
                      color={palette.textMuted}
                      fontSize={12}
                      numberOfLines={1}
                      style={{ ...fonts.regular, flex: 1 }}
                    >
                      {m.date} · {m.time}
                    </Text>
                  </XStack>

                  <XStack alignItems="center" gap={6} width="48%">
                    <Users size={15} color={palette.primary} />
                    <Text
                      color={palette.textMuted}
                      fontSize={12}
                      numberOfLines={1}
                      style={{ ...fonts.regular, flex: 1 }}
                    >
                      {m.format}
                    </Text>
                  </XStack>

                  <XStack alignItems="center" gap={6} width="48%">
                    <Text
                      color={palette.accent}
                      fontSize={13}
                      numberOfLines={1}
                      style={{ ...fonts.bold }}
                    >
                      {m.price > 0 ? `${formatFCFA(m.price)} / joueur` : 'Gratuit'}
                    </Text>
                  </XStack>
                </XStack>

                {/* Spots & Progress bar */}
                <YStack marginTop={2} gap={6}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                      {m.spotsTaken}/{m.spotsTotal} joueurs
                    </Text>
                    {full && !isJoined && !isInvited ? (
                      <Text color="#ef4444" fontSize={12} style={{ ...fonts.bold }}>
                        Complet
                      </Text>
                    ) : null}
                  </XStack>
                  <YStack
                    height={6}
                    backgroundColor={palette.border}
                    borderRadius={999}
                    overflow="hidden"
                  >
                    <YStack
                      height="100%"
                      width={`${pct}%`}
                      backgroundColor={palette.primary}
                      borderRadius={999}
                    />
                  </YStack>
                </YStack>

                {/* Action button(s) */}
                {isHost ? (
                  <Button
                    borderRadius={999}
                    height={46}
                    marginTop={4}
                    backgroundColor={palette.cardElevated}
                    borderWidth={1}
                    borderColor={palette.primary}
                    onPress={() => router.push(`/match/${m.id}`)}
                  >
                    <XStack alignItems="center" gap={6}>
                      <Crown size={16} color={palette.primary} />
                      <Text color={palette.primary} style={{ ...fonts.bold }} fontSize={14}>
                        Gérer mon match
                      </Text>
                    </XStack>
                  </Button>
                ) : isInvited ? (
                  <YStack gap={8} marginTop={4}>
                    <Button
                      borderRadius={999}
                      height={46}
                      backgroundColor={palette.primary}
                      onPress={() => void acceptInvite(m)}
                    >
                      <XStack alignItems="center" gap={6}>
                        <Check size={16} color="#fff" />
                        <Text color="#fff" style={{ ...fonts.bold }} fontSize={14}>
                          Accepter l'invitation
                        </Text>
                      </XStack>
                    </Button>
                    <Pressable
                      hitSlop={8}
                      onPress={() => void declineInvite(m)}
                      style={{ alignSelf: 'center', paddingVertical: 4 }}
                    >
                      <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                        Décliner cette invitation
                      </Text>
                    </Pressable>
                  </YStack>
                ) : (
                  <Button
                    borderRadius={999}
                    height={46}
                    marginTop={4}
                    backgroundColor={
                      isJoined
                        ? `${palette.primary}22`
                        : full
                          ? palette.cardElevated
                          : palette.primary
                    }
                    borderWidth={isJoined ? 1 : 0}
                    borderColor={palette.primary}
                    disabled={full && !isJoined}
                    onPress={() => void toggleJoin(m)}
                  >
                    {isJoined ? (
                      <XStack alignItems="center" gap={6}>
                        <Check size={16} color={palette.primary} />
                        <Text color={palette.primary} style={{ ...fonts.bold }} fontSize={14}>
                          Tu as rejoint
                        </Text>
                      </XStack>
                    ) : full ? (
                      <Text color={palette.textMuted} style={{ ...fonts.medium }} fontSize={14}>
                        Complet
                      </Text>
                    ) : (
                      <Text color="#fff" style={{ ...fonts.bold }} fontSize={14}>
                        Rejoindre le match
                      </Text>
                    )}
                  </Button>
                )}

                {/* Details link */}
                <Pressable onPress={() => router.push(`/match/${m.id}`)}>
                  <Text
                    textAlign="center"
                    color={palette.textMuted}
                    fontSize={12}
                    style={{ ...fonts.semibold }}
                  >
                    Voir la compo & les détails
                  </Text>
                </Pressable>
              </YStack>
            )
          })
        )}
      </ScrollView>
    </YStack>
  )
}
