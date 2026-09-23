import { useCallback, useEffect, useState } from 'react'
import { Pressable } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Text, YStack, XStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

type RankRow = {
  id: string
  full_name: string | null
  first_name: string | null
  city: string | null
  avatar_url: string | null
  played: number
}

/** Classement = matchs honorés (status played + joueur joined). */
export default function ClassementScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const [rows, setRows] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data: playedMatches } = await supabase
      .from(T.matches)
      .select('id')
      .eq('status', 'played')
    const ids = (playedMatches ?? []).map((m) => m.id)
    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const { data: mp } = await supabase
      .from(T.matchPlayers)
      .select('profile_id')
      .in('match_id', ids)
      .eq('status', 'joined')
      .not('profile_id', 'is', null)

    const counts = new Map<string, number>()
    for (const row of mp ?? []) {
      const pid = row.profile_id as string
      counts.set(pid, (counts.get(pid) ?? 0) + 1)
    }
    const profileIds = [...counts.keys()]
    if (profileIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const { data: profiles } = await supabase
      .from(T.profiles)
      .select('id, full_name, first_name, city, avatar_url')
      .in('id', profileIds)

    const ranked =
      (profiles as Omit<RankRow, 'played'>[] | null)?.map((p) => ({
        ...p,
        played: counts.get(p.id) ?? 0,
      })) ?? []
    ranked.sort((a, b) => b.played - a.played)
    setRows(ranked)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <YStack flex={1} backgroundColor={palette.bg} padding="$4" gap="$3">
      <Stack.Screen
        options={{
          title: 'Classement',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement…
          </Text>
        </YStack>
      ) : rows.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color={palette.textMuted} fontSize={15} textAlign="center" style={{ ...fonts.medium }}>
            Aucune donnée pour l'instant
          </Text>
        </YStack>
      ) : (
        <>
          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
            Classement par matchs honorés (joués), pas par date d'inscription.
          </Text>
          {rows.map((j, i) => {
            const isMe = j.id === user?.id
            const displayName = j.full_name || j.first_name || 'Joueur'
            return (
              <XStack
                key={j.id}
                alignItems="center"
                gap="$3"
                paddingVertical="$2"
                borderBottomWidth={1}
                borderBottomColor={palette.border}
              >
                <Text color={palette.gold} fontFamily="$heading" width={28} fontSize={16}>
                  {i + 1}
                </Text>
                <Pressable
                  onPress={() => {
                    if (j.avatar_url) {
                      setViewerImage({ url: j.avatar_url, title: displayName })
                    } else {
                      router.push(isMe ? '/profil' : (`/joueurs/${j.id}` as any))
                    }
                  }}
                >
                  <Avatar
                    initials={initials(displayName)}
                    color={palette.primary}
                    size={38}
                    uri={j.avatar_url}
                  />
                </Pressable>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => router.push(isMe ? '/profil' : (`/joueurs/${j.id}` as any))}
                >
                  <YStack flex={1}>
                    <Text color={palette.text} style={{ ...fonts.semibold }}>
                      {displayName} {isMe ? '(Vous)' : ''}
                    </Text>
                    <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                      {j.city || 'Abidjan'}
                    </Text>
                  </YStack>
                </Pressable>
                <Text color={palette.primary} style={{ ...fonts.bold }} fontSize={16}>
                  {j.played} m.
                </Text>
              </XStack>
            )
          })}
        </>
      )}

      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url ?? null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </YStack>
  )
}
