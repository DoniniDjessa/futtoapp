import { useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { Stack } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Text, YStack, Input, Button } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { uploadCompressedImage } from '@/lib/storage'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

export default function ProfilScreen() {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('Abidjan')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || profile.first_name || '')
    setPseudo(profile.pseudo || '')
    setPosition(profile.position || '')
    setPhone(profile.phone || '')
    setCity(profile.city || 'Abidjan')
  }, [profile])

  async function save() {
    if (!supabase || !user) return
    const cleanPseudo = pseudo
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
    if (cleanPseudo.length < 3) {
      Alert.alert('Profil', 'Pseudo : 3 caractères minimum.')
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from(T.profiles)
      .update({
        full_name: fullName.trim() || null,
        first_name: fullName.trim().split(/\s+/)[0] || null,
        pseudo: cleanPseudo,
        position: position.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || 'Abidjan',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    setBusy(false)
    if (error) Alert.alert('Profil', error.message)
    else {
      await refreshProfile()
      Alert.alert('OK', 'Profil mis à jour.')
    }
  }

  async function pickAvatar() {
    if (!supabase || !user) return
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (res.canceled || !res.assets[0]?.uri) return
    setBusy(true)
    try {
      const up = await uploadCompressedImage({
        uri: res.assets[0].uri,
        kind: 'avatars',
        userId: user.id,
        maxWidth: 512,
      })
      const { error } = await supabase
        .from(T.profiles)
        .update({ avatar_url: up.publicUrl })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
    } catch (e) {
      Alert.alert('Avatar', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Modifier le profil',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {!profile ? (
          <Text color={palette.textMuted}>Connecte-toi pour éditer ton profil.</Text>
        ) : (
          <>
            <YStack alignItems="center" gap={10} marginBottom={8}>
              <Avatar
                initials={initials(fullName || profile.full_name)}
                color={palette.primary}
                size={88}
                uri={profile.avatar_url}
              />
              <Button size="$3" backgroundColor={palette.cardElevated} borderRadius={12} onPress={() => void pickAvatar()}>
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  Changer la photo
                </Text>
              </Button>
            </YStack>
            <Input
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nom complet"
              backgroundColor={palette.card}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={52}
            />
            <Input
              value={pseudo}
              onChangeText={(t) => setPseudo(t.toLowerCase().replace(/\s+/g, ''))}
              placeholder="Pseudo"
              autoCapitalize="none"
              backgroundColor={palette.card}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={52}
            />
            <Input
              value={position}
              onChangeText={setPosition}
              placeholder="Poste (ex. Ailier)"
              backgroundColor={palette.card}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={52}
            />
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Téléphone"
              keyboardType="phone-pad"
              backgroundColor={palette.card}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={52}
            />
            <Input
              value={city}
              onChangeText={setCity}
              placeholder="Ville"
              backgroundColor={palette.card}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={52}
            />
            <Button
              backgroundColor={palette.primary}
              borderRadius={14}
              height={52}
              disabled={busy}
              onPress={() => void save()}
            >
              <Text color="#fff" style={{ ...fonts.bold }}>
                {busy ? '…' : 'Enregistrer'}
              </Text>
            </Button>
          </>
        )}
      </ScrollView>
    </YStack>
  )
}
