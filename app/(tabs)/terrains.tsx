import { useRouter } from 'expo-router'
import { Pressable, RefreshControl, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { MapPinned } from 'lucide-react-native'
import { Text, YStack, Button, XStack } from 'tamagui'
import { useCallback, useState } from 'react'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useTerrains } from '@/lib/data'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'

/** Tab Terrains — catalogue + demande de créneau. */
export default function TerrainsTabScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { terrains, loading, refresh } = useTerrains()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 52, paddingBottom: 28 }}
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
        <ScreenHeader title="Terrains" subtitle="Trouve & demande un créneau" />

        <Text
          marginTop={12}
          marginBottom={8}
          color={palette.textMuted}
          fontSize={13}
          style={{ ...fonts.regular }}
        >
          Demande ≠ réservé. Le gérant confirme, tu paies ensuite.
        </Text>

        {loading && terrains.length === 0 ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement…
          </Text>
        ) : terrains.length === 0 ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Aucun terrain — ajoute-en depuis l’app (manager) ou le backoffice.
          </Text>
        ) : (
          <YStack gap={12}>
            {terrains.map((t) => (
              <Pressable key={t.id} onPress={() => router.push(`/terrain/${t.id}`)}>
                <YStack
                  backgroundColor={palette.card}
                  borderRadius={16}
                  overflow="hidden"
                  borderWidth={1}
                  borderColor={palette.border}
                >
                  {t.image_url ? (
                    <Image
                      source={{ uri: t.image_url }}
                      style={{ width: '100%', height: 140 }}
                      contentFit="cover"
                    />
                  ) : (
                    <YStack
                      height={100}
                      backgroundColor={palette.primaryDark}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <MapPinned size={36} color={palette.primary} />
                    </YStack>
                  )}
                  <YStack padding="$3" gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1} paddingRight={8}>
                        <Text color={palette.text} style={{ ...fonts.semibold }}>
                          {t.name}
                        </Text>
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {[t.quartier, t.surface].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </YStack>
                      <Text color={palette.gold} fontFamily="$heading">
                        {formatFCFA(t.price_per_hour)}/h
                      </Text>
                    </XStack>
                    <Button
                      size="$3"
                      backgroundColor={palette.primary}
                      color="#fff"
                      borderRadius={10}
                      onPress={() => router.push(`/terrain/${t.id}`)}
                    >
                      Voir & demander
                    </Button>
                  </YStack>
                </YStack>
              </Pressable>
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  )
}
