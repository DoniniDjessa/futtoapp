import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  BarChart3,
  CalendarPlus,
  ChevronRight,
  MapPin,
  MessageSquare,
  Search,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { HomeMap } from '@/components/HomeMap'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SectionHeading } from '@/components/SectionHeading'
import { useThemeMode } from '@/lib/theme-mode'
import { fonts } from '@/lib/fonts'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { useMatches, usePlayers, useTerrains, useTournaments } from '@/lib/data'
import { useAuth } from '@/lib/auth'
import { isOpenOnFutto } from '@/lib/match-visibility'
import { useUserLocation, getTerrainDistanceKm, PROXIMITY_RADIUS_KM } from '@/lib/location'

const QUICK_GAP = 12
const QUICK_PAD = 20
const QUICK_COLS = 4
const quickItemWidth =
  (Dimensions.get('window').width - QUICK_PAD * 2 - QUICK_GAP * (QUICK_COLS - 1)) /
  QUICK_COLS

const quickActions = [
  { href: '/reserver', label: 'Réserver', Icon: MapPin },
  { href: '/creer', label: 'Créer', Icon: CalendarPlus },
  { href: '/joueurs', label: 'Joueurs', Icon: Users },
  { href: '/(tabs)/tournois', label: 'Tournois', Icon: Trophy },
  { href: '/classement', label: 'Classement', Icon: BarChart3 },
  { href: '/marketplace', label: 'Boutique', Icon: ShoppingBag },
  { href: '/stats', label: 'Stats', Icon: BarChart3 },
  { href: '/messages', label: 'Messages', Icon: MessageSquare },
] as const

function useCountdown(iso: string | null | undefined) {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (!iso) {
      setLabel('—')
      return
    }
    const tick = () => {
      const diff = new Date(iso).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('C’est l’heure')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      if (h >= 24) {
        const d = Math.floor(h / 24)
        setLabel(`${d} j ${h % 24} h`)
      } else {
        setLabel(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
            .toString()
            .padStart(2, '0')}`,
        )
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [iso])

  return label
}

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function AccueilScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { profile, setAvailableToPlay } = useAuth()
  const { coords } = useUserLocation()
  const { terrains, refresh: refreshTerrains } = useTerrains()
  const { matches, refresh: refreshMatches } = useMatches()
  const { players, refresh: refreshPlayers } = usePlayers(true)
  const { tournaments, refresh: refreshTournaments } = useTournaments()
  const [refreshing, setRefreshing] = useState(false)

  // Terrains classés par proximité réelle (diamètre de ~5 km / rayon de 2.5 km)
  const nearbyTerrains = useMemo(() => {
    return terrains
      .map((t) => ({
        ...t,
        calculatedDist: getTerrainDistanceKm(t, coords),
      }))
      .filter((t) => t.calculatedDist <= PROXIMITY_RADIUS_KM)
      .sort((a, b) => a.calculatedDist - b.calculatedDist)
      .slice(0, 5)
  }, [terrains, coords])

  const nextMatch = useMemo(() => {
    const now = Date.now()
    const upcoming = matches
      .filter(
        (m) =>
          m.kickoff_at &&
          new Date(m.kickoff_at).getTime() > now &&
          m.status !== 'cancelled' &&
          m.status !== 'played',
      )
      .sort((a, b) => new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime())
    return upcoming[0] ?? null
  }, [matches])

  const countdown = useCountdown(nextMatch?.kickoff_at)
  const publicMatches = useMemo(() => {
    const now = Date.now()
    return matches
      .filter(
        (m) =>
          isOpenOnFutto(m.visibility) &&
          m.kickoff_at &&
          new Date(m.kickoff_at).getTime() > now &&
          m.status !== 'cancelled' &&
          m.status !== 'played',
      )
      .sort((a, b) => new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime())
      .slice(0, 5)
  }, [matches])
  const [pageScroll, setPageScroll] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setPageScroll(true)
      return () => setPageScroll(true)
    }, []),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refreshTerrains(),
        refreshMatches(),
        refreshPlayers(),
        refreshTournaments(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refreshTerrains, refreshMatches, refreshPlayers, refreshTournaments])

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <ScrollView
        scrollEnabled={pageScroll}
        nestedScrollEnabled
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 28 }}
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
        <ScreenHeader home />

        <Pressable onPress={() => router.push('/recherche')}>
          <XStack
            marginTop={16}
            alignItems="center"
            gap={10}
            borderRadius={999}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.card}
            paddingHorizontal={16}
            paddingVertical={14}
          >
            <Search size={16} color={palette.textMuted} />
            <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.medium }}>
              Rechercher un terrain, un joueur...
            </Text>
          </XStack>
        </Pressable>

        <YStack marginTop={20}>
          <HomeMap
            terrains={terrains}
            onMapGesture={(active) => setPageScroll(!active)}
          />
        </YStack>

        <YStack marginTop={20}>
          <XStack flexWrap="wrap" gap={QUICK_GAP}>
            {quickActions.map(({ href, label, Icon }) => (
              <Pressable
                key={href}
                onPress={() => router.push(href as '/reserver')}
                style={{ width: quickItemWidth }}
              >
                <YStack
                  alignItems="center"
                  gap={8}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  backgroundColor={palette.card}
                  paddingVertical={12}
                >
                  <Icon size={20} color={palette.primary} />
                  <Text fontSize={11} color={palette.text} style={{ ...fonts.medium }}>
                    {label}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {nextMatch ? (
          <YStack
            marginTop={24}
            borderRadius={16}
            borderWidth={1}
            borderColor={`${palette.primary}4D`}
            overflow="hidden"
            style={{
              backgroundColor:
                mode === 'dark' ? 'rgba(6, 104, 56, 0.35)' : 'rgba(0, 177, 79, 0.12)',
            }}
            padding={16}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <YStack
                backgroundColor={`${palette.primary}33`}
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={999}
              >
                <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                  Prochain match
                </Text>
              </YStack>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                {nextMatch.kickoff_at
                  ? new Date(nextMatch.kickoff_at).toLocaleString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : '—'}
              </Text>
            </XStack>
            <Text
              marginTop={8}
              color={palette.text}
              fontFamily="$heading"
              fontSize={20}
            >
              {nextMatch.title}
            </Text>
            <Text color={palette.textMuted} fontSize={13} marginTop={4} style={{ ...fonts.regular }}>
              {nextMatch.terrain_label ?? 'Terrain'}
              {nextMatch.kickoff_at
                ? ` · ${new Date(nextMatch.kickoff_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
              {` · ${nextMatch.format ?? '5v5'}`}
            </Text>
            <Text color={palette.gold} fontFamily="$heading" fontSize={16} marginTop={6}>
              {countdown}
            </Text>
            <XStack justifyContent="space-between" alignItems="center" marginTop={12}>
              <Text color={palette.primary} fontSize={13} style={{ ...fonts.semibold }}>
                {nextMatch.spots_taken}/{nextMatch.spots_total} joueurs
              </Text>
              <Button
                size="$3"
                backgroundColor={palette.primary}
                color="#fff"
                borderRadius={999}
                paddingHorizontal={18}
                onPress={() => router.push(`/match/${nextMatch.id}`)}
              >
                Voir
              </Button>
            </XStack>
          </YStack>
        ) : (
          <YStack
            marginTop={24}
            borderRadius={16}
            borderWidth={1}
            borderColor={`${palette.primary}4D`}
            backgroundColor={mode === 'dark' ? 'rgba(6, 104, 56, 0.35)' : 'rgba(0, 177, 79, 0.12)'}
            padding={16}
          >
            <Text color={palette.textMuted} style={{ ...fonts.medium }}>
              Aucun match pour l’instant — crée le premier.
            </Text>
            <Button
              marginTop="$3"
              size="$3"
              backgroundColor={palette.primary}
              color="#fff"
              borderRadius={999}
              onPress={() => router.push('/creer')}
            >
              Créer un match
            </Button>
          </YStack>
        )}

        <SectionHeading marginTop={28} onAll={() => router.push('/reserver')}>
          Terrains à proximité
        </SectionHeading>
        <YStack gap={10}>
          {nearbyTerrains.length === 0 ? (
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Aucun terrain trouvé à proximité immédiate (&lt; 2.5 km).
            </Text>
          ) : (
            nearbyTerrains.map((t) => (
              <Pressable key={t.id} onPress={() => router.push(`/terrain/${t.id}`)}>
                <XStack
                  gap={12}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  backgroundColor="#0d0d0d"
                  padding={12}
                  alignItems="center"
                >
                  <YStack
                    width={72}
                    height={72}
                    borderRadius={12}
                    backgroundColor={palette.primaryDark}
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                  >
                    {t.image_url ? (
                      <Image
                        source={{ uri: t.image_url }}
                        style={{ width: 72, height: 72 }}
                        contentFit="cover"
                      />
                    ) : (
                      <MapPin size={28} color={palette.primary} />
                    )}
                  </YStack>
                  <YStack flex={1} gap={2}>
                    <Text color="#fff" style={{ ...fonts.semibold }} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text color="#9ca3af" fontSize={12} style={{ ...fonts.regular }}>
                      {[
                        t.zone ?? t.quartier,
                        t.calculatedDist < 999 ? `${t.calculatedDist} km` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                    <Text color={palette.accent} fontFamily="$heading" fontSize={14}>
                      {formatFCFA(t.price_per_hour)}
                      <Text color="#9ca3af" fontSize={11} fontFamily="$body">
                        {' '}
                        / h
                      </Text>
                    </Text>
                  </YStack>
                  <ChevronRight size={20} color="#9ca3af" />
                </XStack>
              </Pressable>
            ))
          )}
        </YStack>

        <SectionHeading marginTop={28} onAll={() => router.push('/(tabs)/matchs')}>
          Matchs du moment
        </SectionHeading>
        <YStack gap={8}>
          {publicMatches.length === 0 ? (
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Pas encore de match public.
            </Text>
          ) : (
            publicMatches.map((m) => (
              <Pressable key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
                <YStack
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  backgroundColor={palette.card}
                  padding={12}
                  gap={4}
                >
                  <Text color={palette.text} style={{ ...fonts.semibold }}>
                    {m.title}
                  </Text>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                    {m.kickoff_at
                      ? `${new Date(m.kickoff_at).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })} · ${new Date(m.kickoff_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} · `
                      : ''}
                    {m.format ?? '5v5'} · {m.spots_taken}/{m.spots_total}
                  </Text>
                </YStack>
              </Pressable>
            ))
          )}
        </YStack>

        <SectionHeading marginTop={28} onAll={() => router.push('/joueurs')}>
          Joueurs disponibles
        </SectionHeading>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
        >
          {players.length === 0 ? (
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Aucun joueur inscrit pour l’instant.
            </Text>
          ) : (
            players.slice(0, 12).map((p) => {
              const name = p.full_name || p.first_name || p.pseudo || 'Joueur'
              return (
                <Pressable key={p.id} onPress={() => router.push(`/joueurs/${p.id}`)}>
                  <YStack
                    width={144}
                    borderRadius={16}
                    borderWidth={1}
                    borderColor={palette.border}
                    backgroundColor={palette.card}
                    overflow="hidden"
                  >
                    <YStack
                      height={96}
                      backgroundColor={palette.primaryDark}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {p.avatar_url ? (
                        <Image
                          source={{ uri: p.avatar_url }}
                          style={{ width: '100%', height: 96 }}
                          contentFit="cover"
                        />
                      ) : (
                        <Avatar
                          initials={initials(name)}
                          color={palette.primary}
                          size={56}
                        />
                      )}
                    </YStack>
                    <YStack padding={8} gap={2}>
                      <Text
                        color={palette.text}
                        fontSize={12}
                        numberOfLines={1}
                        style={{ ...fonts.semibold }}
                      >
                        {name.split(' ')[0]}
                      </Text>
                      <Text
                        color={palette.accent}
                        fontSize={11}
                        numberOfLines={1}
                        style={{ ...fonts.semibold }}
                      >
                        {p.position || p.city || 'Joueur FUTTO'}
                      </Text>
                    </YStack>
                  </YStack>
                </Pressable>
              )
            })
          )}
        </ScrollView>

        <SectionHeading marginTop={28} onAll={() => router.push('/(tabs)/tournois')}>
          Tournois
        </SectionHeading>
        <YStack gap={8} marginBottom={8}>
          {tournaments.length === 0 ? (
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Aucun tournoi publié.
            </Text>
          ) : (
            tournaments.slice(0, 4).map((t) => (
              <Pressable key={t.id} onPress={() => router.push('/(tabs)/tournois')}>
                <YStack
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  backgroundColor={palette.card}
                  padding={12}
                  gap={4}
                >
                  <Text color={palette.text} fontFamily="$heading" fontSize={20}>
                    {t.name}
                  </Text>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                    {t.date_label ?? '—'} · {t.teams}/{t.teams_max} équipes
                  </Text>
                </YStack>
              </Pressable>
            ))
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

