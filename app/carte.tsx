import { Text, YStack, XStack, Button } from 'tamagui'
import { HomeMap } from '@/components/HomeMap'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { useTerrains } from '@/lib/data'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'

/** Carte hors tab bar — accessible depuis home / drawer / reserver. */
export default function CarteScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { terrains, loading } = useTerrains()
  const [pageScroll, setPageScroll] = useState(true)

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <ScrollView
        scrollEnabled={pageScroll}
        nestedScrollEnabled
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
      >
        <HomeMap
          height={340}
          terrains={terrains}
          onMapGesture={(active) => setPageScroll(!active)}
        />

        <Button
          size="$3"
          backgroundColor={palette.primary}
          color="#fff"
          borderRadius={10}
          onPress={() => router.push('/map-fullscreen')}
        >
          Carte plein écran
        </Button>

        <Button
          size="$3"
          backgroundColor={palette.cardElevated}
          borderWidth={1}
          borderColor={palette.border}
          color={palette.text}
          borderRadius={10}
          onPress={() => router.push('/reserver')}
        >
          Réserver un terrain
        </Button>

        {loading ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement…
          </Text>
        ) : terrains.length === 0 ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Aucun terrain — ajoute-en depuis le backoffice (Nos terrains).
          </Text>
        ) : (
          terrains.map((t) => (
            <XStack
              key={t.id}
              backgroundColor={palette.card}
              borderRadius={14}
              padding="$3"
              borderWidth={1}
              borderColor={palette.border}
              alignItems="center"
              justifyContent="space-between"
              onPress={() => router.push(`/terrain/${t.id}`)}
              pressStyle={{ opacity: 0.9 }}
            >
              <YStack flex={1}>
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  {t.name}
                </Text>
                <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                  {[t.quartier, t.zone, t.surface].filter(Boolean).join(' · ') || '—'}
                </Text>
              </YStack>
              <Text color={palette.gold} fontFamily="$heading">
                {formatFCFA(t.price_per_hour)}
              </Text>
            </XStack>
          ))
        )}
      </ScrollView>
    </YStack>
  )
}
