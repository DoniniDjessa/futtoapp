import { useRef, useState } from 'react'
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MapPinned, Navigation, X, ChevronLeft } from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { openGoogleMapsNavigation, terrainImages } from '@/lib/maps-nav'
import { formatFCFA } from '@/lib/theme'
import type { Terrain } from '@/lib/types'

type Palette = {
  bg: string
  card: string
  cardElevated?: string
  border: string
  text: string
  textMuted: string
  primary: string
  accent: string
  gold: string
}

type Props = {
  terrain: Terrain
  palette: Palette
  /** Modal map : plus compact, bouton fermer */
  mode?: 'page' | 'modal'
  onClose?: () => void
}

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window')

/**
 * Galerie en haut + card arrondie plus basse (~38%) pour laisser respirer l’image.
 */
export function TerrainDetailSheet({ terrain, palette, mode = 'page', onClose }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const images = terrainImages(terrain)
  const [page, setPage] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  // Modal un peu plus compact ; page = plus d’image visible
  const cardTop = Math.round(SCREEN_H * (mode === 'modal' ? 0.32 : 0.38))
  const hasCoords = terrain.lat != null && terrain.lng != null

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x
    setPage(Math.round(x / SCREEN_W))
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Galerie derrière / au-dessus de la card */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cardTop + 80 }}>
        {images.length > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {images.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={{ width: SCREEN_W, height: cardTop + 80 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: '#006838',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPinned size={48} color="#00b14f" />
          </View>
        )}
        {images.length > 1 ? (
          <View
            style={{
              position: 'absolute',
              bottom: 28,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {images.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === page ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      {mode === 'modal' && onClose ? (
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: 16,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#fff" />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color="#fff" />
        </Pressable>
      )}

      {/* Card plus courte : image ~38% / ~32% en modal */}
      <View
        style={{
          position: 'absolute',
          top: cardTop,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 20,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          borderWidth: 1,
          borderColor: palette.border,
          borderBottomWidth: 0,
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
          <YStack gap={6}>
            <Text fontFamily="$heading" fontSize={26} color={palette.text as any}>
              {terrain.name}
            </Text>
            <Text color={palette.textMuted as any} fontSize={13} style={{ ...fonts.regular }}>
              {[terrain.quartier, terrain.zone, terrain.surface].filter(Boolean).join(' · ') ||
                '—'}
            </Text>
            <Text fontFamily="$heading" fontSize={24} color={palette.gold as any} marginTop={4}>
              {formatFCFA(terrain.price_per_hour)}
              <Text color={palette.textMuted as any} fontSize={14} fontFamily="$body">
                {' '}
                / h
              </Text>
            </Text>
            {terrain.rating != null ? (
              <Text color={palette.accent as any} fontSize={13} style={{ ...fonts.semibold }}>
                ★ {Number(terrain.rating).toFixed(1)}
              </Text>
            ) : null}
          </YStack>

          <YStack
            backgroundColor={palette.bg as any}
            borderRadius={16}
            padding={14}
            borderWidth={1}
            borderColor={palette.border as any}
            gap={8}
          >
            <Text color={palette.accent as any} fontSize={11} style={{ ...fonts.bold }} letterSpacing={1}>
              RÉSERVATION
            </Text>
            <Text color={palette.text as any} style={{ ...fonts.semibold }}>
              Demander un créneau
            </Text>
            <Text color={palette.textMuted as any} fontSize={13} style={{ ...fonts.regular }}>
              Le gérant confirme — tu paies ensuite. Pas de faux « réservé ».
            </Text>
          </YStack>

          <XStack gap={10}>
            {hasCoords ? (
              <Button
                flex={1}
                height={52}
                borderRadius={14}
                backgroundColor={palette.accent as any}
                icon={<Navigation size={18} color="#fff" />}
                onPress={() =>
                  void openGoogleMapsNavigation(
                    Number(terrain.lat),
                    Number(terrain.lng),
                    terrain.name,
                  )
                }
              >
                <Text color="#fff" style={{ ...fonts.bold }} fontSize={15}>
                  Y aller
                </Text>
              </Button>
            ) : null}
            <Button
              flex={1}
              height={52}
              borderRadius={14}
              backgroundColor={palette.primary as any}
              onPress={() => {
                onClose?.()
                router.push(`/demander-creneau?terrainId=${terrain.id}`)
              }}
            >
              <Text color="#fff" style={{ ...fonts.bold }} fontSize={15}>
                Demander créneau
              </Text>
            </Button>
          </XStack>
          <Button
            height={48}
            borderRadius={14}
            backgroundColor={palette.cardElevated as any}
            borderWidth={1}
            borderColor={palette.border as any}
            onPress={() => {
              onClose?.()
              router.push('/creer')
            }}
          >
            <Text color={palette.text as any} style={{ ...fonts.semibold }} fontSize={14}>
              Créer un match sur ce terrain
            </Text>
          </Button>

        </ScrollView>
      </View>
    </View>
  )
}
