import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { Stack } from 'expo-router'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ChevronDown } from 'lucide-react-native'
import { Text, YStack, Button, Input, XStack } from 'tamagui'
import { LocalisationSearchPicker } from '@/components/LocalisationSearchPicker'
import { PinMapPicker } from '@/components/PinMapPicker'
import { useAuth } from '@/lib/auth'
import { useLocalisations } from '@/lib/localisations'
import { useUserLocation } from '@/lib/location'
import { useSafeDismiss } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { uploadCompressedImage } from '@/lib/storage'
import { notifyUser } from '@/lib/push'
import { SURFACE_OPTIONS, canAddTerrains } from '@/lib/types'
import type { Localisation } from '@/lib/types'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import { useFormScroll } from '@/lib/form-scroll'

const AMENITY_OPTIONS = [
  { id: 'parking', label: 'Parking' },
  { id: 'vestiaires', label: 'Vestiaires' },
  { id: 'douches', label: 'Douches' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'eclairage', label: 'Éclairage' },
  { id: 'buvette', label: 'Buvette' },
  { id: 'tribunes', label: 'Tribunes' },
] as const

/** Manager / superAdmin : ajouter un terrain avec localisation FUTTO + pin carte. */
export default function AjouterTerrainScreen() {
  const dismiss = useSafeDismiss('/')
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile } = useAuth()
  const { localisations, loading: locLoading } = useLocalisations()
  const { coords, request } = useUserLocation()
  const { scrollRef, onFieldLayout, scrollToField } = useFormScroll()

  const [name, setName] = useState('')
  const [surface, setSurface] = useState<string>(SURFACE_OPTIONS[0])
  const [surfaceOpen, setSurfaceOpen] = useState(false)
  const [price, setPrice] = useState('15000')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'parking',
    'vestiaires',
    'douches',
    'eclairage',
  ])
  const [contactPhone, setContactPhone] = useState('')
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('23:00')
  const [loc, setLoc] = useState<Localisation | null>(null)
  const [pin, setPin] = useState({ lat: coords.lat, lng: coords.lng })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  useEffect(() => {
    if (!loc) {
      setPin({ lat: coords.lat, lng: coords.lng })
      return
    }
    if (loc.lat != null && loc.lng != null) {
      setPin({ lat: loc.lat, lng: loc.lng })
    }
  }, [loc, coords.lat, coords.lng])

  const canAdd = canAddTerrains(profile?.role)

  async function useMyPosition() {
    const ok = await request()
    if (!ok) return
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    } catch {
      /* keep pin */
    }
  }

  async function onSave() {
    if (!canAdd) {
      Alert.alert('Accès', 'Réservé aux managers et superAdmin.')
      return
    }
    if (!user || !supabase) return
    if (!name.trim()) {
      setError('Nom du terrain requis.')
      return
    }
    if (!loc) {
      setError('Choisis une localisation FUTTO.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      let image_url: string | null = null
      if (photoUri) {
        const up = await uploadCompressedImage({
          uri: photoUri,
          kind: 'terrains',
          userId: user.id,
        })
        image_url = up.publicUrl
      }

      const row: Record<string, unknown> = {
        name: name.trim(),
        localisation_id: loc.id,
        zone: loc.commune,
        quartier: loc.quartier,
        surface: surface.trim() || null,
        price_per_hour: Number(price) || 0,
        description: description.trim() || null,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : null,
        contact_phone: contactPhone.trim() || null,
        opening_time: openingTime.trim() || '08:00',
        closing_time: closingTime.trim() || '23:00',
        lat: pin.lat,
        lng: pin.lng,
        image_url,
        created_by: user.id,
      }

      let { error: insertErr } = await supabase.from(T.terrains).insert(row)
      if (insertErr && /description|amenities|contact_phone|opening_time|closing_time/i.test(insertErr.message)) {
        delete row.description
        delete row.amenities
        delete row.contact_phone
        delete row.opening_time
        delete row.closing_time
        const retry = await supabase.from(T.terrains).insert(row)
        insertErr = retry.error
      }
      if (insertErr) throw insertErr

      void notifyUser({
        profileId: user.id,
        title: 'Terrain ajouté avec succès ! 🏟️',
        body: `Le complexe « ${name.trim()} » est désormais référencé et disponible sur FUTTO.`,
        kind: 'system',
      })

      Alert.alert('Terrain', 'Terrain ajouté avec succès.', [{ text: 'OK', onPress: dismiss }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  if (!canAdd) {
    return (
      <YStack flex={1} backgroundColor={palette.bg} padding="$4" justifyContent="center">
        <Stack.Screen options={{ title: 'Ajouter un terrain' }} />
        <Text color={palette.textMuted} style={{ ...fonts.medium }}>
          Seuls les managers (et superAdmin) peuvent ajouter un terrain depuis l’app.
        </Text>
      </YStack>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Ajouter un terrain',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <YStack backgroundColor="rgba(220,38,38,0.12)" padding="$3" borderRadius={12}>
            <Text color="#fca5a5" style={{ ...fonts.medium }} fontSize={13}>
              {error}
            </Text>
          </YStack>
        ) : null}

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Nom
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Complexe…"
            backgroundColor={palette.card}
            borderColor={palette.border}
            color={palette.text}
            placeholderTextColor={palette.textMuted}
            borderRadius={14}
            height={52}
          />
        </YStack>

        <YStack onLayout={(e) => onFieldLayout('loc', e.nativeEvent.layout.y)}>
          <LocalisationSearchPicker
            items={localisations}
            loading={locLoading}
            value={loc}
            onChange={setLoc}
            palette={palette}
            onOpenChange={(open) => {
              if (open) scrollToField('loc', 10, 100)
            }}
          />
        </YStack>

        <PinMapPicker
          lat={pin.lat}
          lng={pin.lng}
          onChange={setPin}
          dark={mode === 'dark'}
          height={240}
        />

        <Button
          size="$3"
          backgroundColor={palette.cardElevated}
          borderWidth={1}
          borderColor={palette.border}
          color={palette.text}
          borderRadius={12}
          onPress={() => void useMyPosition()}
        >
          Utiliser ma position GPS
        </Button>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Prix / h (FCFA)
          </Text>
          <Input
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            backgroundColor={palette.card}
            borderColor={palette.border}
            color={palette.text}
            borderRadius={14}
            height={52}
          />
        </YStack>

        <YStack
          gap="$1.5"
          onLayout={(e) => onFieldLayout('surface', e.nativeEvent.layout.y)}
        >
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Type de surface
          </Text>
          <Pressable
            onPress={() => {
              const next = !surfaceOpen
              setSurfaceOpen(next)
              if (next) scrollToField('surface', 10, 60)
            }}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor={palette.card}
              borderWidth={1}
              borderColor={surfaceOpen ? palette.primary : palette.border}
              borderRadius={14}
              height={52}
              paddingHorizontal={14}
            >
              <Text color={palette.text} style={{ ...fonts.medium }}>
                {surface}
              </Text>
              <ChevronDown size={18} color={palette.textMuted} />
            </XStack>
          </Pressable>
          {surfaceOpen ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.card,
                overflow: 'hidden',
              }}
            >
              {SURFACE_OPTIONS.map((opt) => {
                const active = opt === surface
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setSurface(opt)
                      setSurfaceOpen(false)
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      backgroundColor: active ? `${palette.primary}22` : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    }}
                  >
                    <Text
                      color={active ? palette.primary : palette.text}
                      style={{ ...(active ? fonts.semibold : fonts.medium) }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Description / Présentation (optionnel)
          </Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Pelouse dernière génération, vestiaires confortables, éclairage LED..."
            multiline
            numberOfLines={3}
            height={80}
            textAlignVertical="top"
            backgroundColor={palette.card}
            borderColor={palette.border}
            color={palette.text}
            borderRadius={14}
            padding={12}
          />
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Équipements & Services
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {AMENITY_OPTIONS.map((a) => {
              const active = selectedAmenities.includes(a.id)
              return (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    setSelectedAmenities((prev) =>
                      active ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                    )
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? `${palette.primary}25` : palette.card,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                  }}
                >
                  <Text
                    fontSize={12}
                    color={active ? palette.primary : palette.textMuted}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {active ? '✓ ' : '+ '}
                    {a.label}
                  </Text>
                </Pressable>
              )
            })}
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Contact gérant (WhatsApp / Appel)
          </Text>
          <Input
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="+225 07 00 00 00 00"
            keyboardType="phone-pad"
            backgroundColor={palette.card}
            borderColor={palette.border}
            color={palette.text}
            borderRadius={14}
            height={50}
          />
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Horaires d’ouverture & fermeture
          </Text>
          <XStack gap={10}>
            <YStack flex={1} gap={4}>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                Ouverture
              </Text>
              <Input
                value={openingTime}
                onChangeText={setOpeningTime}
                placeholder="08:00"
                backgroundColor={palette.card}
                borderColor={palette.border}
                color={palette.text}
                borderRadius={14}
                height={50}
              />
            </YStack>
            <YStack flex={1} gap={4}>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                Fermeture
              </Text>
              <Input
                value={closingTime}
                onChangeText={setClosingTime}
                placeholder="23:00"
                backgroundColor={palette.card}
                borderColor={palette.border}
                color={palette.text}
                borderRadius={14}
                height={50}
              />
            </YStack>
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Photo
          </Text>
          <Button
            backgroundColor={palette.cardElevated}
            borderWidth={1}
            borderColor={palette.border}
            borderRadius={12}
            onPress={async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.85,
              })
              if (!res.canceled && res.assets[0]?.uri) setPhotoUri(res.assets[0].uri)
            }}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              {photoUri ? 'Changer la photo' : 'Ajouter une photo'}
            </Text>
          </Button>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 160, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : null}
        </YStack>

        <Button
          marginTop="$2"
          backgroundColor={palette.primary}
          borderRadius={14}
          height={52}
          disabled={busy}
          opacity={busy ? 0.65 : 1}
          onPress={() => void onSave()}
        >
          <Text color="#fff" style={{ ...fonts.bold }} fontSize={16}>
            {busy ? 'Enregistrement…' : 'Enregistrer le terrain'}
          </Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
