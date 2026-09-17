import { useMemo, useState } from 'react'
import { Dimensions, Pressable, ScrollView, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { ArrowLeft, CalendarDays, Check, Clock, MapPin, Star } from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { useTerrains } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { colors, formatFCFA, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { useUserLocation, getTerrainDistanceKm, PROXIMITY_RADIUS_KM } from '@/lib/location'
import type { Terrain } from '@/lib/types'

const mapImg = require('@/assets/images/map-abidjan.png')
const terrainImg1 = require('@/assets/images/terrain-1.png')
const terrainImg2 = require('@/assets/images/terrain-2.png')
const terrainImg3 = require('@/assets/images/terrain-3.png')

type ReserverTerrain = {
  id: string
  name: string
  zone: string
  price: number
  rating: number
  reviews: number
  distanceKm: number
  image: any
  type: string
  pin: { top: string; left: string }
}

const DEMO_TERRAINS: ReserverTerrain[] = [
  {
    id: 't1',
    name: 'Terrain Angré 8e Tranche',
    zone: 'Cocody, Abidjan',
    price: 15000,
    rating: 4.6,
    reviews: 32,
    distanceKm: 1.2,
    image: terrainImg1,
    type: 'Gazon synthétique · 5v5',
    pin: { top: '32%', left: '58%' },
  },
  {
    id: 't2',
    name: 'Complexe Yopougon Niangon',
    zone: 'Yopougon, Abidjan',
    price: 10000,
    rating: 4.4,
    reviews: 18,
    distanceKm: 3.8,
    image: terrainImg3,
    type: 'Gazon synthétique · 7v7',
    pin: { top: '54%', left: '24%' },
  },
  {
    id: 't3',
    name: 'Futsal Marcory Zone 4',
    zone: 'Marcory, Abidjan',
    price: 12000,
    rating: 4.7,
    reviews: 41,
    distanceKm: 2.5,
    image: terrainImg2,
    type: 'Indoor futsal · 5v5',
    pin: { top: '68%', left: '62%' },
  },
  {
    id: 't4',
    name: 'Terrain Cocody Riviera 3',
    zone: 'Riviera, Abidjan',
    price: 16000,
    rating: 4.8,
    reviews: 55,
    distanceKm: 4.1,
    image: terrainImg1,
    type: 'Gazon synthétique · 5v5',
    pin: { top: '40%', left: '76%' },
  },
]

const dates = ['Sam 25', 'Dim 26', 'Lun 27', 'Mar 28', 'Mer 29']
const times = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
const durations = [
  { label: '1 h', value: 1 },
  { label: '1 h 30', value: 1.5 },
  { label: '2 h', value: 2 },
]

export default function ReserverScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { coords, loading: locLoading } = useUserLocation()
  const { terrains: dbTerrains } = useTerrains()

  const listTerrains: ReserverTerrain[] = useMemo(() => {
    if (!dbTerrains || dbTerrains.length === 0) {
      return DEMO_TERRAINS
    }
    return dbTerrains.map((t, idx) => {
      const fallbackImg = [terrainImg1, terrainImg3, terrainImg2][idx % 3]
      const fallbackPins = [
        { top: '32%', left: '58%' },
        { top: '54%', left: '24%' },
        { top: '68%', left: '62%' },
        { top: '40%', left: '76%' },
      ]
      const distanceKm = getTerrainDistanceKm(t, coords)
      return {
        id: t.id,
        name: t.name,
        zone: [t.quartier, t.zone].filter(Boolean).join(', ') || 'Abidjan',
        price: t.price_per_hour || 15000,
        rating: t.rating ? Number(t.rating) : 4.6,
        reviews: 24,
        distanceKm,
        image: t.image_url ? { uri: t.image_url } : fallbackImg,
        type: `${t.surface || 'Gazon synthétique'} · 5v5`,
        pin:
          t.pin_top && t.pin_left
            ? { top: t.pin_top, left: t.pin_left }
            : fallbackPins[idx % fallbackPins.length],
      }
    })
  }, [dbTerrains, coords])

  // Terrains dans le rayon de 2.5 km (diamètre d'environ 5 km)
  const nearbyCount = useMemo(() => {
    return listTerrains.filter((t) => t.distanceKm <= PROXIMITY_RADIUS_KM).length
  }, [listTerrains])

  const [terrainId, setTerrainId] = useState<string>(() => listTerrains[0]?.id || 't1')
  const [date, setDate] = useState(dates[0])
  const [time, setTime] = useState(times[0])
  const [duration, setDuration] = useState(durations[0].value)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const selectedTerrain = useMemo(() => {
    return listTerrains.find((t) => t.id === terrainId) || listTerrains[0]
  }, [listTerrains, terrainId])

  const total = (selectedTerrain?.price || 15000) * duration

  async function handleBook() {
    setBusy(true)
    try {
      if (supabase && user && selectedTerrain) {
        // Enregistrer la réservation
        const [day, mon] = date.split(' ')
        const [hour, minute] = time.split(':')
        const now = new Date()
        const bookingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, Number(hour), Number(minute))

        const { data: newBooking } = await supabase
          .from(T.bookings)
          .insert({
            terrain_id: selectedTerrain.id,
            requester_id: user.id,
            starts_at: bookingDate.toISOString(),
            duration_hours: duration,
            amount_fcfa: total,
            status: 'requested',
            note: `Réservation ${date} à ${time}`,
          })
          .select('id')
          .maybeSingle()

        // Récupérer le gestionnaire du terrain pour le notifier
        const { data: tRow } = await supabase
          .from(T.terrains)
          .select('created_by, name')
          .eq('id', selectedTerrain.id)
          .maybeSingle()

        if (tRow?.created_by && tRow.created_by !== user.id) {
          void notifyUser({
            profileId: tRow.created_by,
            title: 'Nouvelle réservation reçue ⚽',
            body: `Une demande de réservation a été soumise pour « ${selectedTerrain.name} » (${date} à ${time}). Consultez vos réservations pour valider.`,
            kind: 'booking',
            data: { bookingId: newBooking?.id, terrainId: selectedTerrain.id },
          })
        }

        // Notifier le demandeur
        void notifyUser({
          profileId: user.id,
          title: 'Demande transmise ⏳',
          body: `Votre demande pour « ${selectedTerrain.name} » (${date} à ${time}) est en attente de confirmation du terrain.`,
          kind: 'booking',
          data: { bookingId: newBooking?.id, terrainId: selectedTerrain.id },
        })
      }
    } catch {
      // Best-effort
    } finally {
      setBusy(false)
      setDone(true)
    }
  }

  if (done && selectedTerrain) {
    const durLabel = durations.find((d) => d.value === duration)?.label || `${duration} h`
    return (
      <YStack
        flex={1}
        backgroundColor={palette.bg}
        alignItems="center"
        justifyContent="center"
        padding={32}
      >
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor={palette.primary}
          alignItems="center"
          justifyContent="center"
          shadowColor={palette.primary}
          shadowOpacity={0.4}
          shadowRadius={12}
          elevation={6}
        >
          <Check size={40} color="#fff" strokeWidth={3} />
        </YStack>

        <Text
          marginTop={24}
          fontFamily="$heading"
          fontSize={26}
          color={palette.text}
          textAlign="center"
          style={{ ...fonts.bold }}
        >
          Demande transmise !
        </Text>

        <Text
          marginTop={8}
          color={palette.textMuted}
          fontSize={14}
          textAlign="center"
          style={{ ...fonts.medium }}
        >
          {selectedTerrain.name} · {date} à {time} ({durLabel})
        </Text>

        <Text
          marginTop={6}
          color={palette.primary}
          fontSize={15}
          textAlign="center"
          style={{ ...fonts.bold }}
        >
          Montant : {formatFCFA(total)}
        </Text>

        <Text
          marginTop={8}
          color={palette.textMuted}
          fontSize={13}
          textAlign="center"
          lineHeight={18}
          style={{ ...fonts.regular, maxWidth: 300 }}
        >
          Votre demande a été transmise au gérant du complexe. Dès validation de son côté, vous recevrez une notification directe.
        </Text>

        <XStack marginTop={32} gap={12}>
          <Button
            borderRadius={999}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.card}
            paddingHorizontal={18}
            height={46}
            onPress={() => router.push('/mes-reservations')}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={13}>
              Mes réservations
            </Text>
          </Button>

          <Button
            borderRadius={999}
            backgroundColor={palette.primary}
            paddingHorizontal={24}
            height={46}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text color="#fff" style={{ ...fonts.bold }} fontSize={14}>
              Accueil
            </Text>
          </Button>
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg} paddingTop={52}>
      {/* Header */}
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
            Choisis, paie, joue
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
        {/* Interactive MapView */}
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

          {/* Markers */}
          {listTerrains.map((t) => {
            const active = t.id === selectedTerrain?.id
            return (
              <Pressable
                key={t.id}
                onPress={() => setTerrainId(t.id)}
                style={{
                  position: 'absolute',
                  top: t.pin.top as any,
                  left: t.pin.left as any,
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

        {/* Terrain Cards List */}
        <YStack gap={10}>
          {listTerrains.map((t) => {
            const active = t.id === selectedTerrain?.id
            return (
              <YStack
                key={t.id}
                backgroundColor={palette.card}
                borderRadius={18}
                padding={12}
                borderWidth={active ? 1.5 : 1}
                borderColor={active ? palette.primary : palette.border}
                gap={8}
              >
                <Pressable onPress={() => setTerrainId(t.id)}>
                  <XStack gap={12} alignItems="center">
                    <Image
                      source={t.image}
                      style={{ width: 64, height: 64, borderRadius: 14 }}
                      contentFit="cover"
                    />
                    <YStack flex={1} minWidth={0} gap={3}>
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text
                          color={palette.text}
                          fontSize={15}
                          style={{ ...fonts.bold }}
                          numberOfLines={1}
                        >
                          {t.name}
                        </Text>
                        {active ? <Check size={18} color={palette.primary} /> : null}
                      </XStack>

                      <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                        {t.type} · {t.distanceKm < 999 ? `${t.distanceKm} km` : t.zone}
                      </Text>

                      <XStack alignItems="center" gap={8} marginTop={2}>
                        <XStack alignItems="center" gap={3}>
                          <Star size={12} color={palette.gold} fill={palette.gold} />
                          <Text color={palette.text} fontSize={12} style={{ ...fonts.semibold }}>
                            {t.rating.toFixed(1)}
                          </Text>
                        </XStack>
                        <Text color={palette.accent} fontSize={13} style={{ ...fonts.bold }}>
                          {formatFCFA(t.price)}/h
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                </Pressable>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    paddingTop: 8,
                    marginTop: 2,
                  }}
                >
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

        {/* Date Selector */}
        <YStack gap={10}>
          <XStack alignItems="center" gap={6}>
            <CalendarDays size={18} color={palette.primary} />
            <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
              Date
            </Text>
          </XStack>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {dates.map((d) => {
              const active = d === date
              return (
                <Pressable
                  key={d}
                  onPress={() => setDate(d)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: active ? palette.primary : palette.card,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                  }}
                >
                  <Text
                    color={active ? '#fff' : palette.text}
                    fontSize={13}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {d}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </YStack>

        {/* Time Selector */}
        <YStack gap={10}>
          <XStack alignItems="center" gap={6}>
            <Clock size={18} color={palette.primary} />
            <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
              Heure
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap={8}>
            {times.map((t) => {
              const active = t === time
              return (
                <Pressable
                  key={t}
                  onPress={() => setTime(t)}
                  style={{
                    width: '31%',
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: active ? palette.primary : palette.card,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    color={active ? '#fff' : palette.text}
                    fontSize={13}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {t}
                  </Text>
                </Pressable>
              )
            })}
          </XStack>
        </YStack>

        {/* Duration Selector */}
        <YStack gap={10}>
          <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
            Durée
          </Text>
          <XStack gap={8}>
            {durations.map((d) => {
              const active = d.value === duration
              return (
                <Pressable
                  key={d.value}
                  onPress={() => setDuration(d.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: active ? palette.primary : palette.card,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    color={active ? '#fff' : palette.text}
                    fontSize={13}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              )
            })}
          </XStack>
        </YStack>

        {/* Summary Card */}
        {selectedTerrain ? (
          <YStack
            backgroundColor={palette.card}
            borderRadius={18}
            padding={16}
            borderWidth={1}
            borderColor={palette.border}
            gap={12}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text
                color={palette.textMuted}
                fontSize={14}
                style={{ ...fonts.medium }}
                numberOfLines={1}
                flex={1}
              >
                {selectedTerrain.name}
              </Text>
              <YStack
                backgroundColor={`${palette.primary}22`}
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={999}
              >
                <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                  {date} · {time}
                </Text>
              </YStack>
            </XStack>

            <View style={{ height: 1, backgroundColor: palette.border }} />

            <XStack justifyContent="space-between" alignItems="center">
              <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.regular }}>
                Total à payer
              </Text>
              <Text
                fontFamily="$heading"
                fontSize={24}
                color={palette.accent}
                style={{ ...fonts.bold }}
              >
                {formatFCFA(total)}
              </Text>
            </XStack>
          </YStack>
        ) : null}

        {/* Submit button */}
        <Button
          backgroundColor={palette.primary}
          borderRadius={999}
          height={54}
          disabled={busy}
          opacity={busy ? 0.7 : 1}
          onPress={() => void handleBook()}
        >
          <Text
            color="#fff"
            fontFamily="$heading"
            fontSize={16}
            style={{ ...fonts.bold }}
          >
            {busy ? 'Réservation…' : 'Payer et réserver'}
          </Text>
        </Button>
      </ScrollView>
    </YStack>
  )
}
