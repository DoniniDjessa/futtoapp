import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import {
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  PlusCircle,
  ShieldCheck,
  X,
} from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import type { TerrainBooking } from '@/lib/types'

const STATUS_LABEL: Record<TerrainBooking['status'], string> = {
  requested: 'Demandé',
  confirmed: 'Confirmé (à payer)',
  rejected: 'Refusé',
  paid: 'Payé',
  cancelled: 'Annulé',
}

type ManagerBookingRow = TerrainBooking & {
  terrain_name?: string
  requester_name?: string
  requester_pseudo?: string
  requester_phone?: string
  requester_avatar?: string
}

export default function MesReservationsScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const [activeTab, setActiveTab] = useState<'my_bookings' | 'manager_requests'>('my_bookings')
  const [myRows, setMyRows] = useState<(TerrainBooking & { terrain_name?: string })[]>([])
  const [managerRows, setManagerRows] = useState<ManagerBookingRow[]>([])
  const [hasTerrains, setHasTerrains] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const isManagerOrAdmin =
    profile?.role === 'manager' || profile?.role === 'superAdmin' || hasTerrains

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setMyRows([])
      setManagerRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // 1. Charger mes réservations (en tant que joueur)
      const { data: myData } = await supabase
        .from(T.bookings)
        .select('*, futto_terrains(name)')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })

      const mappedMy =
        (myData as Array<TerrainBooking & { futto_terrains?: { name: string } | null }>)?.map((r) => ({
          ...r,
          terrain_name: r.futto_terrains?.name,
        })) ?? []
      setMyRows(mappedMy)

      // 2. Vérifier si l'utilisateur possède des terrains
      const { data: userTerrains } = await supabase
        .from(T.terrains)
        .select('id, name')
        .eq('created_by', user.id)

      const userOwnsTerrains = Boolean(userTerrains && userTerrains.length > 0)
      setHasTerrains(userOwnsTerrains)

      // 3. Charger les demandes reçues (en tant que gérant de terrain)
      if (profile?.role === 'manager' || profile?.role === 'superAdmin' || userOwnsTerrains) {
        let q = supabase
          .from(T.bookings)
          .select('*, futto_terrains(id, name, created_by)')
          .order('created_at', { ascending: false })

        if (profile?.role !== 'superAdmin') {
          const ownedIds = userTerrains?.map((t) => t.id) || []
          if (ownedIds.length > 0) {
            q = q.in('terrain_id', ownedIds)
          } else {
            setManagerRows([])
            return
          }
        }

        const { data: incomingData } = await q
        const rawIncoming = (incomingData as any[]) || []

        // Récupérer les profils des demandeurs
        const requesterIds = Array.from(new Set(rawIncoming.map((b) => b.requester_id).filter(Boolean)))
        const profileMap = new Map<string, any>()
        if (requesterIds.length > 0) {
          const { data: profs } = await supabase
            .from(T.profiles)
            .select('id, full_name, first_name, pseudo, phone, avatar_url')
            .in('id', requesterIds)

          for (const p of profs || []) {
            profileMap.set(p.id, p)
          }
        }

        const mappedManager: ManagerBookingRow[] = rawIncoming.map((b) => {
          const p = profileMap.get(b.requester_id)
          return {
            ...b,
            terrain_name: b.futto_terrains?.name,
            requester_name: p?.pseudo ? `@${p.pseudo}` : p?.full_name || p?.first_name || 'Joueur FUTTO',
            requester_pseudo: p?.pseudo,
            requester_phone: p?.phone,
            requester_avatar: p?.avatar_url,
          }
        })
        setManagerRows(mappedManager)
      }
    } finally {
      setLoading(false)
    }
  }, [user, profile?.role])

  useEffect(() => {
    void load()
  }, [load])

  // Validation ou refus par le propriétaire / gérant
  async function handleSetStatus(bookingId: string, newStatus: 'confirmed' | 'rejected') {
    if (!supabase) return
    setBusyId(bookingId)
    try {
      const { error: rpcErr } = await supabase.rpc('futto_set_booking_status', {
        p_booking_id: bookingId,
        p_status: newStatus,
      })

      if (rpcErr) {
        const { error: updErr } = await supabase
          .from(T.bookings)
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', bookingId)
        if (updErr) {
          Alert.alert('Erreur', updErr.message)
          return
        }
      }

      // Notifier le joueur demandeur
      const b = managerRows.find((r) => r.id === bookingId)
      if (b) {
        const tName = b.terrain_name || 'le terrain'
        await notifyUser({
          profileId: b.requester_id,
          title: newStatus === 'confirmed' ? 'Terrain validé ! ⚽' : 'Demande refusée',
          body:
            newStatus === 'confirmed'
              ? `Ta réservation pour « ${tName} » a été validée. Tu peux désormais créer ton match !`
              : `Ta demande pour « ${tName} » a été refusée par le propriétaire.`,
          kind: 'system',
          data: { bookingId, terrainId: b.terrain_id, status: newStatus },
        })
      }

      await load()
    } finally {
      setBusyId(null)
    }
  }

  // Marquer comme payé (par le joueur ou le gérant)
  async function markPaid(id: string, provider: string) {
    if (!supabase) return
    setBusyId(id)
    const { error } = await supabase.rpc('futto_mark_booking_paid', {
      p_booking_id: id,
      p_provider: provider,
    })
    setBusyId(null)
    if (error) {
      await supabase.from(T.bookings).update({ status: 'paid' }).eq('id', id)
    }
    await load()
  }

  const pendingManagerCount = managerRows.filter((r) => r.status === 'requested').length
  const currentList = activeTab === 'my_bookings' ? myRows : managerRows
  const isEmpty = !loading && currentList.length === 0

  function renderEmptyMyBookings() {
    return (
      <YStack
        backgroundColor={palette.card}
        borderRadius={24}
        borderWidth={1}
        borderColor={palette.border}
        padding={28}
        alignItems="center"
        gap={14}
        maxWidth={360}
        width="100%"
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: `${palette.primary}16`,
            borderWidth: 1.5,
            borderColor: `${palette.primary}33`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalendarClock size={32} color={palette.primary} />
        </View>

        <YStack alignItems="center" gap={6}>
          <Text
            color={palette.text}
            fontSize={18}
            textAlign="center"
            style={{ ...fonts.bold }}
          >
            Aucune demande de terrain
          </Text>
          <Text
            color={palette.textMuted}
            fontSize={13}
            textAlign="center"
            lineHeight={19}
            style={{ ...fonts.regular }}
          >
            Tu n'as envoyé aucune réservation. Choisis un terrain, réserve ton créneau et attends la validation du gérant !
          </Text>
        </YStack>

        <Button
          backgroundColor={palette.primary}
          borderRadius={14}
          height={46}
          paddingHorizontal={20}
          marginTop={6}
          onPress={() => router.push('/reserver')}
        >
          <XStack alignItems="center" gap={8}>
            <MapPin size={16} color="#fff" />
            <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
              Réserver un terrain
            </Text>
            <ChevronRight size={16} color="#fff" />
          </XStack>
        </Button>
      </YStack>
    )
  }

  function renderMyBookingCard(b: TerrainBooking & { terrain_name?: string }) {
    const isValidated = b.status === 'confirmed' || b.status === 'paid'
    return (
      <YStack
        key={b.id}
        backgroundColor={palette.card}
        borderRadius={18}
        padding={16}
        borderWidth={1}
        borderColor={isValidated ? palette.primary : palette.border}
        gap={10}
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} minWidth={0} gap={2}>
            <Text color={palette.text} fontSize={16} style={{ ...fonts.bold }}>
              {b.terrain_name || 'Terrain FUTTO'}
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              {new Date(b.starts_at).toLocaleString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {b.duration_hours}h
            </Text>
          </YStack>

          <YStack
            backgroundColor={
              b.status === 'paid'
                ? `${palette.primary}22`
                : b.status === 'confirmed'
                  ? `${palette.accent}22`
                  : b.status === 'rejected'
                    ? 'rgba(239,68,68,0.15)'
                    : `${palette.cardElevated}`
            }
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
          >
            <Text
              color={
                b.status === 'paid'
                  ? palette.primary
                  : b.status === 'confirmed'
                    ? palette.accent
                    : b.status === 'rejected'
                      ? '#f87171'
                      : palette.textMuted
              }
              fontSize={11}
              style={{ ...fonts.bold }}
            >
              {STATUS_LABEL[b.status]}
            </Text>
          </YStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center" paddingTop={4}>
          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
            Montant
          </Text>
          <Text color={palette.gold} fontFamily="$heading" fontSize={16}>
            {formatFCFA(b.amount_fcfa)}
          </Text>
        </XStack>

        {/* Si validé par le gérant : bouton direct pour créer son match ! */}
        {isValidated && !b.match_id ? (
          <Button
            size="$3"
            backgroundColor={palette.primary}
            borderRadius={12}
            marginTop={4}
            onPress={() => router.push('/creer')}
          >
            <XStack alignItems="center" gap={6}>
              <Check size={16} color="#fff" />
              <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
                Créer mon match sur ce terrain
              </Text>
            </XStack>
          </Button>
        ) : null}

        {b.status === 'confirmed' || b.status === 'requested' ? (
          <XStack gap={8} flexWrap="wrap" marginTop={2}>
            {(['cash', 'wave', 'orange', 'mtn'] as const).map((p) => (
              <Button
                key={p}
                size="$2"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor={palette.border}
                borderRadius={10}
                disabled={busyId === b.id}
                onPress={() => void markPaid(b.id, p)}
              >
                <Text color={palette.text} fontSize={11} style={{ ...fonts.semibold }}>
                  Payer {p.toUpperCase()}
                </Text>
              </Button>
            ))}
          </XStack>
        ) : null}
      </YStack>
    )
  }

  function renderNotManager() {
    return (
      <YStack
        backgroundColor={palette.card}
        borderRadius={24}
        borderWidth={1}
        borderColor={palette.border}
        padding={28}
        alignItems="center"
        gap={14}
        maxWidth={360}
        width="100%"
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: `${palette.primary}16`,
            borderWidth: 1.5,
            borderColor: `${palette.primary}33`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={32} color={palette.primary} />
        </View>

        <YStack alignItems="center" gap={6}>
          <Text
            color={palette.text}
            fontSize={18}
            textAlign="center"
            style={{ ...fonts.bold }}
          >
            Espace Propriétaire
          </Text>
          <Text
            color={palette.textMuted}
            fontSize={13}
            textAlign="center"
            lineHeight={19}
            style={{ ...fonts.regular }}
          >
            Vous n'avez pas encore de terrain enregistré en tant que propriétaire. Ajoutez votre terrain pour recevoir des réservations !
          </Text>
        </YStack>

        <Button
          backgroundColor={palette.primary}
          borderRadius={14}
          height={46}
          paddingHorizontal={20}
          marginTop={6}
          onPress={() => router.push('/ajouter-terrain')}
        >
          <XStack alignItems="center" gap={8}>
            <PlusCircle size={16} color="#fff" />
            <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
              Ajouter un terrain
            </Text>
          </XStack>
        </Button>
      </YStack>
    )
  }

  function renderEmptyManagerRequests() {
    return (
      <YStack
        backgroundColor={palette.card}
        borderRadius={24}
        borderWidth={1}
        borderColor={palette.border}
        padding={28}
        alignItems="center"
        gap={14}
        maxWidth={360}
        width="100%"
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: `${palette.primary}16`,
            borderWidth: 1.5,
            borderColor: `${palette.primary}33`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={32} color={palette.primary} />
        </View>

        <YStack alignItems="center" gap={6}>
          <Text
            color={palette.text}
            fontSize={18}
            textAlign="center"
            style={{ ...fonts.bold }}
          >
            Aucune demande reçue
          </Text>
          <Text
            color={palette.textMuted}
            fontSize={13}
            textAlign="center"
            lineHeight={19}
            style={{ ...fonts.regular }}
          >
            Aucun joueur n'a encore demandé de créneau sur vos terrains.
          </Text>
        </YStack>
      </YStack>
    )
  }

  function renderManagerBookingCard(b: ManagerBookingRow) {
    const isPending = b.status === 'requested'
    return (
      <YStack
        key={b.id}
        backgroundColor={palette.card}
        borderRadius={18}
        padding={16}
        borderWidth={1}
        borderColor={isPending ? palette.accent : palette.border}
        gap={12}
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} minWidth={0} gap={2}>
            <Text color={palette.text} fontSize={16} style={{ ...fonts.bold }}>
              {b.terrain_name || 'Mon Terrain'}
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              Créneau :{' '}
              {new Date(b.starts_at).toLocaleString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({b.duration_hours}h)
            </Text>
          </YStack>

          <YStack
            backgroundColor={
              b.status === 'confirmed'
                ? `${palette.accent}22`
                : b.status === 'paid'
                  ? `${palette.primary}22`
                  : b.status === 'rejected'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(234,179,8,0.15)'
            }
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
          >
            <Text
              color={
                b.status === 'confirmed'
                  ? palette.accent
                  : b.status === 'paid'
                    ? palette.primary
                    : b.status === 'rejected'
                      ? '#f87171'
                      : '#eab308'
              }
              fontSize={11}
              style={{ ...fonts.bold }}
            >
              {b.status === 'requested' ? 'En attente ⏳' : STATUS_LABEL[b.status]}
            </Text>
          </YStack>
        </XStack>

        {/* Profil Demandeur */}
        <XStack
          alignItems="center"
          gap={10}
          backgroundColor={palette.bg}
          padding={10}
          borderRadius={14}
        >
          <Avatar
            uri={b.requester_avatar}
            name={b.requester_name || 'Joueur'}
            size={38}
          />
          <YStack flex={1} minWidth={0} gap={2}>
            <Text color={palette.text} fontSize={13} style={{ ...fonts.bold }} numberOfLines={1}>
              {b.requester_name}
            </Text>
            {b.requester_phone ? (
              <XStack alignItems="center" gap={4}>
                <Phone size={12} color={palette.textMuted} />
                <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                  {b.requester_phone}
                </Text>
              </XStack>
            ) : null}
          </YStack>

          <Text color={palette.gold} fontFamily="$heading" fontSize={15}>
            {formatFCFA(b.amount_fcfa)}
          </Text>
        </XStack>

        {b.note ? (
          <Text color={palette.textMuted} fontSize={12} fontStyle="italic" style={{ ...fonts.regular }}>
            Note : « {b.note} »
          </Text>
        ) : null}

        {/* Boutons d'action propriétaire */}
        {isPending ? (
          <XStack gap={10} marginTop={4}>
            <Button
              flex={1}
              backgroundColor={palette.primary}
              borderRadius={12}
              height={42}
              disabled={busyId === b.id}
              onPress={() => void handleSetStatus(b.id, 'confirmed')}
            >
              <XStack alignItems="center" gap={6}>
                <Check size={16} color="#fff" />
                <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                  Valider le créneau
                </Text>
              </XStack>
            </Button>

            <Button
              flex={1}
              backgroundColor="transparent"
              borderWidth={1}
              borderColor="rgba(239,68,68,0.4)"
              borderRadius={12}
              height={42}
              disabled={busyId === b.id}
              onPress={() => void handleSetStatus(b.id, 'rejected')}
            >
              <XStack alignItems="center" gap={6}>
                <X size={16} color="#f87171" />
                <Text color="#f87171" fontSize={13} style={{ ...fonts.bold }}>
                  Refuser
                </Text>
              </XStack>
            </Button>
          </XStack>
        ) : b.status === 'confirmed' ? (
          <XStack justifyContent="space-between" alignItems="center" marginTop={2}>
            <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
              Créneau validé. En attente de match / paiement.
            </Text>
            <Button
              size="$2"
              backgroundColor="transparent"
              borderWidth={1}
              borderColor={palette.primary}
              borderRadius={10}
              disabled={busyId === b.id}
              onPress={() => void markPaid(b.id, 'cash')}
            >
              <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                Marquer Payé (Espèces)
              </Text>
            </Button>
          </XStack>
        ) : null}
      </YStack>
    )
  }

  function renderContent() {
    if (loading) {
      return (
        <YStack alignItems="center" justifyContent="center">
          <FuttoLogoLoader size={64} label="Chargement des réservations…" />
        </YStack>
      )
    }

    if (activeTab === 'my_bookings') {
      if (myRows.length === 0) {
        return renderEmptyMyBookings()
      }
      return myRows.map(renderMyBookingCard)
    }

    // manager_requests tab
    if (!isManagerOrAdmin && managerRows.length === 0) {
      return renderNotManager()
    }

    if (managerRows.length === 0) {
      return renderEmptyManagerRequests()
    }

    return managerRows.map(renderManagerBookingCard)
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Réservations & Terrains',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />

      {/* Sélecteur d'onglets : Joueur vs Propriétaire/Gérant */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={10}
        gap={10}
        backgroundColor={palette.card}
        borderBottomWidth={1}
        borderBottomColor={palette.border}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setActiveTab('my_bookings')}
        >
          <XStack
            alignItems="center"
            justifyContent="center"
            gap={6}
            height={42}
            borderRadius={12}
            backgroundColor={activeTab === 'my_bookings' ? palette.primary : palette.bg}
            borderWidth={1}
            borderColor={activeTab === 'my_bookings' ? palette.primary : palette.border}
          >
            <CalendarClock size={16} color={activeTab === 'my_bookings' ? '#fff' : palette.textMuted} />
            <Text
              color={activeTab === 'my_bookings' ? '#fff' : palette.text}
              fontSize={13}
              style={{ ...(activeTab === 'my_bookings' ? fonts.bold : fonts.medium) }}
            >
              Mes demandes ({myRows.length})
            </Text>
          </XStack>
        </Pressable>

        <Pressable
          style={{ flex: 1 }}
          onPress={() => setActiveTab('manager_requests')}
        >
          <XStack
            alignItems="center"
            justifyContent="center"
            gap={6}
            height={42}
            borderRadius={12}
            backgroundColor={activeTab === 'manager_requests' ? palette.primary : palette.bg}
            borderWidth={1}
            borderColor={activeTab === 'manager_requests' ? palette.primary : palette.border}
          >
            <ShieldCheck size={16} color={activeTab === 'manager_requests' ? '#fff' : palette.textMuted} />
            <Text
              color={activeTab === 'manager_requests' ? '#fff' : palette.text}
              fontSize={13}
              style={{ ...(activeTab === 'manager_requests' ? fonts.bold : fonts.medium) }}
            >
              Demandes reçues
            </Text>
            {pendingManagerCount > 0 ? (
              <View
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 999,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text color="#fff" fontSize={10} style={{ ...fonts.bold }}>
                  {pendingManagerCount}
                </Text>
              </View>
            ) : null}
          </XStack>
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          gap: 14,
          justifyContent: isEmpty || loading ? 'center' : 'flex-start',
          alignItems: isEmpty || loading ? 'center' : 'stretch',
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={palette.primary} />
        }
      >
        {renderContent()}
      </ScrollView>
    </YStack>
  )
}
