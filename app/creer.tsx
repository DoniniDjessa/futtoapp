import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import {
  CalendarClock,
  Check,
  ChevronDown,
  Globe,
  Lock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
} from 'lucide-react-native'
import { Text, YStack, Button, XStack, Input } from 'tamagui'
import Slider from '@react-native-community/slider'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { MatchDateTimeField } from '@/components/MatchDateTimeField'
import { useMyTeam } from '@/lib/data'
import { useAuth } from '@/lib/auth'
import { useSafeDismiss } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { MAX_ADHESION_FCFA, T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import { useFormScroll } from '@/lib/form-scroll'
import type { Terrain, TerrainBooking } from '@/lib/types'

const MATCH_TYPES = [
  { id: 'amical', label: 'Amical', Icon: Users, desc: 'Entre potes, sans enjeu' },
  { id: 'public', label: 'Public', Icon: Globe, desc: 'Ouvert à tous les joueurs' },
  { id: 'prive', label: 'Privé', Icon: Lock, desc: 'Sur invitation uniquement' },
  { id: 'tournoi', label: 'Tournoi', Icon: Trophy, desc: 'Compétition à plusieurs équipes' },
] as const

const QUICK_PRICES = [0, 1000, 1500, 2000, 2500, 5000]

const FORMAT_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const n = i + 4
  return `${n}v${n}`
})

type MatchTypeId = (typeof MATCH_TYPES)[number]['id']

function errMessage(e: unknown): string {
  if (!e) return 'Erreur enregistrement'
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown }
    return [o.message, o.details, o.hint].filter(Boolean).map(String).join(' — ')
  }
  return 'Erreur enregistrement'
}

function sideCount(format: string): number {
  const n = Number(format.split('v')[0])
  return Number.isFinite(n) && n >= 4 ? n : 5
}

/** Créer un match — requiert un créneau terrain validé par le propriétaire ou le backoffice. */
export default function CreerMatchScreen() {
  const dismiss = useSafeDismiss('/')
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile } = useAuth()
  const { team, members } = useMyTeam()
  const [inviteTeamAuto, setInviteTeamAuto] = useState(true)

  const [type, setType] = useState<MatchTypeId>('amical')
  const [terrain, setTerrain] = useState<Terrain | null>(null)
  const [kickoff, setKickoff] = useState<Date | null>(null)
  const [format, setFormat] = useState<string>('5v5')
  const [formatOpen, setFormatOpen] = useState(false)
  const [price, setPrice] = useState(0)
  const [priceInput, setPriceInput] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)
  const { scrollRef, onFieldLayout, scrollToField } = useFormScroll()

  // Créneaux de terrain validés pour cet utilisateur
  const [validatedBookings, setValidatedBookings] = useState<
    Array<TerrainBooking & { futto_terrains?: Terrain | null }>
  >([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const loadValidatedBookings = useCallback(async () => {
    if (!supabase || !user) {
      setLoadingBookings(false)
      return
    }
    setLoadingBookings(true)
    try {
      const { data, error: bErr } = await supabase
        .from(T.bookings)
        .select('*, futto_terrains(*)')
        .eq('requester_id', user.id)
        .in('status', ['confirmed', 'paid'])
        .is('match_id', null)
        .order('starts_at', { ascending: true })

      if (!bErr && data) {
        const rows = data as Array<TerrainBooking & { futto_terrains?: Terrain | null }>
        setValidatedBookings(rows)
        if (rows.length > 0) {
          const first = rows[0]
          setSelectedBookingId(first.id)
          if (first.futto_terrains) setTerrain(first.futto_terrains)
          if (first.starts_at) setKickoff(new Date(first.starts_at))
        }
      }
    } finally {
      setLoadingBookings(false)
    }
  }, [user])

  useEffect(() => {
    void loadValidatedBookings()
  }, [loadValidatedBookings])

  const n = sideCount(format)
  const spotsMin = n
  const spotsMax = n * 2

  const visibility = useMemo(() => {
    if (type === 'public') return 'public' as const
    if (type === 'prive') return 'private' as const
    return 'private' as const // amical
  }, [type])

  const joinMode = price > 0 ? ('adhesion' as const) : ('free' as const)

  function onPickType(id: MatchTypeId) {
    if (id === 'tournoi') {
      router.push('/creer-tournoi')
      return
    }
    setType(id)
  }

  async function insertMatch(payload: Record<string, unknown>) {
    if (!supabase) throw new Error('Supabase non configuré')
    return supabase.from(T.matches).insert(payload).select('id').single()
  }

  async function publish() {
    if (!user) {
      Alert.alert('Connexion', 'Connecte-toi pour créer un match.')
      return
    }
    if (!terrain) {
      setError('Sélectionne un créneau de terrain validé.')
      return
    }
    if (!kickoff) {
      setError('Choisis la date et l’heure.')
      return
    }
    if (!supabase) {
      setError('Supabase non configuré')
      return
    }
    if (price > MAX_ADHESION_FCFA) {
      setError(`Prix max ${MAX_ADHESION_FCFA.toLocaleString('fr-FR')} FCFA.`)
      return
    }

    const typeLabel = MATCH_TYPES.find((t) => t.id === type)?.label ?? 'Match'
    const title = `${typeLabel} · ${terrain.name}`

    setBusy(true)
    setError(null)
    try {
      const share_token = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      const fullPayload: Record<string, unknown> = {
        host_id: user.id,
        title,
        visibility,
        terrain_id: terrain.id,
        terrain_label: terrain.name,
        zone: terrain.zone ?? terrain.quartier,
        kickoff_at: kickoff.toISOString(),
        format,
        status: visibility === 'private' ? 'draft' : 'planned',
        spots_total: spotsMax,
        spots_min: spotsMin,
        spots_taken: 0,
        join_mode: joinMode,
        price_participation: price,
        share_token,
        booking_id: selectedBookingId,
      }

      let { data, error: insertErr } = await insertMatch(fullPayload)
      if (insertErr) {
        const msg = errMessage(insertErr)
        const retry = { ...fullPayload }
        if (/spots_min|join_mode|share_token|column|schema cache/i.test(msg)) {
          delete retry.spots_min
          delete retry.join_mode
          delete retry.share_token
        }
        if (/visibility|both/i.test(msg)) {
          retry.visibility = visibility === 'public' ? 'public' : 'private'
        }
        const second = await insertMatch(retry)
        data = second.data
        insertErr = second.error
        if (insertErr) {
          const minimal = {
            host_id: user.id,
            title,
            visibility: visibility === 'public' ? 'public' : 'private',
            terrain_id: terrain.id,
            terrain_label: terrain.name,
            zone: terrain.zone ?? terrain.quartier,
            kickoff_at: kickoff.toISOString(),
            format,
            status: visibility === 'private' ? 'draft' : 'planned',
            spots_total: spotsMax,
            spots_taken: 0,
            price_participation: price,
          }
          const third = await insertMatch(minimal)
          data = third.data
          insertErr = third.error
        }
      }
      if (insertErr) throw insertErr
      if (!data?.id) throw new Error('Match créé sans id')

      await supabase.from(T.matchPlayers).insert({
        match_id: data.id,
        profile_id: user.id,
        display_name: profile?.pseudo || profile?.full_name || profile?.first_name || 'Hôte',
        status: 'joined',
      })

      if (selectedBookingId) {
        await supabase
          .from(T.bookings)
          .update({ match_id: data.id })
          .eq('id', selectedBookingId)
      }

      if (inviteTeamAuto && members.length > 0) {
        const phones = members.map((m) => m.phone?.trim()).filter(Boolean) as string[]
        const profileMap = new Map<string, string>()
        if (phones.length > 0) {
          const { data: matched } = await supabase
            .from(T.profiles)
            .select('id, phone')
            .in('phone', phones)
          for (const mp of matched || []) {
            if (mp.phone) profileMap.set(mp.phone.trim(), mp.id)
          }
        }

        const teamInvites = members.map((m) => {
          const profileId = m.phone ? profileMap.get(m.phone.trim()) || null : null
          return {
            match_id: data.id,
            profile_id: profileId,
            display_name: m.display_name,
            phone: m.phone || null,
            status: 'invited',
          }
        })
        await supabase.from(T.matchPlayers).insert(teamInvites)

        void import('@/lib/push').then(({ notifyUser }) => {
          for (const [_, pid] of profileMap) {
            void notifyUser({
              profileId: pid,
              title: 'Invitation de ton équipe ⚽',
              body: `${profile?.pseudo ? `@${profile.pseudo}` : 'Ton capitaine'} t'a invité pour « ${title} ».`,
              kind: 'invite',
              data: { matchId: data.id },
            })
          }
        })
      }

      void import('@/lib/push').then(({ scheduleMatchReminder, notifyUser }) => {
        if (kickoff) {
          void scheduleMatchReminder({
            matchId: data.id,
            title,
            kickoffAt: kickoff.toISOString(),
          })
        }

        // Notifier le créateur
        void notifyUser({
          profileId: user.id,
          title: 'Match créé avec succès ! ⚽',
          body: `Ton match « ${title} » est prêt. Invite des joueurs pour compléter l'effectif !`,
          kind: 'match',
          data: { matchId: data.id },
        })

        // Notifier le gérant du terrain
        if (terrain?.created_by && terrain.created_by !== user.id) {
          void notifyUser({
            profileId: terrain.created_by,
            title: 'Nouveau match sur votre terrain ⚽',
            body: `Le match « ${title} » a été programmé sur « ${terrain.name} ».`,
            kind: 'system',
            data: { matchId: data.id, terrainId: terrain.id },
          })
        }
      })

      setDoneId(data.id)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (doneId) {
    return (
      <YStack flex={1} backgroundColor={palette.bg} alignItems="center" justifyContent="center" padding={32}>
        <Stack.Screen options={{ title: 'Créer un match', headerShown: true }} />
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor={palette.primary}
          alignItems="center"
          justifyContent="center"
        >
          <Check size={40} color="#fff" />
        </YStack>
        <Text marginTop={24} fontFamily="$heading" fontSize={28} color={palette.text}>
          Match publié !
        </Text>
        <Text
          marginTop={8}
          color={palette.textMuted}
          fontSize={14}
          textAlign="center"
          style={{ ...fonts.regular }}
        >
          Ton match {MATCH_TYPES.find((m) => m.id === type)?.label.toLowerCase()} est prêt. Les
          joueurs peuvent le rejoindre.
        </Text>
        <XStack marginTop={28} gap={12}>
          <Button
            borderRadius={999}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.card}
            onPress={() => {
              setDoneId(null)
              setError(null)
            }}
          >
            <Text color={palette.text} style={{ ...fonts.semibold }}>
              Créer un autre
            </Text>
          </Button>
          <Button
            borderRadius={999}
            backgroundColor={palette.primary}
            onPress={() => {
              dismiss()
              router.push(`/match/${doneId}`)
            }}
          >
            <Text color="#fff" style={{ ...fonts.bold }}>
              Voir le match
            </Text>
          </Button>
        </XStack>
      </YStack>
    )
  }

  if (loadingBookings) {
    return (
      <YStack flex={1} backgroundColor={palette.bg} alignItems="center" justifyContent="center" padding={24}>
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: palette.card },
            headerTintColor: palette.text,
            title: 'Créer un match',
          }}
        />
        <FuttoLogoLoader size={60} label="Vérification de tes terrains validés…" />
      </YStack>
    )
  }

  if (validatedBookings.length === 0) {
    return (
      <YStack flex={1} backgroundColor={palette.bg}>
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: palette.card },
            headerTintColor: palette.text,
            title: 'Créer un match',
          }}
        />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            gap: 16,
          }}
        >
          <YStack
            backgroundColor={palette.card}
            borderRadius={24}
            borderWidth={1}
            borderColor={palette.border}
            padding={24}
            alignItems="center"
            gap={16}
            maxWidth={380}
            width="100%"
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: 'rgba(234, 179, 8, 0.14)',
                borderWidth: 1.5,
                borderColor: 'rgba(234, 179, 8, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={36} color="#eab308" />
            </View>

            <YStack alignItems="center" gap={6}>
              <Text
                color={palette.text}
                fontSize={19}
                textAlign="center"
                style={{ ...fonts.bold }}
              >
                Aucun terrain validé
              </Text>
              <Text
                color={palette.textMuted}
                fontSize={13}
                textAlign="center"
                lineHeight={20}
                style={{ ...fonts.regular }}
              >
                Avant de créer un match, votre réservation de terrain doit obligatoirement être{' '}
                <Text color={palette.primary} style={{ ...fonts.bold }}>
                  validée par le propriétaire du terrain ou par le backoffice
                </Text>
                .{'\n\n'}
                Une fois votre créneau validé, il apparaîtra ici et vous pourrez finaliser la création de votre match !
              </Text>
            </YStack>

            <YStack width="100%" gap={10} marginTop={6}>
              <Button
                backgroundColor={palette.primary}
                borderRadius={14}
                height={48}
                onPress={() => router.push('/reserver')}
              >
                <XStack alignItems="center" gap={8}>
                  <MapPin size={18} color="#fff" />
                  <Text color="#fff" fontSize={14} style={{ ...fonts.bold }}>
                    Réserver un terrain
                  </Text>
                </XStack>
              </Button>

              <Button
                backgroundColor="transparent"
                borderWidth={1}
                borderColor={palette.border}
                borderRadius={14}
                height={46}
                onPress={() => router.push('/mes-reservations')}
              >
                <XStack alignItems="center" gap={8}>
                  <CalendarClock size={16} color={palette.text} />
                  <Text color={palette.text} fontSize={13} style={{ ...fonts.semibold }}>
                    Mes demandes en attente
                  </Text>
                </XStack>
              </Button>

              <Button
                backgroundColor="transparent"
                borderRadius={14}
                height={40}
                onPress={() => void loadValidatedBookings()}
              >
                <XStack alignItems="center" gap={6}>
                  <RefreshCw size={14} color={palette.textMuted} />
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                    Actualiser les validations
                  </Text>
                </XStack>
              </Button>

              <Button
                backgroundColor="transparent"
                borderRadius={14}
                height={36}
                onPress={() => dismiss()}
              >
                <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                  Retour à l'accueil
                </Text>
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
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
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          title: 'Créer un match',
        }}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Organise ta partie sur ton créneau validé
        </Text>

        {error ? (
          <YStack backgroundColor="rgba(220,38,38,0.12)" padding="$3" borderRadius={12}>
            <Text color="#fca5a5" style={{ ...fonts.medium }} fontSize={13}>
              {error}
            </Text>
          </YStack>
        ) : null}

        <XStack flexWrap="wrap" gap={12}>
          {MATCH_TYPES.map(({ id, label, Icon, desc }) => {
            const active = type === id
            return (
              <Pressable
                key={id}
                onPress={() => onPickType(id)}
                style={{ width: '47%', flexGrow: 1 }}
              >
                <YStack
                  gap={4}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={active ? palette.primary : palette.border}
                  backgroundColor={active ? `${palette.primary}1A` : palette.card}
                  padding={12}
                  minHeight={108}
                >
                  <Icon size={20} color={active ? palette.primary : palette.textMuted} />
                  <Text color={palette.text} fontFamily="$heading" fontSize={18}>
                    {label}
                  </Text>
                  <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                    {desc}
                  </Text>
                </YStack>
              </Pressable>
            )
          })}
        </XStack>

        {/* Sélecteur de créneau & terrain validé */}
        <YStack
          gap={10}
          onLayout={(e) => onFieldLayout('terrain', e.nativeEvent.layout.y)}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap={2}>
              <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
                Créneau & terrain validé
              </Text>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                Sélectionne le créneau approuvé par le gérant
              </Text>
            </YStack>
            <XStack
              backgroundColor={`${palette.primary}22`}
              paddingHorizontal={8}
              paddingVertical={3}
              borderRadius={999}
              alignItems="center"
              gap={4}
            >
              <Check size={12} color={palette.primary} />
              <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                {validatedBookings.length} validé{validatedBookings.length > 1 ? 's' : ''}
              </Text>
            </XStack>
          </XStack>

          <YStack gap={10}>
            {validatedBookings.map((b) => {
              const t = b.futto_terrains
              const isSelected = selectedBookingId === b.id
              const d = new Date(b.starts_at)
              const dateStr = d.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
              const timeStr = d.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    setSelectedBookingId(b.id)
                    if (t) setTerrain(t)
                    setKickoff(new Date(b.starts_at))
                  }}
                >
                  <YStack
                    borderRadius={16}
                    borderWidth={1.5}
                    borderColor={isSelected ? palette.primary : palette.border}
                    backgroundColor={isSelected ? `${palette.primary}14` : palette.card}
                    padding={14}
                    gap={8}
                  >
                    <XStack justifyContent="space-between" alignItems="flex-start">
                      <YStack flex={1} minWidth={0} gap={2}>
                        <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
                          {t?.name || 'Terrain FUTTO'}
                        </Text>
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {[t?.zone, t?.quartier].filter(Boolean).join(' · ') || 'Terrain homologué'}
                        </Text>
                      </YStack>

                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: isSelected ? palette.primary : palette.border,
                          backgroundColor: isSelected ? palette.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected ? <Check size={14} color="#fff" /> : null}
                      </View>
                    </XStack>

                    <XStack
                      justifyContent="space-between"
                      alignItems="center"
                      paddingTop={6}
                      borderTopWidth={1}
                      borderTopColor={palette.border}
                    >
                      <XStack alignItems="center" gap={6}>
                        <CalendarClock size={14} color={palette.primary} />
                        <Text color={palette.text} fontSize={12} style={{ ...fonts.semibold }}>
                          {dateStr} à {timeStr} ({b.duration_hours}h)
                        </Text>
                      </XStack>
                      <Text
                        color={b.status === 'paid' ? palette.primary : palette.accent}
                        fontSize={11}
                        style={{ ...fonts.bold }}
                      >
                        {b.status === 'paid' ? 'Payé 💳' : 'Validé ✅'}
                      </Text>
                    </XStack>
                  </YStack>
                </Pressable>
              )
            })}
          </YStack>
        </YStack>

        <MatchDateTimeField value={kickoff} onChange={setKickoff} palette={palette} />

        <YStack
          gap="$1.5"
          onLayout={(e) => onFieldLayout('format', e.nativeEvent.layout.y)}
        >
          <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
            Format (XvX)
          </Text>
          <Pressable
            onPress={() => {
              const next = !formatOpen
              setFormatOpen(next)
              if (next) scrollToField('format', 10, 60)
            }}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor={palette.card}
              borderWidth={1}
              borderColor={formatOpen ? palette.primary : palette.border}
              borderRadius={14}
              height={52}
              paddingHorizontal={14}
            >
              <Text color={palette.text} style={{ ...fonts.medium }}>
                {format.replace('v', ' vs ')}
              </Text>
              <ChevronDown size={18} color={palette.textMuted} />
            </XStack>
          </Pressable>
          {formatOpen ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.card,
                overflow: 'hidden',
              }}
            >
              {FORMAT_OPTIONS.map((f) => {
                const active = f === format
                return (
                  <Pressable
                    key={f}
                    onPress={() => {
                      setFormat(f)
                      setFormatOpen(false)
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
                      style={{ ...(active ? fonts.bold : fonts.medium) }}
                    >
                      {f.replace('v', ' vs ')}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </YStack>

        <YStack gap="$2.5">
          <XStack justifyContent="space-between" alignItems="center">
            <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
              Prix par joueur
            </Text>
            <Text color={palette.accent} style={{ ...fonts.bold }} fontSize={15}>
              {price > 0 ? formatFCFA(price) : 'Gratuit'}
            </Text>
          </XStack>

          {/* Saisie directe du prix */}
          <XStack
            alignItems="center"
            backgroundColor={palette.card}
            borderRadius={14}
            borderWidth={1}
            borderColor={palette.border}
            paddingHorizontal={14}
            height={52}
          >
            <Input
              flex={1}
              value={priceInput}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '')
                setPriceInput(digits)
                const val = Number(digits) || 0
                setPrice(Math.min(MAX_ADHESION_FCFA, val))
              }}
              placeholder="0"
              keyboardType="number-pad"
              backgroundColor="transparent"
              borderWidth={0}
              color={palette.text}
              fontSize={16}
style={{ ...fonts.semibold } as any}
            />
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.bold }}>
              FCFA
            </Text>
          </XStack>

          {/* Boutons rapides */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {QUICK_PRICES.map((p) => {
              const active = price === p
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setPrice(p)
                    setPriceInput(String(p))
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? palette.primary : palette.card,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                  }}
                >
                  <Text
                    fontSize={12}
                    color={active ? '#fff' : palette.text}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {p === 0 ? 'Gratuit' : `${p.toLocaleString('fr-FR')} F`}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Slider */}
          <Slider
            minimumValue={0}
            maximumValue={MAX_ADHESION_FCFA}
            step={500}
            value={price}
            onValueChange={(v) => {
              setPrice(v)
              setPriceInput(String(v))
            }}
            minimumTrackTintColor={palette.primary}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.primary}
          />
        </YStack>

        {team && members.length > 0 ? (
          <Pressable onPress={() => setInviteTeamAuto((prev) => !prev)}>
            <XStack
              backgroundColor={inviteTeamAuto ? `${palette.primary}12` : palette.card}
              borderWidth={1.5}
              borderColor={inviteTeamAuto ? palette.primary : palette.border}
              borderRadius={16}
              padding={14}
              alignItems="center"
              justifyContent="space-between"
              gap={12}
            >
              <XStack alignItems="center" gap={12} flex={1}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: inviteTeamAuto ? palette.primary : palette.cardElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={18} color={inviteTeamAuto ? '#fff' : palette.textMuted} />
                </View>
                <YStack flex={1}>
                  <Text color={palette.text} fontSize={14} style={{ ...fonts.bold }}>
                    Inviter mon équipe « {team.name} »
                  </Text>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                    {members.length} coéquipier{members.length > 1 ? 's' : ''} recevront une invitation
                  </Text>
                </YStack>
              </XStack>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: inviteTeamAuto ? palette.primary : palette.border,
                  backgroundColor: inviteTeamAuto ? palette.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {inviteTeamAuto && <Check size={14} color="#fff" />}
              </View>
            </XStack>
          </Pressable>
        ) : null}

        <Button
          backgroundColor={palette.primary}
          borderRadius={999}
          height={54}
          disabled={busy}
          opacity={busy ? 0.65 : 1}
          onPress={() => void publish()}
        >
          <Text color="#fff" fontFamily="$heading" fontSize={16} style={{ ...fonts.bold }}>
            {busy ? 'Publication…' : 'Publier le match'}
          </Text>
        </Button>
        <Button chromeless color={palette.textMuted} onPress={dismiss}>
          Annuler
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
