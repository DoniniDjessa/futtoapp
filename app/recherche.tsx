import { useMemo, useState } from 'react'
import { useRouter, Stack } from 'expo-router'
import { Text, YStack, Input, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { usePlayers, useTerrains } from '@/lib/data'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA, toTokenColor } from '@/lib/theme'

export default function RechercheScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const [q, setQ] = useState('')
  const { terrains } = useTerrains()
  const { players } = usePlayers()

  const filteredTerrains = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return terrains.slice(0, 8)
    return terrains.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.zone ?? '').toLowerCase().includes(s) ||
        (t.quartier ?? '').toLowerCase().includes(s),
    )
  }, [q, terrains])

  const filteredJoueurs = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return players.slice(0, 8)
    return players.filter(
      (j) =>
        (j.full_name ?? '').toLowerCase().includes(s) ||
        (j.first_name ?? '').toLowerCase().includes(s) ||
        (j.position ?? '').toLowerCase().includes(s),
    )
  }, [q, players])

  return (
    <YStack flex={1} backgroundColor={palette.bg} padding="$4" gap="$3">
      <Stack.Screen
        options={{
          title: 'Recherche',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Terrain, joueur, quartier…"
        backgroundColor={palette.card}
        borderColor={palette.border}
        color={palette.text}
        placeholderTextColor={toTokenColor(palette.textMuted)}
        borderRadius={12}
      />

      <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.bold }}>
        TERRAINS
      </Text>
      {filteredTerrains.map((t) => (
        <XStack
          key={t.id}
          onPress={() => router.push(`/terrain/${t.id}`)}
          pressStyle={{ opacity: 0.85 }}
          paddingVertical="$2"
          justifyContent="space-between"
        >
          <YStack>
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              {t.name}
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              {t.zone ?? t.quartier ?? '—'} · {formatFCFA(t.price_per_hour)}/h
            </Text>
          </YStack>
        </XStack>
      ))}

      <Text color={palette.textMuted} fontSize={12} marginTop="$3" style={{ ...fonts.bold }}>
        JOUEURS
      </Text>
      {filteredJoueurs.map((j) => (
        <XStack
          key={j.id}
          onPress={() => router.push(`/joueurs/${j.id}`)}
          pressStyle={{ opacity: 0.85 }}
          paddingVertical="$2"
        >
          <YStack>
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              {j.full_name || j.first_name}
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              {j.position || '—'} · {j.city || 'Abidjan'}
            </Text>
          </YStack>
        </XStack>
      ))}
    </YStack>
  )
}
