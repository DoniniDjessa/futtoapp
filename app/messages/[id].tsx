import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Send } from 'lucide-react-native'
import { Text, XStack, YStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { BackHeader } from '@/components/BackHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { useChatThread, type ChatMessage } from '@/lib/messages'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { messages, loading, partner, sendMessage, formatRelativeTime } = useChatThread(id || '')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setSending(true)
    try {
      await sendMessage(text)
    } finally {
      setSending(false)
    }
  }

  const partnerName = partner?.name || 'Contact FUTTO'

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header avec BackHeader personnalisé */}
      <BackHeader
        title={partnerName}
        onBack={() => router.back()}
        right={
          partner?.avatarUrl ? (
            <Avatar size={34} uri={partner.avatarUrl} initials={initials(partnerName)} />
          ) : (
            <Avatar size={34} initials={initials(partnerName)} color={palette.primary} />
          )
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {loading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <FuttoLogoLoader size={60} label="Chargement de la discussion…" />
          </YStack>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 16,
              gap: 10,
            }}
            ListEmptyComponent={
              <YStack alignItems="center" justifyContent="center" paddingVertical={60} gap={8}>
                <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.medium }}>
                  Aucun message échangé pour le moment.
                </Text>
                <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                  Envoie le premier message pour lancer la partie !
                </Text>
              </YStack>
            }
            renderItem={({ item }: { item: ChatMessage }) => {
              const isMe = item.sender_id === user?.id
              return (
                <XStack
                  justifyContent={isMe ? 'flex-end' : 'flex-start'}
                  alignItems="flex-end"
                  gap={8}
                >
                  {!isMe && (
                    <Avatar
                      size={28}
                      uri={partner?.avatarUrl}
                      initials={initials(partnerName)}
                      color={palette.primary}
                    />
                  )}

                  <View
                    style={{
                      maxWidth: '75%',
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: isMe ? palette.primary : palette.card,
                      borderWidth: isMe ? 0 : 1,
                      borderColor: palette.border,
                    }}
                  >
                    <Text
                      color={isMe ? '#fff' : palette.text}
                      fontSize={14}
                      lineHeight={20}
                      style={{ ...fonts.regular }}
                    >
                      {item.content}
                    </Text>

                    <Text
                      color={isMe ? 'rgba(255,255,255,0.7)' : palette.textMuted}
                      fontSize={10}
                      marginTop={4}
                      textAlign={isMe ? 'right' : 'left'}
                      style={{ ...fonts.medium }}
                    >
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                </XStack>
              )
            }}
          />
        )}

        {/* Barre d'envoi de message */}
        <YStack
          paddingHorizontal={16}
          paddingVertical={12}
          borderTopWidth={1}
          borderTopColor={palette.border}
          backgroundColor={palette.card}
          gap={6}
        >
          <XStack alignItems="center" gap={10}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message à ${partnerName}…`}
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={500}
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 100,
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                color: palette.text,
                fontSize: 14,
                ...fonts.regular,
              }}
            />

            <Pressable
              onPress={() => void handleSend()}
              disabled={!draft.trim() || sending}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: draft.trim() ? palette.primary : palette.cardElevated,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: draft.trim() ? 1 : 0.5,
              }}
            >
              <Send size={18} color={draft.trim() ? '#fff' : palette.textMuted} />
            </Pressable>
          </XStack>

          {profile?.pseudo && (
            <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
              Tu écris en tant que @{profile.pseudo}
            </Text>
          )}
        </YStack>
      </KeyboardAvoidingView>
    </YStack>
  )
}
