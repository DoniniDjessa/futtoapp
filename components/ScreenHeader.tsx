import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Bell, MapPin } from 'lucide-react-native'
import { Text, XStack, YStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { MenuButton } from '@/components/MenuButton'
import { useNotifications, useSessionProfile } from '@/lib/data'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

type Props = {
  title?: string
  subtitle?: string
  /** Accueil peau ../futto : avatar + Bonjour + ville + cloche */
  home?: boolean
  right?: ReactNode
  showBell?: boolean
}

export function ScreenHeader({
  title,
  subtitle,
  home = false,
  right,
  showBell = false,
}: Props) {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { profile } = useSessionProfile()
  const { unreadCount } = useNotifications()
  const first =
    profile?.first_name || profile?.full_name?.split(' ')[0] || 'toi'
  const city = profile?.city || 'Abidjan'
  const isAvailable = Boolean(profile?.is_available_to_play)

  if (home) {
    return (
      <XStack alignItems="center" justifyContent="space-between" paddingTop={8} marginBottom="$2">
        <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
          <MenuButton />
          <Pressable onPress={() => router.push('/profil')} style={{ flex: 1, minWidth: 0 }}>
            <XStack alignItems="center" gap={12}>
              <Avatar
                initials={initials(profile?.full_name || profile?.first_name || profile?.pseudo)}
                color={palette.primary}
                size={44}
                uri={profile?.avatar_url}
              />
              <YStack flex={1} minWidth={0}>
                <Text
                  fontFamily="$heading"
                  fontSize={20}
                  color={palette.text}
                  numberOfLines={1}
                  style={{ ...fonts.semibold }}
                >
                  Bonjour {first}
                </Text>

                {/* Statut de disponibilité 2D sous le nom */}
                <XStack alignItems="center" gap={6} marginTop={3} flexWrap="wrap">
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: isAvailable ? `${palette.primary}18` : `${palette.textMuted}14`,
                      borderWidth: 1,
                      borderColor: isAvailable ? `${palette.primary}40` : palette.border,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isAvailable ? palette.primary : palette.textMuted,
                      }}
                    />
                    <Text
                      color={isAvailable ? palette.primary : palette.textMuted}
                      fontSize={10}
                      style={{ ...fonts.bold }}
                    >
                      {isAvailable ? 'Dispo pour jouer' : 'Non disponible'}
                    </Text>
                  </View>

                  <XStack alignItems="center" gap={3}>
                    <MapPin size={11} color={palette.textMuted} />
                    <Text
                      color={palette.textMuted}
                      fontSize={11}
                      numberOfLines={1}
                      style={{ ...fonts.medium }}
                    >
                      {city}
                    </Text>
                  </XStack>
                </XStack>
              </YStack>
            </XStack>
          </Pressable>
        </XStack>
        <Pressable
          accessibilityLabel="Notifications"
          onPress={() => router.push('/notifications')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: palette.cardElevated,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} color={palette.text} />
          {unreadCount > 0 && (
            <YStack
              position="absolute"
              top={7}
              right={7}
              width={9}
              height={9}
              borderRadius={5}
              backgroundColor={palette.accent}
              borderWidth={1.5}
              borderColor={palette.cardElevated}
            />
          )}
        </Pressable>
      </XStack>
    )
  }

  return (
    <XStack alignItems="center" gap="$3" paddingTop={8} marginBottom="$2">
      <MenuButton />
      <YStack flex={1} minWidth={0}>
        <Text
          fontFamily="$heading"
          fontSize={26}
          color={palette.text}
          numberOfLines={1}
          textTransform="uppercase"
          letterSpacing={0}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            color={palette.textMuted}
            fontSize={13}
            numberOfLines={1}
            style={{ ...fonts.medium }}
          >
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {showBell ? (
        <Pressable
          accessibilityLabel="Notifications"
          onPress={() => router.push('/notifications')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: palette.cardElevated,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} color={palette.text} />
          {unreadCount > 0 && (
            <YStack
              position="absolute"
              top={7}
              right={7}
              width={9}
              height={9}
              borderRadius={5}
              backgroundColor={palette.accent}
              borderWidth={1.5}
              borderColor={palette.cardElevated}
            />
          )}
        </Pressable>
      ) : null}
      {right}
    </XStack>
  )
}
