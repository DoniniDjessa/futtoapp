import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView } from 'react-native'
import { Text, YStack, XStack, Button, Input } from 'tamagui'
import { MatchDateTimeField } from '@/components/MatchDateTimeField'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { useSafeDismiss } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import type { Terrain } from '@/lib/types'

/** Demande de créneau terrain (≠ créer un match). */
export default function DemanderCreneauScreen() {
  const { terrainId } = useLocalSearchParams<{ terrainId: string }>()
  const dismiss = useSafeDismiss()
  const router = useRouter()
  const { user } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const [terrain, setTerrain] = useState<Terrain | null>(null)
  const [startsAt, setStartsAt] = useState<Date | null>(
    () => new Date(Date.now() + 24 * 3600_000),
  )
  const [hours, setHours] = useState('1')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !terrainId) return
    void supabase
      .from(T.terrains)
      .select('*')
      .eq('id', terrainId)
      .maybeSingle()
      .then(({ data }) => setTerrain((data as Terrain) ?? null))
  }, [terrainId])

  const amount = useMemo(() => {
    const h = Number(hours) || 1
    return Math.round((terrain?.price_per_hour ?? 0) * h)
  }, [hours, terrain?.price_per_hour])

  async function submit() {
    if (!user || !supabase || !terrain || !startsAt) {
      setError('Connexion et créneau requis.')
      return
    }
    const duration = Number(hours)
    if (!(duration > 0) || duration > 8) {
      setError('Durée entre 0.5 et 8 h.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from(T.bookings)
        .insert({
          terrain_id: terrain.id,
          requester_id: user.id,
          starts_at: startsAt.toISOString(),
          duration_hours: duration,
          amount_fcfa: amount,
          status: 'requested',
          note: note.trim() || null,
        })
        .select('id')
        .single()
      if (err) throw err

      if (terrain.created_by && terrain.created_by !== user.id) {
        void notifyUser({
          profileId: terrain.created_by,
          title: 'Nouvelle demande de créneau ⚽',
          body: `Demande reçue pour « ${terrain.name} » (${startsAt.toLocaleDateString('fr-FR')} - ${duration}h). Consultez vos réservations.`,
          kind: 'booking',
          data: { bookingId: data?.id, terrainId: terrain.id },
        })
      }

      void notifyUser({
        profileId: user.id,
        title: 'Demande de créneau envoyée ⏳',
        body: `Votre demande pour « ${terrain.name} » (${startsAt.toLocaleDateString('fr-FR')} - ${duration}h) a été transmise au gérant.`,
        kind: 'booking',
        data: { bookingId: data?.id, terrainId: terrain.id },
      })

      Alert.alert(
        'Demande envoyée',
        'Statut : demandé (pas encore confirmé). Le gérant doit valider.',
        [
          {
            text: 'OK',
            onPress: () => {
              dismiss()
              if (data?.id) router.push(`/mes-reservations` as never)
            },
          },
        ],
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Demander un créneau',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Demande ≠ réservé. Le gérant confirme, tu paies ensuite.
        </Text>
        {terrain ? (
          <YStack
            backgroundColor={palette.card}
            borderRadius={14}
            padding={14}
            borderWidth={1}
            borderColor={palette.border}
            gap={4}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              {terrain.name}
            </Text>
            <Text color={palette.gold} fontFamily="$heading">
              {formatFCFA(terrain.price_per_hour)} / h
            </Text>
          </YStack>
        ) : (
          <Text color={palette.textMuted}>Chargement terrain…</Text>
        )}

        {error ? (
          <Text color="#fca5a5" style={{ ...fonts.medium }}>
            {error}
          </Text>
        ) : null}

        <MatchDateTimeField value={startsAt} onChange={setStartsAt} palette={palette} />

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }}>
            Durée (heures)
          </Text>
          <XStack gap={8}>
            {['1', '1.5', '2', '3'].map((h) => (
              <Pressable
                key={h}
                onPress={() => setHours(h)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: hours === h ? palette.primary : palette.card,
                  borderWidth: 1,
                  borderColor: hours === h ? palette.primary : palette.border,
                }}
              >
                <Text color={hours === h ? '#fff' : palette.text} style={{ ...fonts.bold }}>
                  {h}h
                </Text>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Text color={palette.text} style={{ ...fonts.semibold }}>
            Note (optionnel)
          </Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Ex. match 7v7, besoin filets…"
            backgroundColor={palette.card}
            borderColor={palette.border}
            color={palette.text}
            borderRadius={14}
            height={52}
          />
        </YStack>

        <Text color={palette.text} fontFamily="$heading" fontSize={22}>
          Total estimé : {formatFCFA(amount)}
        </Text>

        <Button
          backgroundColor={palette.primary}
          borderRadius={14}
          height={52}
          disabled={busy || !terrain}
          opacity={busy ? 0.65 : 1}
          onPress={() => void submit()}
        >
          <Text color="#fff" style={{ ...fonts.bold }}>
            {busy ? 'Envoi…' : 'Envoyer la demande'}
          </Text>
        </Button>
      </ScrollView>
    </YStack>
  )
}
