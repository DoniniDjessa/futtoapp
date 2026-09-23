import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable } from 'react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Clock, MapPin, Users, Wallet } from 'lucide-react-native'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { matchInviteMessage, openWhatsAppInvite, shareInvite } from '@/lib/share'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import { joinModeLabel, matchStatusLabel } from '@/lib/labels'

/** Page publique lue via le lien partagé https://futto.app/m/{token}. */
export default function MatchShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const [info, setInfo] = useState<{
    id: string
    title: string
    terrain_label: string | null
    zone: string | null
    kickoff_at: string | null
    format: string | null
    spots_total: number
    spots_taken: number
    spots_min: number | null
    join_mode: 'free' | 'adhesion' | string
    price_participation: number
    status: string
    host_pseudo?: string | null
    host_full_name?: string | null
    share_token?: string | null
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !token) return
    const { data } = await supabase.rpc('futto_match_by_token', { p_token: token })
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null
    setInfo(row ?? null)
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function join() {
    if (!supabase || !token || !info) return
    if (!user) {
      Alert.alert('Connexion', 'Connecte-toi pour rejoindre ce match.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ])
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('futto_join_match', {
      p_match_id: info.id,
      p_token: token,
    })
    setBusy(false)
    if (error) {
      Alert.alert('Rejoindre', error.message)
      return
    }
    setJoined(true)
    Alert.alert('Inscription confirmée ⚽', `Tu as rejoint « ${info.title} ».`, [
      {
        text: 'Voir le match',
        onPress: () => router.replace(`/match/${info.id}`),
      },
    ])
  }

  const when = info?.kickoff_at
    ? new Date(info.kickoff_at).toLocaleString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'date à confirmer'

  const price =
    info?.join_mode === 'adhesion' && (info.price_participation || 0) > 0
      ? formatFCFA(info.price_participation)
      : 'Gratuit'

  const hostName = info?.host_pseudo ? `@${info.host_pseudo}` : info?.host_full_name || 'Hôte FUTTO'

  const inviteText = info
    ? matchInviteMessage({
        title: info.title,
        terrain: info.terrain_label,
        kickoffAt: info.kickoff_at,
        spotsTaken: info.spots_taken,
        spotsTotal: info.spots_total,
        joinMode: info.join_mode === 'adhesion' ? 'adhesion' : 'free',
        price: info.price_participation,
        shareToken: token,
      })
    : ''

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Invitation match',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      {!info ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={32} gap={12}>
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement de l'invitation…
          </Text>
        </YStack>
      ) : (
        <YStack flex={1} padding={20} gap={16}>
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={20}
            gap={14}
          >
            <Text color={palette.accent} fontSize={12} style={{ ...fonts.bold }}>
              {matchStatusLabel(info.status)} · {joinModeLabel(info.join_mode as 'free' | 'adhesion')}
            </Text>
            <Text fontFamily="$heading" fontSize={26} color={palette.text}>
              {info.title}
            </Text>

            <YStack gap={10}>
              <XStack alignItems="center" gap={10}>
                <MapPin size={18} color={palette.primary} />
                <Text color={palette.text} flex={1} style={{ ...fonts.medium }}>
                  {info.terrain_label || 'Terrain'} {info.zone ? `· ${info.zone}` : ''}
                </Text>
              </XStack>
              <XStack alignItems="center" gap={10}>
                <Clock size={18} color={palette.primary} />
                <Text color={palette.text} flex={1} style={{ ...fonts.medium }}>
                  {when}
                </Text>
              </XStack>
              <XStack alignItems="center" gap={10}>
                <Users size={18} color={palette.primary} />
                <Text color={palette.text} flex={1} style={{ ...fonts.medium }}>
                  {info.spots_taken}/{info.spots_total} places
                  {info.spots_min ? ` · min ${info.spots_min}` : ''}
                </Text>
              </XStack>
              <XStack alignItems="center" gap={10}>
                <Wallet size={18} color={palette.gold} />
                <Text color={palette.gold} flex={1} style={{ ...fonts.bold }}>
                  {price}
                  {info.join_mode === 'adhesion' ? ' / joueur' : ''}
                </Text>
              </XStack>
            </YStack>

            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Organisé par {hostName}
            </Text>
          </YStack>

          <Pressable onPress={() => void join()} disabled={busy}>
            <YStack
              height={54}
              borderRadius={16}
              backgroundColor={palette.primary}
              alignItems="center"
              justifyContent="center"
              opacity={busy ? 0.65 : 1}
            >
              <Text color="#fff" fontFamily="$heading" fontSize={15} style={{ ...fonts.bold }}>
                {joined ? 'Inscrit ✔' : busy ? 'Inscription…' : 'Rejoindre ce match'}
              </Text>
            </YStack>
          </Pressable>

          {!joined ? (
            <XStack gap={10}>
              <Button
                flex={1}
                backgroundColor={palette.accent}
                borderRadius={14}
                height={48}
                onPress={() => void openWhatsAppInvite(inviteText)}
              >
                <Text color="#fff" style={{ ...fonts.bold }}>
                  WhatsApp
                </Text>
              </Button>
              <Button
                flex={1}
                backgroundColor={palette.cardElevated}
                borderWidth={1}
                borderColor={palette.border}
                borderRadius={14}
                height={48}
                onPress={() => void shareInvite(inviteText)}
              >
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  Partager
                </Text>
              </Button>
            </XStack>
          ) : null}
        </YStack>
      )}
    </YStack>
  )
}