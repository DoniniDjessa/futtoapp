import { useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Camera, MapPin, Mic } from 'lucide-react-native'
import { Text, YStack, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { clearPermissionsPending } from '@/lib/permission-flags'
import { requestOnboardingPermissions } from '@/lib/permissions'
import { colors } from '@/lib/theme'

const ITEMS = [
  {
    icon: MapPin,
    title: 'Localisation',
    body: 'Trouver terrains et joueurs près de toi.',
  },
  {
    icon: Camera,
    title: 'Caméra',
    body: 'Photos de profil, terrains et affiches.',
  },
  {
    icon: Mic,
    title: 'Micro',
    body: 'Messages vocaux et contenus live.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    body: 'Rappels de match et invitations.',
  },
] as const

export default function PermissionsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)

  async function continueFlow(ask: boolean) {
    if (busy) return
    setBusy(true)
    try {
      if (ask) await requestOnboardingPermissions()
      else await clearPermissionsPending()
    } finally {
      setBusy(false)
      router.replace('/(tabs)')
    }
  }

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top + 16}>
      <Stack.Screen options={{ headerShown: false }} />

      <YStack flex={1} paddingHorizontal={24} paddingBottom={Math.max(insets.bottom, 16) + 8}>
        <Text fontFamily="$heading" fontSize={32} color={colors.text}>
          Autorisations
        </Text>
        <Text
          color={colors.textMuted}
          marginTop={8}
          marginBottom={28}
          fontSize={14}
          lineHeight={21}
          style={{ ...fonts.regular }}
        >
          Pour que FUTTO fonctionne bien, active ces accès. Tu pourras les
          changer plus tard dans les réglages du téléphone.
        </Text>

        <YStack gap={14} flex={1}>
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <XStack
                key={item.title}
                alignItems="center"
                gap={14}
                backgroundColor={colors.card}
                borderRadius={16}
                borderWidth={1}
                borderColor={colors.border}
                padding={16}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(0,177,79,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color={colors.primary} strokeWidth={2.2} />
                </View>
                <YStack flex={1}>
                  <Text color={colors.text} style={{ ...fonts.semibold }} fontSize={15}>
                    {item.title}
                  </Text>
                  <Text
                    color={colors.textMuted}
                    fontSize={13}
                    marginTop={2}
                    style={{ ...fonts.regular }}
                  >
                    {item.body}
                  </Text>
                </YStack>
              </XStack>
            )
          })}
        </YStack>

        <Pressable
          onPress={() => void continueFlow(true)}
          disabled={busy}
          style={{
            marginTop: 20,
            height: 54,
            borderRadius: 999,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text color="#fff" style={{ ...fonts.bold }} fontSize={16}>
              Autoriser et continuer
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => void continueFlow(false)}
          disabled={busy}
          style={{ paddingVertical: 14 }}
        >
          <Text
            color={colors.textMuted}
            textAlign="center"
            style={{ ...fonts.medium }}
            fontSize={13}
          >
            Continuer quand même
          </Text>
        </Pressable>
      </YStack>
    </YStack>
  )
}
