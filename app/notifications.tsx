import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import {
  Bell,
  BellOff,
  CalendarPlus,
  CheckCheck,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react-native'
import { Text, YStack, XStack } from 'tamagui'
import { BackHeader } from '@/components/BackHeader'
import { type NotificationRow, useNotifications } from '@/lib/data'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

function timeAgo(dateString: string) {
  const d = new Date(dateString)
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'À l’instant'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Il y a ${diffD} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getNotificationIcon(kind: string, title?: string) {
  const t = (title || '').toLowerCase()
  if (t.includes('terrain') || t.includes('réservation') || t.includes('créneau')) {
    return { Icon: MapPin, color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' }
  }
  if (t.includes('tournoi')) {
    return { Icon: Trophy, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' }
  }
  if (t.includes('abonné') || t.includes('suivre')) {
    return { Icon: UserPlus, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' }
  }
  if (t.includes('recharge') || t.includes('portefeuille') || t.includes('solde')) {
    return { Icon: Wallet, color: '#eab308', bg: 'rgba(234, 179, 8, 0.14)' }
  }
  switch (kind) {
    case 'invite':
      return { Icon: UserPlus, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' }
    case 'match':
      return { Icon: Trophy, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.14)' }
    case 'wallet':
      return { Icon: Wallet, color: '#eab308', bg: 'rgba(234, 179, 8, 0.14)' }
    case 'reminder':
      return { Icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' }
    case 'message':
      return { Icon: MessageSquare, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.14)' }
    case 'tournament':
      return { Icon: Trophy, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' }
    default:
      return { Icon: Zap, color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' }
  }
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { items, loading, refresh, markAllAsRead, markAsRead, unreadCount } =
    useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.read_at)
    return items
  }, [items, filter])

  async function handlePress(n: NotificationRow) {
    if (!n.read_at) {
      await markAsRead(n.id)
    }

    const payload = n.data || {}
    const matchId = payload.match_id || payload.matchId
    const convId = payload.conversation_id || payload.conversationId
    const profileId = payload.profile_id || payload.profileId || payload.sender_id
    const bookingId = payload.booking_id || payload.bookingId
    const tournamentId = payload.tournament_id || payload.tournamentId
    const terrainId = payload.terrain_id || payload.terrainId
    const isWallet = n.kind === 'wallet' || payload.wallet || n.title.toLowerCase().includes('portefeuille') || n.title.toLowerCase().includes('recharge')

    if (isWallet) {
      router.push('/portefeuille')
      return
    }

    if (matchId) {
      router.push(`/match/${matchId}`)
      return
    }

    if (bookingId || terrainId || n.title.toLowerCase().includes('terrain') || n.title.toLowerCase().includes('réservation')) {
      router.push('/mes-reservations')
      return
    }

    if (tournamentId || n.title.toLowerCase().includes('tournoi')) {
      if (tournamentId) router.push(`/tournois/${tournamentId}`)
      else router.push('/tournois')
      return
    }

    if (convId) {
      router.push(`/messages/${convId}`)
      return
    }

    if (profileId) {
      router.push(`/joueurs/${profileId}`)
      return
    }

    if (n.kind === 'invite') {
      router.push('/(tabs)/matchs')
      return
    }

    if (n.kind === 'match') {
      router.push('/(tabs)/matchs')
      return
    }

    if (n.kind === 'message') {
      router.push('/messages')
      return
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      <BackHeader
        title="Notifications"
        onBack={() => router.back()}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => void markAllAsRead()}
              hitSlop={8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: `${palette.primary}18`,
              }}
            >
              <CheckCheck size={14} color={palette.primary} />
              <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                Tout lire
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Filtres : Toutes / Non lues */}
      <XStack paddingHorizontal={16} paddingTop={8} paddingBottom={10} gap={8}>
        <Pressable
          onPress={() => setFilter('all')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: filter === 'all' ? palette.primary : palette.cardElevated,
            borderWidth: 1,
            borderColor: filter === 'all' ? palette.primary : palette.border,
          }}
        >
          <Text
            color={filter === 'all' ? '#fff' : palette.textMuted}
            fontSize={12}
            style={{ ...fonts.bold }}
          >
            Toutes ({items.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('unread')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: filter === 'unread' ? palette.primary : palette.cardElevated,
            borderWidth: 1,
            borderColor: filter === 'unread' ? palette.primary : palette.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            color={filter === 'unread' ? '#fff' : palette.textMuted}
            fontSize={12}
            style={{ ...fonts.bold }}
          >
            Non lues ({unreadCount})
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: filter === 'unread' ? '#fff' : palette.accent,
              }}
            />
          )}
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={palette.primary}
          />
        }
      >
        {!loading && filtered.length === 0 ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical={60}
            gap={12}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: palette.cardElevated,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <BellOff size={28} color={palette.textMuted} />
            </View>
            <Text
              color={palette.text}
              fontSize={17}
              textAlign="center"
              style={{ ...fonts.bold }}
            >
              {filter === 'unread' ? 'Toutes les notifications sont lues' : 'Aucune notification'}
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              maxWidth={260}
              style={{ ...fonts.regular }}
            >
              {filter === 'unread'
                ? 'Tu as déjà consulté toutes tes alertes récentes.'
                : 'Matchs, créneaux disponibles et messages apparaîtront ici.'}
            </Text>
          </YStack>
        ) : (
          filtered.map((n) => {
            const isUnread = !n.read_at
            const { Icon, color, bg } = getNotificationIcon(n.kind, n.title)

            return (
              <Pressable
                key={n.id}
                onPress={() => void handlePress(n)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <XStack
                  backgroundColor={isUnread ? `${palette.primary}08` : palette.card}
                  borderRadius={16}
                  padding={14}
                  borderWidth={1}
                  borderColor={isUnread ? `${palette.primary}40` : palette.border}
                  alignItems="flex-start"
                  gap={12}
                >
                  {/* Icône de catégorie */}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={color} />
                  </View>

                  {/* Contenu textuel */}
                  <YStack flex={1} minWidth={0} gap={3}>
                    <XStack alignItems="center" justifyContent="space-between" gap={8}>
                      <Text
                        color={palette.text}
                        fontSize={14}
                        numberOfLines={1}
                        style={{ ...fonts.bold, flex: 1 }}
                      >
                        {n.title}
                      </Text>
                      <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                        {timeAgo(n.created_at)}
                      </Text>
                    </XStack>

                    {n.body ? (
                      <Text
                        color={palette.textMuted}
                        fontSize={13}
                        lineHeight={18}
                        style={{ ...fonts.regular }}
                      >
                        {n.body}
                      </Text>
                    ) : null}
                  </YStack>

                  {/* Indicateur non lu ou flèche */}
                  <View style={{ paddingTop: 4 }}>
                    {isUnread ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: palette.primary,
                        }}
                      />
                    ) : (
                      <ChevronRight size={16} color={palette.border} />
                    )}
                  </View>
                </XStack>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </YStack>
  )
}
