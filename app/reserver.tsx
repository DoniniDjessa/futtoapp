import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { ArrowLeft, CalendarDays, MapPin, Star } from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useTerrains } from '@/lib/data'
import { canAddTerrains } from '@/lib/types'
import { colors, formatFCFA, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { useUserLocation, getTerrainDistanceKm, PROXIMITY_RADIUS_KM } from '@/lib/location'
import type { Terrain } from '@/lib/types'

const mapImg = require('@/assets/images/map-abidjan.png')
const fallbackImages = [
  require('@/assets/images/terrain-1.png'),
  require('@/assets/images/terrain-2.png'),
  require('@/assets/images/terrain-3.png'),
]

type RowTerrain = Terrain & { distanceKm: number }

export default function ReserverScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { coords, loading: locLoading } = useUserLocation()
  const { terrains: dbTerrains } = useTerrains()

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows: RowTerrain[] = useMemo(
    () =>
      dbTerrains.map((t) => ({
        ...t,
        distanceKm: getTerrainDistanceKm(t, coords),
      })) as RowTerrain[],
    [dbTerrains, coords],
  )

  const nearbyCount = useMemo(
    () => rows.filter((t) => t.distanceKm <= PROXIMITY_RADIUS_KM).length,
    [rows],
  )

  const selected = useMemo(
    () => rows.find((t) => t.id === selectedId) || rows[0] || null,
    [rows, selectedId],
  )

  const fallbackPins = [
    { top: '32%', left: '58%' },
    { top: '54%', left: '24%' },
    { top: '68%', left: '62%' },
    { top: '40%', left: '76%' },
  ]

  return (
    <YStack flex={1} backgroundColor={palette.bg} paddingTop={52}>
      <XStack
        paddingHorizontal={20}
        alignItems="center"
        justifyContent="space-between"
        marginBottom={16}
      >
        <YStack flex={1} minWidth={0}>
          <Text
            fontFamily="$heading"
            fontSize={26}
            color={palette.text}
            style={{ ...fonts.bold }}
          >
            Réserver un terrain
          </Text>
          <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
            Choisis un terrain et demande ton créneau
          </Text>
        </YStack>

        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {rows.length > 0 ? (
          <>
            {/* Map */}
            <YStack
              height={200}
              borderRadius={20}
              borderWidth={1}
              borderColor={palette.border}
              overflow="hidden"
              position="relative"
              backgroundColor="#0e1726"
            >
              <Image
                source={mapImg}
                style={{ width: '100%', height: '100%', opacity: 0.8 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.15)',
                }}
              />

              {rows.map((t, idx) => {
                const active = t.id === selected?.id
                const pin = t.pin_top && t.pin_left
                  ? { top: t.pin_top, left: t.pin_left }
                  : fallbackPins[idx % fallbackPins.length]
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedId(t.id)}
                    style={{
                      position: 'absolute',
                      top: pin.top as any,
                      left: pin.left as any,
                      transform: [{ translateX: -16 }, { translateY: -32 }],
                    }}
                  >
                    <YStack
                      width={32}
                      height={32}
                      borderRadius={16}
                      backgroundColor={active ? palette.accent : palette.primary}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={2}
                      borderColor="#fff"
                      shadowColor="#000"
                      shadowOpacity={0.3}
                      shadowRadius={4}
                      elevation={5}
                      transform={[{ scale: active ? 1.25 : 1 }]}
                    >
                      <MapPin size={16} color="#fff" />
                    </YStack>
                  </Pressable>
                )
              })}

              <YStack
                position="absolute"
                bottom={12}
                left={12}
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={999}
                backgroundColor={palette.card}
                borderWidth={1}
                borderColor={palette.border}
              >
                <Text color={palette.text} fontSize={12} style={{ ...fonts.medium }}>
                  {locLoading
                    ? 'Calcul de proximité…'
                    : nearbyCount > 0
                      ? `${nearbyCount} terrain${nearbyCount > 1 ? 's' : ''} à proximité (< 2.5 km)`
                      : 'Aucun terrain à proximité (< 2.5 km)'}
                </Text>
              </YStack>
            </YStack>

            {/* Terrain list */}
            <YStack gap={10}>
              {rows.map((t, idx) => {
                const active = t.id === selected?.id
                const img = t.image_url
                  ? { uri: t.image_url }
                  : fallbackImages[idx % fallbackImages.length]
                return (
                  <YStack
                    key={t.id}
                    backgroundColor={palette.card}
                    borderRadius={18}
                    padding={12}
                    borderWidth={active ? 1.5 : 1}
                    borderColor={active ? palette.primary : palette.border}
                    gap={10}
                  >
                    <Pressable onPress={() => setSelectedId(t.id)}>
                      <XStack gap={12} alignItems="center">
                        <Image
                          source={img}
                          style={{ width: 64, height: 64, borderRadius: 14 }}
                          contentFit="cover"
                        />
                        <YStack flex={1} minWidth={0} gap={3}>
                          <Text
                            color={palette.text}
                            fontSize={15}
                            style={{ ...fonts.bold }}
                            numberOfLines={1}
                          >
                            {t.name}
                          </Text>
                          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                            {[t.surface && `${t.surface}`, t.distanceKm < 999 ? `${t.distanceKm} km` : [t.quartier, t.zone].filter(Boolean).join(', ')]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          <XStack alignItems="center" gap={8} marginTop={2}>
                            <XStack alignItems="center" gap={3}>
                              <Star size={12} color={palette.gold} fill={palette.gold} />
                              <Text color={palette.text} fontSize={12} style={{ ...fonts.semibold }}>
                                {t.rating ? Number(t.rating).toFixed(1) : '—'}
                              </Text>
                            </XStack>
                            <Text color={palette.accent} fontSize={13} style={{ ...fonts.bold }}>
                              {formatFCFA(t.price_per_hour)}/h
                            </Text>
                          </XStack>
                        </YStack>
                      </XStack>
                    </Pressable>

                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: palette.border,
                        paddingTop: 10,
                        gap: 8,
                      }}
                    >
                      <Button
                        backgroundColor={palette.primary}
                        borderRadius={12}
                        height={44}
                        onPress={() => router.push(`/demander-creneau?terrainId=${t.id}`)}
                      >
                        <XStack alignItems="center" gap={8}>
                          <CalendarDays size={16} color="#fff" />
                          <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                            Demander un créneau
                          </Text>
                        </XStack>
                      </Button>
                      <Pressable onPress={() => router.push(`/terrain/${t.id}`)}>
                        <Text
                          textAlign="center"
                          color={palette.textMuted}
                          fontSize={12}
                          style={{ ...fonts.semibold }}
                        >
                          Voir la fiche du terrain
                        </Text>
                      </Pressable>
                    </View>
                  </YStack>
                )
              })}
            </YStack>
          </>
        ) : (
          <YStack
            alignItems="center"
            justifyContent="center"
            marginTop={80}
            paddingHorizontal={24}
            gap={14}
          >
            <YStack
              width={68}
              height={68}
              borderRadius={34}
              backgroundColor={`${palette.primary}16`}
              borderWidth={1.5}
              borderColor={`${palette.primary}33`}
              alignItems="center"
              justifyContent="center"
            >
              <MapPin size={32} color={palette.primary} />
            </YStack>
            <Text
              color={palette.text}
              fontSize={18}
              textAlign="center"
              style={{ ...fonts.bold }}
            >
              Aucun terrain enregistré
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              lineHeight={19}
              style={{ ...fonts.regular }}
            >
              {canAddTerrains(profile?.role)
                ? 'Ajoute ton terrain pour recevoir des demandes de créneaux.'
                : 'Les gérants de terrain sont en train de venir. Reviens bientôt !'}
            </Text>
            {canAddTerrains(profile?.role) ? (
              <Button
                backgroundColor={palette.primary}
                borderRadius={14}
                height={46}
                paddingHorizontal={20}
                marginTop={6}
                onPress={() => router.push('/ajouter-terrain')}
              >
                <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                  Ajouter un terrain
                </Text>
              </Button>
            ) : null}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  )
}