import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { MessageSquare, Search, UserPlus } from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { BackHeader } from '@/components/BackHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { useConversations } from '@/lib/messages'

export default function MessagesScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { conversations, loading, refresh } = useConversations()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q),
    )
  }, [conversations, search])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header avec BackHeader */}
      <BackHeader title="Messages" backHref="/" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {/* Barre de recherche */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: palette.card,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 16,
            height: 48,
            gap: 10,
          }}
        >
          <Search size={18} color={palette.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une conversation…"
            placeholderTextColor={palette.textMuted}
            style={{
              flex: 1,
              color: palette.text,
              fontSize: 14,
              ...fonts.regular,
            }}
          />
        </View>

        {loading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical={40}>
            <FuttoLogoLoader size={60} label="Chargement des messages…" />
          </YStack>
        ) : filtered.length === 0 ? (
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={28}
            alignItems="center"
            gap={12}
            marginTop={16}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: `${palette.primary}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={28} color={palette.primary} />
            </View>
            <Text
              color={palette.text}
              fontSize={18}
              textAlign="center"
              style={{ ...fonts.bold }}
            >
              Aucune conversation trouvée
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              lineHeight={19}
              style={{ ...fonts.regular, maxWidth: 280 }}
            >
              Discute avec d'autres joueurs pour organiser des matchs et réserver des créneaux.
            </Text>
            <Button
              marginTop={6}
              backgroundColor={palette.primary}
              borderRadius={999}
              height={44}
              paddingHorizontal={20}
              onPress={() => router.push('/joueurs')}
            >
              <XStack alignItems="center" gap={8}>
                <UserPlus size={16} color="#fff" />
                <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                  Trouver un joueur
                </Text>
              </XStack>
            </Button>
          </YStack>
        ) : (
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            overflow="hidden"
          >
            {filtered.map((c, index) => {
              const isLast = index === filtered.length - 1
              return (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/messages/${c.otherParticipantId || c.id}` as any)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    gap: 12,
                    backgroundColor: pressed ? palette.cardElevated : 'transparent',
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: palette.border,
                  })}
                >
                  <Pressable
                    onPress={() => {
                      if (c.avatarUrl) {
                        setViewerImage({ url: c.avatarUrl, title: c.name })
                      } else if (c.otherParticipantId) {
                        router.push(`/joueurs/${c.otherParticipantId}` as any)
                      }
                    }}
                  >
                    <Avatar
                      initials={c.initials}
                      color={c.color}
                      size={48}
                      uri={c.avatarUrl}
                    />
                  </Pressable>

                  <YStack flex={1} minWidth={0} gap={3}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text
                        color={palette.text}
                        fontSize={15}
                        numberOfLines={1}
                        style={{ ...fonts.bold, flex: 1, marginRight: 8 }}
                      >
                        {c.name}
                      </Text>
                      <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.medium }}>
                        {c.time}
                      </Text>
                    </XStack>

                    <Text
                      color={palette.textMuted}
                      fontSize={13}
                      numberOfLines={1}
                      style={{ ...fonts.regular }}
                    >
                      {c.lastMessage}
                    </Text>
                  </YStack>

                  {c.unread > 0 && (
                    <View
                      style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: palette.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text color="#fff" fontSize={11} style={{ ...fonts.bold }}>
                      {c.unread}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </YStack>
      )}
    </ScrollView>

    <ImageViewerModal
      visible={Boolean(viewerImage)}
      imageUrl={viewerImage?.url ?? null}
      title={viewerImage?.title}
      onClose={() => setViewerImage(null)}
    />
  </YStack>
)
}
