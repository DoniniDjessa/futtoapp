import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { UserCheck, MapPin } from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { fonts } from '@/lib/fonts'
import { usePlayers } from '@/lib/data'
import { useAuth } from '@/lib/auth'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function JoueursScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { profile, setAvailableToPlay } = useAuth()
  const { players, loading, refresh } = usePlayers(true)
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const isMeAvailable = Boolean(profile?.is_available_to_play)

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Joueurs disponibles',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }} marginBottom={16}>
          Joueurs prêts à rejoindre ou compléter une équipe dès maintenant.
        </Text>

        {/* Bannière d'activation rapide pour l'utilisateur connecté */}
        {!isMeAvailable && (
          <Pressable
            onPress={async () => {
              await setAvailableToPlay(true)
              void refresh()
            }}
          >
            <XStack
              backgroundColor={`${palette.primary}15`}
              borderWidth={1.5}
              borderColor={palette.primary}
              borderRadius={18}
              padding={14}
              alignItems="center"
              justifyContent="space-between"
              marginBottom={18}
              gap={12}
            >
              <XStack alignItems="center" gap={10} flex={1}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: palette.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={18} color="#fff" strokeWidth={2.2} />
                </View>
                <YStack flex={1}>
                  <Text color={palette.primary} fontSize={14} style={{ ...fonts.bold }}>
                    Tu es libre pour jouer ?
                  </Text>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                    Active ton statut pour apparaître ici
                  </Text>
                </YStack>
              </XStack>
              <View
                style={{
                  backgroundColor: palette.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
                  M’activer
                </Text>
              </View>
            </XStack>
          </Pressable>
        )}

        {loading ? (
          <YStack paddingVertical={40} alignItems="center" justifyContent="center">
            <FuttoLogoLoader size={60} label="Recherche des joueurs disponibles…" />
          </YStack>
        ) : players.length === 0 ? (
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={24}
            alignItems="center"
            gap={10}
            marginTop={10}
          >
            <Zap size={32} color={palette.textMuted} />
            <Text color={palette.text} fontSize={16} textAlign="center" style={{ ...fonts.bold }}>
              Aucun joueur disponible
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              lineHeight={19}
              style={{ ...fonts.regular }}
            >
              Les joueurs n'ont pas encore activé leur disponibilité pour un match. Sois le premier à te rendre disponible !
            </Text>
          </YStack>
        ) : (
          <YStack gap={10}>
            {players.map((j) => {
              const displayName = j.full_name || j.first_name || j.pseudo || 'Joueur'
              const pseudo = j.pseudo ? `@${j.pseudo}` : null

              return (
                <Pressable
                  key={j.id}
                  onPress={() => router.push(`/joueurs/${j.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <XStack
                    backgroundColor={palette.card}
                    borderRadius={18}
                    padding={14}
                    borderWidth={1}
                    borderColor={palette.border}
                    alignItems="center"
                    gap={12}
                  >
                    <Pressable
                      onPress={(e) => {
                        if (j.avatar_url) {
                          e.stopPropagation()
                          setViewerImage({ url: j.avatar_url, title: displayName })
                        }
                      }}
                      hitSlop={6}
                    >
                      <Avatar
                        initials={initials(displayName)}
                        color={palette.primary}
                        size={48}
                        uri={j.avatar_url}
                      />
                    </Pressable>

                    <YStack flex={1} minWidth={0} gap={2}>
                      <Text
                        color={palette.text}
                        fontSize={15}
                        numberOfLines={1}
                        style={{ ...fonts.bold }}
                      >
                        {displayName}
                      </Text>

                      {pseudo && (
                        <Text
                          color={palette.primary}
                          fontSize={12}
                          numberOfLines={1}
                          style={{ ...fonts.semibold }}
                        >
                          {pseudo}
                        </Text>
                      )}

                      <XStack alignItems="center" gap={4} marginTop={2}>
                        <MapPin size={11} color={palette.textMuted} />
                        <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                          {j.city || 'Abidjan'} · {j.position || 'Joueur'}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Badge Disponible */}
                    <XStack
                      alignItems="center"
                      gap={5}
                      backgroundColor={`${palette.primary}18`}
                      paddingHorizontal={10}
                      paddingVertical={5}
                      borderRadius={999}
                      borderWidth={1}
                      borderColor={`${palette.primary}33`}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: palette.primary,
                        }}
                      />
                      <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                        DISPO
                      </Text>
                    </XStack>
                  </XStack>
                </Pressable>
              )
            })}
          </YStack>
        )}
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
