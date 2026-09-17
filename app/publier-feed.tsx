import { useState } from 'react'
import { Alert, ScrollView, TextInput } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { Text, YStack, Button, XStack } from 'tamagui'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { uploadCompressedImage } from '@/lib/storage'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { fonts } from '@/lib/fonts'

/** Composer feed : texte + photo optionnelle. */
export default function PublierFeedScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const [body, setBody] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Autorise l’accès aux photos dans les paramètres de ton téléphone pour ajouter une image.',
        )
        return
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      })
      if (!res.canceled && res.assets[0]?.uri) {
        setImageUri(res.assets[0].uri)
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d’ouvrir la galerie')
    }
  }

  async function submit() {
    if (!supabase || !user) return
    const text = body.trim()
    if (!text && !imageUri) {
      Alert.alert('Feed', 'Écris un message ou ajoute une photo.')
      return
    }
    setBusy(true)
    try {
      let image_url: string | null = null
      if (imageUri) {
        const up = await uploadCompressedImage({
          uri: imageUri,
          kind: 'feed',
          userId: user.id,
        })
        image_url = up.publicUrl
      }

      const { error } = await supabase.from(T.posts).insert({
        author_id: user.id,
        body: text,
        image_url,
      })
      if (error) throw error

      void notifyUser({
        profileId: user.id,
        title: 'Publication en ligne 📸',
        body: 'Ton post est désormais visible sur le feed FUTTO !',
        kind: 'system',
      })

      router.back()
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Publication impossible'
      Alert.alert('Feed', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Publier',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Quoi de neuf sur le terrain ?"
          placeholderTextColor={palette.textMuted}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 140,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            color: palette.text,
            padding: 14,
            fontSize: 15,
            ...fonts.regular,
          }}
        />

        <XStack gap={10}>
          <Button
            flex={1}
            backgroundColor={palette.cardElevated}
            borderRadius={12}
            borderWidth={1}
            borderColor={palette.border}
            onPress={() => void pickImage()}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              {imageUri ? 'Changer la photo' : 'Ajouter une photo'}
            </Text>
          </Button>
          {imageUri ? (
            <Button
              backgroundColor={palette.card}
              borderRadius={12}
              borderWidth={1}
              borderColor={palette.border}
              onPress={() => setImageUri(null)}
            >
              <Text color={palette.danger} style={{ ...fonts.semibold }}>
                Retirer
              </Text>
            </Button>
          ) : null}
        </XStack>

        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 220, borderRadius: 14 }}
            contentFit="cover"
          />
        ) : null}

        <Button
          backgroundColor={palette.primary}
          borderRadius={14}
          height={52}
          disabled={busy}
          onPress={() => void submit()}
        >
          <Text color="#fff" style={{ ...fonts.bold }}>
            {busy ? 'Publication…' : 'Publier'}
          </Text>
        </Button>
      </ScrollView>
    </YStack>
  )
}
