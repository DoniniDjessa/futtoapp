import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Shirt,
  ShowerHead,
  Sparkles,
  Star,
  Users,
  Wifi,
} from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useTerrains } from '@/lib/data'
import { openGoogleMapsNavigation } from '@/lib/maps-nav'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { colors, formatFCFA, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { useUserLocation, getTerrainDistanceKm } from '@/lib/location'
import type { Terrain } from '@/lib/types'

const { width: SCREEN_W } = Dimensions.get('window')

const ALL_AMENITY_ICONS: Record<string, { icon: any; label: string }> = {
  parking: { icon: Car, label: 'Parking' },
  douches: { icon: ShowerHead, label: 'Douches' },
  vestiaires: { icon: Shirt, label: 'Vestiaires' },
  wifi: { icon: Wifi, label: 'Wi-Fi' },
  eclairage: { icon: Sparkles, label: 'Éclairage' },
  buvette: { icon: Coffee, label: 'Buvette' },
  tribunes: { icon: Users, label: 'Tribunes' },
}

export default function TerrainDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { coords } = useUserLocation()
  const { terrains: dbTerrains } = useTerrains()

  const [dbTerrainSingle, setDbTerrainSingle] = useState<Terrain | null>(null)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const galleryRef = useRef<ScrollView>(null)

  // Cherche le terrain dans le cache local ou charge directement
  useEffect(() => {
    let alive = true
    if (!id || !supabase) return
    const found = dbTerrains.find((t) => t.id === id)
    if (found) {
      setDbTerrainSingle(found)
      return
    }
    void supabase
      .from(T.terrains)
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) {
          setDbTerrainSingle(data as Terrain)
        }
      })
    return () => {
      alive = false
    }
  }, [id, dbTerrains])

  const terrain = useMemo(() => {
    const raw = dbTerrains.find((t) => t.id === id) || dbTerrainSingle
    if (raw) {
      return {
        id: raw.id,
        name: raw.name,
        zone: [raw.quartier, raw.zone].filter(Boolean).join(', ') || 'Abidjan',
        price: raw.price_per_hour || 15000,
        rating: raw.rating ? Number(raw.rating) : 0,
        distanceKm: getTerrainDistanceKm(raw, coords),
        surface: raw.surface || 'Gazon synthétique',
        type: `${raw.surface || 'Gazon synthétique'} · 5v5`,
        image_url: raw.image_url || null,
        photos: Array.isArray(raw.photos) ? raw.photos : [],
        description: raw.description || null,
        amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
        contact_phone: raw.contact_phone || null,
        opening_time: raw.opening_time || '08:00',
        closing_time: raw.closing_time || '23:00',
        lat: raw.lat ? Number(raw.lat) : null,
        lng: raw.lng ? Number(raw.lng) : null,
      }
    }
    return {
      id: id || 't1',
      name: 'Terrain FUTTO',
      zone: 'Abidjan',
      price: 15000,
      rating: 0,
      distanceKm: 0,
      surface: 'Gazon synthétique',
      type: 'Gazon synthétique · 5v5',
      image_url: null,
      photos: [] as string[],
      description: null,
      amenities: [] as string[],
      contact_phone: null,
      opening_time: '08:00',
      closing_time: '23:00',
      lat: null,
      lng: null,
    }
  }, [dbTerrains, dbTerrainSingle, id, coords])

  // Photos réelles uniquement (pas de mockup)
  const photos = useMemo(() => {
    const list: { uri: string }[] = []
    if (terrain.image_url) {
      list.push({ uri: terrain.image_url })
    }
    if (Array.isArray(terrain.photos)) {
      terrain.photos.forEach((p) => {
        if (p && p !== terrain.image_url) {
          list.push({ uri: p })
        }
      })
    }
    return list
  }, [terrain.image_url, terrain.photos])

  // Équipements réels
  const displayAmenities = useMemo(() => {
    if (!terrain.amenities || terrain.amenities.length === 0) return []
    return terrain.amenities.map((key) => {
      const match = ALL_AMENITY_ICONS[key.toLowerCase()]
      return match || { icon: Check, label: key }
    })
  }, [terrain.amenities])

  function scrollToPhoto(idx: number) {
    if (photos.length === 0) return
    const target = ((idx % photos.length) + photos.length) % photos.length
    galleryRef.current?.scrollTo({ x: target * SCREEN_W, animated: true })
    setActivePhotoIdx(target)
  }

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x
    const idx = Math.round(x / SCREEN_W)
    if (idx !== activePhotoIdx) {
      setActivePhotoIdx(idx)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Bar Navigation */}
      <XStack
        paddingTop={52}
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={palette.bg}
        zIndex={10}
      >
        <XStack alignItems="center" gap={12}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/reserver'))}
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
          <Text fontFamily="$heading" fontSize={22} color={palette.text} style={{ ...fonts.bold }}>
            Détail du terrain
          </Text>
        </XStack>

        {terrain.lat && terrain.lng ? (
          <Pressable
            onPress={() => void openGoogleMapsNavigation(terrain.lat!, terrain.lng!, terrain.name)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Navigation size={14} color={palette.accent} />
            <Text color={palette.accent} fontSize={12} style={{ ...fonts.semibold }}>
              Itinéraire
            </Text>
          </Pressable>
        ) : null}
      </XStack>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero Gallery Slider */}
        <YStack height={260} width={SCREEN_W} position="relative" backgroundColor="#0b1220">
          {photos.length > 0 ? (
            <ScrollView
              ref={galleryRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onGalleryScroll}
              scrollEventThrottle={16}
            >
              {photos.map((src, i) => (
                <View key={i} style={{ width: SCREEN_W, height: 260 }}>
                  <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <YStack
              flex={1}
              alignItems="center"
              justifyContent="center"
              backgroundColor={mode === 'dark' ? '#0d1f14' : '#e6f4ea'}
              gap={10}
            >
              <MapPin size={40} color={palette.primary} />
              <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
                Photo du terrain à venir
              </Text>
            </YStack>
          )}

          {/* Gradient overlay */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 120,
              backgroundColor: 'rgba(0,0,0,0.55)',
            }}
          />

          {/* Prev / Next Chevrons si multi-photos */}
          {photos.length > 1 ? (
            <>
              <Pressable
                onPress={() => scrollToPhoto(activePhotoIdx - 1)}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: [{ translateY: -18 }],
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <ChevronLeft size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => scrollToPhoto(activePhotoIdx + 1)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: [{ translateY: -18 }],
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <ChevronRight size={20} color="#fff" />
              </Pressable>
            </>
          ) : null}

          {/* Overlay text & indicators */}
          <YStack position="absolute" bottom={14} left={16} right={16} gap={4}>
            <YStack
              backgroundColor={palette.primary}
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={999}
              alignSelf="flex-start"
            >
              <Text color="#fff" fontSize={11} style={{ ...fonts.bold }}>
                {terrain.surface}
              </Text>
            </YStack>
            <Text fontFamily="$heading" fontSize={24} color="#fff" style={{ ...fonts.bold }}>
              {terrain.name}
            </Text>

            {photos.length > 1 ? (
              <XStack alignItems="center" justifyContent="space-between" marginTop={4}>
                <XStack gap={4}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === activePhotoIdx ? 20 : 6,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: i === activePhotoIdx ? palette.primary : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  ))}
                </XStack>
                <Text color="rgba(255,255,255,0.85)" fontSize={11} style={{ ...fonts.medium }}>
                  {activePhotoIdx + 1}/{photos.length}
                </Text>
              </XStack>
            ) : null}
          </YStack>
        </YStack>

        {/* Thumbnail strip (si multi-photos uniquement) */}
        {photos.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}
          >
            {photos.map((src, i) => {
              const active = i === activePhotoIdx
              return (
                <Pressable
                  key={i}
                  onPress={() => scrollToPhoto(i)}
                  style={{
                    width: 70,
                    height: 50,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: active ? palette.primary : 'transparent',
                    opacity: active ? 1 : 0.65,
                  }}
                >
                  <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        <YStack paddingHorizontal={20} paddingTop={18} gap={20}>
          {/* Location & Note */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={6} flex={1} minWidth={0}>
              <MapPin size={16} color={palette.primary} />
              <Text
                color={palette.textMuted}
                fontSize={13}
                style={{ ...fonts.medium }}
                numberOfLines={1}
              >
                {terrain.zone} · {terrain.distanceKm < 999 ? `${terrain.distanceKm} km` : 'Abidjan'}
              </Text>
            </XStack>

            {terrain.rating > 0 ? (
              <XStack alignItems="center" gap={4}>
                <Star size={15} color={palette.gold} fill={palette.gold} />
                <Text color={palette.text} fontSize={14} style={{ ...fonts.bold }}>
                  {terrain.rating.toFixed(1)}
                </Text>
              </XStack>
            ) : (
              <YStack
                backgroundColor={`${palette.primary}18`}
                paddingHorizontal={8}
                paddingVertical={3}
                borderRadius={8}
              >
                <Text color={palette.primary} fontSize={11} style={{ ...fonts.semibold }}>
                  Nouveau
                </Text>
              </YStack>
            )}
          </XStack>

          {/* Contact gérant direct */}
          {terrain.contact_phone ? (
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              padding={14}
            >
              <YStack gap={2}>
                <Text color={palette.text} fontSize={13} style={{ ...fonts.semibold }}>
                  Contact gérant
                </Text>
                <Text color={palette.accent} fontSize={13} style={{ ...fonts.bold }}>
                  {terrain.contact_phone}
                </Text>
              </YStack>
              <XStack gap={8}>
                <Pressable
                  onPress={() => {
                    const num = terrain.contact_phone?.replace(/[^0-9+]/g, '')
                    void Linking.openURL(`tel:${num}`)
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: palette.primary,
                  }}
                >
                  <Phone size={14} color="#fff" />
                  <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
                    Appeler
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const num = terrain.contact_phone?.replace(/[^0-9]/g, '')
                    void Linking.openURL(`https://wa.me/${num}`)
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: '#25D366',
                  }}
                >
                  <MessageCircle size={14} color="#fff" />
                  <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
                    WhatsApp
                  </Text>
                </Pressable>
              </XStack>
            </XStack>
          ) : null}

          {/* Description réelle */}
          {terrain.description ? (
            <YStack gap={8}>
              <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
                À propos du terrain
              </Text>
              <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }} lineHeight={20}>
                {terrain.description}
              </Text>
            </YStack>
          ) : null}

          {/* Équipements réels du terrain */}
          {displayAmenities.length > 0 ? (
            <YStack gap={10}>
              <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
                Équipements & Services
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {displayAmenities.map(({ icon: Icon, label }) => (
                  <XStack
                    key={label}
                    alignItems="center"
                    gap={8}
                    paddingHorizontal={14}
                    paddingVertical={10}
                    borderRadius={14}
                    backgroundColor={palette.card}
                    borderWidth={1}
                    borderColor={palette.border}
                  >
                    <Icon size={16} color={palette.primary} />
                    <Text color={palette.text} fontSize={12} style={{ ...fonts.semibold }}>
                      {label}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </YStack>
          ) : null}

          {/* Horaires du terrain */}
          <YStack gap={6}>
            <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
              Horaires
            </Text>
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              {terrain.opening_time} — {terrain.closing_time}
            </Text>
          </YStack>

          {/* Avis des joueurs (données réelles sans faux avis) */}
          <YStack gap={10}>
            <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
              Avis des joueurs
            </Text>
            <YStack
              backgroundColor={palette.card}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={palette.border}
              alignItems="center"
              gap={6}
            >
              <Text color={palette.text} fontSize={14} style={{ ...fonts.semibold }}>
                Aucun avis pour l’instant
              </Text>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }} textAlign="center">
                Sois le premier joueur à réserver et donner ton avis sur ce terrain.
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Sticky Bottom : Demander un créneau ≠ Créer un match */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={palette.card}
        borderTopWidth={1}
        borderTopColor={palette.border}
        paddingHorizontal={20}
        paddingTop={12}
        paddingBottom={30}
        gap={10}
        shadowColor="#000"
        shadowOpacity={0.25}
        shadowRadius={10}
        elevation={8}
      >
        <Button
          backgroundColor={palette.primary}
          borderRadius={16}
          height={50}
          onPress={() => router.push(`/demander-creneau?terrainId=${id}`)}
        >
          <Text color="#fff" fontFamily="$heading" fontSize={15} style={{ ...fonts.bold }}>
            Demander un créneau
          </Text>
        </Button>
        <Button
          height={46}
          borderRadius={16}
          backgroundColor={palette.cardElevated}
          borderWidth={1}
          borderColor={palette.border}
          onPress={() => router.push('/creer')}
        >
          <Text color={palette.text} fontSize={13} style={{ ...fonts.semibold }}>
            Créer un match sur ce terrain
          </Text>
        </Button>

        <Pressable onPress={() => router.push('/reserver')}>
          <Text
            textAlign="center"
            color={palette.textMuted}
            fontSize={12}
            style={{ ...fonts.medium }}
          >
            Retour aux terrains
          </Text>
        </Pressable>
      </YStack>
    </YStack>
  )
}