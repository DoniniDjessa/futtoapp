import { Stack } from 'expo-router'
import { Alert, Pressable } from 'react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

export default function ParametresScreen() {
  const { mode, setMode, toggle } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user } = useAuth()

  async function enablePush() {
    if (!user) {
      Alert.alert('Connexion', 'Connecte-toi d’abord.')
      return
    }
    const { registerForPushNotifications } = await import('@/lib/push')
    const token = await registerForPushNotifications(user.id)
    Alert.alert(
      'Notifications',
      token
        ? 'Push activées (build natif / EAS). En Expo Go le remote push est limité.'
        : 'Permission refusée ou indisponible sur cet appareil.',
    )
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg} padding="$4" gap="$3">
      <Stack.Screen
        options={{
          title: 'Paramètres',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
        Uniquement des réglages liés à un geste réel.
      </Text>

      <YStack
        backgroundColor={palette.card}
        borderRadius={14}
        padding="$3"
        borderWidth={1}
        borderColor={palette.border}
        gap="$2"
      >
        <Text color={palette.text} style={{ ...fonts.semibold }}>
          Apparence
        </Text>
        <XStack gap="$2">
          <Pressable
            onPress={() => setMode('dark')}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'dark' ? palette.primary : palette.bg,
              borderWidth: 1.5,
              borderColor: mode === 'dark' ? palette.primary : palette.border,
            }}
          >
            <Text
              style={{
                ...fonts.bold,
                color: mode === 'dark' ? '#fff' : palette.text,
                fontSize: 15,
              }}
            >
              Nuit
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('light')}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'light' ? palette.primary : palette.bg,
              borderWidth: 1.5,
              borderColor: mode === 'light' ? palette.primary : palette.border,
            }}
          >
            <Text
              style={{
                ...fonts.bold,
                color: mode === 'light' ? '#fff' : palette.text,
                fontSize: 15,
              }}
            >
              Jour
            </Text>
          </Pressable>
        </XStack>
        <Pressable onPress={toggle} style={{ paddingVertical: 10 }}>
          <Text color={palette.textMuted} textAlign="center" style={{ ...fonts.medium }} fontSize={13}>
            Basculer
          </Text>
        </Pressable>
      </YStack>

      <YStack
        backgroundColor={palette.card}
        borderRadius={14}
        padding="$3"
        borderWidth={1}
        borderColor={palette.border}
        gap={10}
      >
        <Text color={palette.text} style={{ ...fonts.semibold }}>
          Notifications push
        </Text>
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Créneau confirmé, joueur qui rejoint, minimum atteint, rappel ~2 h avant. Remote push =
          build EAS (limité dans Expo Go).
        </Text>
        <Button backgroundColor={palette.primary} borderRadius={12} onPress={() => void enablePush()}>
          <Text color="#fff" style={{ ...fonts.bold }}>
            Activer / réenregistrer
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
