import { useMemo, useState } from 'react'
import { Alert, Image, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import {
  Award,
  BarChart3,
  CalendarCheck,
  Camera,
  ChevronRight,
  Settings,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { MenuButton } from '@/components/MenuButton'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { uploadCompressedImage } from '@/lib/storage'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, toColor } from '@/lib/theme'
import { computePlayerBadge } from '@/lib/player-badge'
import { useMatches } from '@/lib/data'
import { PlayerAvailabilityCard } from '@/components/PlayerAvailabilityCard'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

const links = [
  { href: '/mon-equipe', label: 'Mon équipe', Icon: Shield },
  { href: '/amis', label: 'Amis & Réseau', Icon: Users },
  { href: '/stats', label: 'Mes statistiques', Icon: BarChart3 },
  { href: '/mes-reservations', label: 'Mes réservations', Icon: CalendarCheck },
  { href: '/classement', label: 'Mon classement', Icon: Trophy },
] as const

/** Profil tab — peau démo (cover + carte joueur + liens). */
export default function ProfilScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile, refreshProfile, setAvailableToPlay } = useAuth()
  const { matches } = useMatches()
  const [busy, setBusy] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)

  const playedCount = useMemo(
    () => matches.filter((m) => m.status === 'played').length,
    [matches],
  )
  const organizedCount = useMemo(
    () => (user ? matches.filter((m) => m.host_id === user.id).length : 0),
    [matches, user],
  )

  const displayName =
    profile?.full_name || profile?.first_name || profile?.pseudo || 'Joueur FUTTO'

  const ratingNumber =
    profile?.rating != null &&
    Number(profile.rating) > 0 &&
    Number(profile.rating) !== 3.0 &&
    Number(profile.rating) !== 3
      ? Number(profile.rating)
      : null

  const badge = useMemo(
    () =>
      computePlayerBadge({
        playedCount,
        organizedCount,
        rating: ratingNumber,
        skillLevel: profile?.skill_level,
      }),
    [playedCount, organizedCount, ratingNumber, profile?.skill_level],
  )

  async function pickAvatar() {
    if (!supabase) return
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour modifier ta photo de profil.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ])
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Autorise l’accès aux photos dans les paramètres de ton téléphone pour choisir un avatar.',
        )
        return
      }

      let res: ImagePicker.ImagePickerResult
      try {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })
      } catch {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        })
      }

      if (res.canceled || !res.assets?.[0]?.uri) return

      const pickedUri = res.assets[0].uri
      // Aperçu instantané
      setAvatarPreview(pickedUri)
      setBusy(true)

      const up = await uploadCompressedImage({
        uri: pickedUri,
        kind: 'avatars',
        userId: user.id,
        maxWidth: 512,
        quality: 0.85,
      })

      const { error } = await supabase
        .from(T.profiles)
        .update({ avatar_url: up.publicUrl })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
    } catch (e) {
      setAvatarPreview(null)
      Alert.alert('Photo de profil', e instanceof Error ? e.message : 'Erreur lors du téléversement')
    } finally {
      setBusy(false)
    }
  }

  async function pickCover() {
    if (!supabase) return
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour modifier ta photo de couverture.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ])
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Autorise l’accès aux photos dans les paramètres de ton téléphone pour choisir une couverture.',
        )
        return
      }

      let res: ImagePicker.ImagePickerResult
      try {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.85,
        })
      } catch {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        })
      }

      if (res.canceled || !res.assets?.[0]?.uri) return

      const pickedUri = res.assets[0].uri
      // Aperçu instantané
      setCoverPreview(pickedUri)
      setBusy(true)

      const up = await uploadCompressedImage({
        uri: pickedUri,
        kind: 'covers',
        userId: user.id,
        maxWidth: 1440,
        quality: 0.85,
      })

      const { error } = await supabase
        .from(T.profiles)
        .update({ cover_url: up.publicUrl })
        .eq('id', user.id)

      if (error) {
        if (/column.*cover_url.*does not exist/i.test(error.message)) {
          Alert.alert(
            'Migration requise',
            'La colonne cover_url doit être appliquée dans Supabase. Exécute la migration dans le Dashboard Supabase SQL.',
          )
        } else {
          throw error
        }
      }

      await refreshProfile()
    } catch (e) {
      setCoverPreview(null)
      Alert.alert('Photo de couverture', e instanceof Error ? e.message : 'Erreur lors du téléversement')
    } finally {
      setBusy(false)
    }
  }

  const currentCover = coverPreview || profile?.cover_url
  const currentAvatar = avatarPreview || profile?.avatar_url

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <YStack position="relative">
          {/* Bannière de couverture avec photo ou dégradé par défaut */}
          <YStack
            height={175}
            position="relative"
            overflow="hidden"
            backgroundColor={palette.primaryDark}
            zIndex={1}
          >
            {currentCover ? (
              <Image
                source={{ uri: currentCover }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}

            {/* Voile sombre pour lisibilité */}
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor={currentCover ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.08)'}
            />

            {/* Bouton visible pour ajouter / modifier la couverture */}
            <Pressable
              onPress={() => void pickCover()}
              disabled={busy}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                zIndex: 25,
                elevation: 10,
              }}
            >
              <Camera size={13} color="#fff" />
              <Text color="#fff" fontSize={11} style={{ ...fonts.semibold }}>
                {busy && coverPreview ? 'Envoi…' : currentCover ? 'Modifier couverture' : 'Ajouter couverture'}
              </Text>
            </Pressable>
          </YStack>

          {/* Navigation haute */}
          <XStack
            position="absolute"
            top={56}
            left={20}
            right={20}
            justifyContent="space-between"
            alignItems="center"
            zIndex={30}
          >
            <MenuButton />
            <Pressable
              onPress={() => router.push('/parametres')}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={16} color="#fff" />
            </Pressable>
          </XStack>

          {/* Avatar avec icône caméra bien visible */}
          <YStack
            alignItems="center"
            marginTop={-52}
            paddingHorizontal={20}
            pointerEvents="box-none"
            zIndex={10}
          >
            <Pressable
              onPress={() => {
                if (currentAvatar) {
                  setViewerImage({ url: currentAvatar, title: displayName })
                } else {
                  void pickAvatar()
                }
              }}
              disabled={busy}
              style={{ position: 'relative', pointerEvents: 'auto' }}
            >
              <YStack
                borderWidth={4}
                borderColor={palette.bg}
                borderRadius={52}
                overflow="hidden"
              >
                <Avatar
                  initials={initials(displayName)}
                  color={palette.primary}
                  size={96}
                  uri={currentAvatar}
                />
              </YStack>
              {/* Badge d'action Caméra */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  void pickAvatar()
                }}
                disabled={busy}
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: palette.primary,
                  borderWidth: 2.5,
                  borderColor: palette.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 6,
                  zIndex: 15,
                }}
              >
                <Camera size={13} color="#fff" />
              </Pressable>
            </Pressable>

            <Text
              marginTop={12}
              fontFamily="$heading"
              fontSize={28}
              color={palette.text}
            >
              {displayName}
            </Text>
            {profile?.pseudo ? (
              <Text color={palette.primary} fontSize={13} style={{ ...fonts.semibold }}>
                @{profile.pseudo}
              </Text>
            ) : null}
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              {[profile?.position, profile?.city || 'Abidjan'].filter(Boolean).join(' · ')}
            </Text>

            {/* Badge dynamique & Note (Néant par défaut) */}
            <XStack marginTop={10} alignItems="center" gap={10}>
              <XStack
                alignItems="center"
                gap={6}
                backgroundColor={toColor(badge.bgColor)}
                paddingHorizontal={12}
                paddingVertical={5}
                borderRadius={999}
              >
                <Award size={13} color={badge.color} />
                <Text color={toColor(badge.color)} fontSize={12} style={{ ...fonts.bold }}>
                  {badge.label}
                </Text>
              </XStack>

              <XStack
                alignItems="center"
                gap={5}
                backgroundColor={palette.card}
                paddingHorizontal={10}
                paddingVertical={5}
                borderRadius={999}
                borderWidth={1}
                borderColor={palette.border}
              >
                <Star
                  size={13}
                  color={ratingNumber != null ? palette.gold : palette.textMuted}
                  fill={ratingNumber != null ? palette.gold : 'transparent'}
                />
                <Text
                  color={ratingNumber != null ? palette.text : palette.textMuted}
                  fontSize={12}
                  style={{ ...fonts.semibold }}
                >
                  {ratingNumber != null ? ratingNumber.toFixed(1) : 'Note : Néant'}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>

        {/* Carte Statut Joueur : Je suis disponible pour jouer (icônes 2D) */}
        <YStack marginTop={20} paddingHorizontal={20}>
          <PlayerAvailabilityCard
            isAvailable={Boolean(profile?.is_available_to_play)}
            palette={palette}
            onToggle={async (val) => {
              await setAvailableToPlay(val)
              void refreshProfile()
            }}
          />
        </YStack>

        <YStack marginTop={20} paddingHorizontal={20}>
          <YStack
            borderRadius={24}
            borderWidth={1}
            borderColor={`${palette.gold}4D`}
            backgroundColor={palette.card}
            padding={20}
            gap={16}
          >
            <Text
              color={palette.gold}
              fontSize={12}
              letterSpacing={2}
              style={{ ...fonts.bold }}
            >
              CARTE DE JOUEUR
            </Text>
            <XStack gap={10}>
              <StatCard
                Icon={CalendarCheck}
                value={playedCount}
                label="Matchs"
                palette={palette}
              />
              <StatCard Icon={Target} value={0} label="Buts" palette={palette} />
              <StatCard Icon={Trophy} value={0} label="Victoires" palette={palette} />
            </XStack>
          </YStack>
        </YStack>

        <YStack marginTop={20} paddingHorizontal={20} gap={8}>
          {links.map(({ href, label, Icon }) => (
            <Pressable key={href} onPress={() => router.push(href as '/stats')}>
              <XStack
                alignItems="center"
                gap={12}
                borderRadius={16}
                borderWidth={1}
                borderColor={palette.border}
                backgroundColor={palette.card}
                paddingHorizontal={16}
                paddingVertical={14}
              >
                <Icon size={20} color={palette.primary} />
                <Text flex={1} color={palette.text} style={{ ...fonts.medium }}>
                  {label}
                </Text>
                <ChevronRight size={20} color={palette.textMuted} />
              </XStack>
            </Pressable>
          ))}

          <Button
            marginTop={8}
            backgroundColor={palette.card}
            borderWidth={1}
            borderColor={palette.border}
            borderRadius={16}
            height={50}
            onPress={() => router.push('/profil-edit')}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              Modifier mon profil
            </Text>
          </Button>
        </YStack>
      </ScrollView>

      {/* Visualiseur de photo en grand format */}
      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </YStack>
  )
}

function StatCard({
  Icon,
  value,
  label,
  palette,
}: {
  Icon: typeof Trophy
  value: number
  label: string
  palette: typeof colors | typeof lightColors
}) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      borderRadius={16}
      backgroundColor={palette.bg}
      paddingVertical={12}
      gap={4}
    >
      <Icon size={18} color={palette.primary} />
      <Text fontFamily="$heading" fontSize={22} color={palette.text} style={{ ...fonts.bold }}>
        {value}
      </Text>
      <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
        {label}
      </Text>
    </YStack>
  )
}
