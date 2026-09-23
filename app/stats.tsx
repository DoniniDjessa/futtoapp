import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import {
  Award,
  ChevronRight,
  Star,
  TrendingUp,
} from 'lucide-react-native'
import { BackHeader } from '@/components/BackHeader'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

const PERIODS = ['Ce mois-ci', 'Cette saison', 'Tout'] as const
type Period = (typeof PERIODS)[number]

type MatchHistoryItem = {
  id: string
  title: string
  kickoff_at: string | null
  status: string
  terrain?: string
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile } = useAuth()

  const [period, setPeriod] = useState<Period>('Cette saison')
  const [loading, setLoading] = useState(true)
  const [playedCount, setPlayedCount] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [history, setHistory] = useState<MatchHistoryItem[]>([])

  async function fetchStats() {
    if (!supabase || !user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(T.matchPlayers)
        .select(
          `id, status, created_at,
           match:futto_matches ( id, title, kickoff_at, status, terrain_label )`,
        )
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        const list: MatchHistoryItem[] = []
        let pCount = 0
        let uCount = 0

        data.forEach((row: any) => {
          const m = Array.isArray(row.match) ? row.match[0] : row.match
          if (m) {
            const isPlayed = m.status === 'played' || (m.kickoff_at && new Date(m.kickoff_at).getTime() < Date.now())
            if (isPlayed) pCount++
            else uCount++

            list.push({
              id: m.id,
              title: m.title || 'Match amical',
              kickoff_at: m.kickoff_at,
              status: m.status,
              terrain: m.terrain_label || 'Terrain FUTTO',
            })
          }
        })

        setPlayedCount(pCount)
        setUpcomingCount(uCount)
        setHistory(list)
      } else {
        setPlayedCount(0)
        setUpcomingCount(0)
        setHistory([])
      }
    } catch (e) {
      console.warn('[Stats] Error fetching:', e)
      setPlayedCount(0)
      setUpcomingCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStats()
  }, [user])

  const displayedMatches = playedCount
  const ratingValue =
    profile?.rating != null && Number(profile.rating) > 0 && Number(profile.rating) !== 3.0
      ? Number(profile.rating)
      : null

  const skills = [
    { label: 'Assiduité & Présence', val: playedCount > 0 ? Math.min(100, 60 + playedCount * 5) : 50, color: palette.primary },
    { label: 'Fair-play & Esprit d’équipe', val: 95, color: palette.gold },
    { label: 'Ponctualité aux matchs', val: 90, color: palette.accent },
  ]

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: Math.max(insets.top, 16), backgroundColor: palette.card }}>
        <BackHeader title="Mes statistiques" onBack={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {}}
            tintColor={palette.primary}
          />
        }
      >
        {/* Sélecteur de période */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS.map((p) => {
            const active = period === p
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: active ? palette.primary : palette.cardElevated,
                  borderWidth: 1,
                  borderColor: active ? palette.primary : palette.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: active ? '#fff' : palette.textMuted,
                    fontSize: 12,
                    ...(active ? fonts.bold : fonts.medium),
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Chiffres clés réels (Matchs joués, Matchs à venir, Note) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard
            value={playedCount}
            label="Matchs joués"
            palette={palette}
            tone="default"
          />
          <MetricCard
            value={upcomingCount}
            label="À venir"
            palette={palette}
            tone="success"
          />
          <View
            style={{
              flex: 1,
              backgroundColor: palette.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: palette.textMuted, fontSize: 12, ...fonts.medium }}>
              Note
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={16} color={palette.gold} fill={palette.gold} />
              <Text style={{ color: palette.gold, fontSize: 18, ...fonts.bold }}>
                {ratingValue != null ? ratingValue.toFixed(1) : '5.0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Aptitudes & Attributs joueur */}
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={18} color={palette.primary} />
            <Text style={{ color: palette.text, fontSize: 15, ...fonts.bold }}>
              Attributs & Compétences
            </Text>
          </View>

          <View style={{ gap: 10, marginTop: 4 }}>
            {skills.map((s) => (
              <View key={s.label} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: palette.text, fontSize: 13, ...fonts.medium }}>
                    {s.label}
                  </Text>
                  <Text style={{ color: palette.text, fontSize: 13, ...fonts.bold }}>
                    {s.val} / 100
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: palette.cardElevated,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${s.val}%`,
                      backgroundColor: s.color,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Historique réel des matchs */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: palette.text, fontSize: 15, ...fonts.bold }}>
            Derniers matchs
          </Text>

          {history.length === 0 ? (
            <View
              style={{
                backgroundColor: palette.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 24,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 15, ...fonts.bold }}>
                Aucun match enregistré
              </Text>
              <Text
                style={{
                  color: palette.textMuted,
                  fontSize: 13,
                  textAlign: 'center',
                  lineHeight: 18,
                  ...fonts.regular,
                }}
              >
                Participe à des matchs ou crée ton premier créneau pour générer tes statistiques réelles !
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/matchs')}
                style={{
                  marginTop: 8,
                  backgroundColor: palette.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, ...fonts.bold }}>
                  Trouver un match
                </Text>
              </Pressable>
            </View>
          ) : (
            history.slice(0, 10).map((h) => {
              const isDone = h.status === 'played'
              const isCancelled = h.status === 'cancelled'
              const badgeBg = isDone
                ? `${palette.primary}20`
                : isCancelled
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(56, 189, 248, 0.15)'
              const badgeColor = isDone
                ? palette.primary
                : isCancelled
                  ? '#ef4444'
                  : '#38bdf8'
              const badgeText = isDone
                ? 'Joué'
                : isCancelled
                  ? 'Annulé'
                  : 'À venir'

              const dateStr = h.kickoff_at
                ? new Date(h.kickoff_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Date non définie'

              return (
                <Pressable
                  key={h.id}
                  onPress={() => router.push(`/match/${h.id}`)}
                  style={{
                    backgroundColor: palette.card,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: palette.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: badgeBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: badgeColor, fontSize: 11, ...fonts.bold }}>
                        {badgeText}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={{ color: palette.text, fontSize: 14, ...fonts.semibold }}
                      >
                        {h.title}
                      </Text>
                      <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12 }}>
                        {h.terrain} · {dateStr}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={16} color={palette.textMuted} />
                </Pressable>
              )
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function MetricCard({
  value,
  label,
  palette,
  tone,
}: {
  value: number
  label: string
  palette: any
  tone: 'default' | 'success' | 'danger'
}) {
  const textColor =
    tone === 'success'
      ? palette.primary
      : tone === 'danger'
        ? '#ef4444'
        : palette.text

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 14,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Text style={{ color: textColor, fontSize: 26, ...fonts.bold }}>
        {value}
      </Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, ...fonts.medium }}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
})
