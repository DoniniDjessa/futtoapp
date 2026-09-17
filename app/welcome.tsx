import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { Text, YStack, XStack } from 'tamagui'
import { BrandLogo } from '@/components/BrandLogo'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

const PANEL_RADIUS = 48
const LOGO_SIZE = 140

/**
 * Welcome — logo centré + panneau brand en bas (layout type mock café).
 * Splash inchangé.
 */
export default function WelcomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, loading } = useAuth()
  const rise = useSharedValue(0)

  useEffect(() => {
    if (!loading && session) router.replace('/(tabs)')
  }, [loading, session, router])

  useEffect(() => {
    rise.value = withDelay(
      40,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    )
  }, [rise])

  const panelStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 36 }],
  }))

  return (
    <YStack flex={1} backgroundColor="#fff">
      <Stack.Screen options={{ headerShown: false }} />

      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        paddingTop={insets.top}
        paddingHorizontal={24}
      >
        <BrandLogo size={LOGO_SIZE} />
        <Text
          fontFamily="$heading"
          fontSize={36}
          color="#0d0d0d"
          marginTop={18}
          letterSpacing={1}
        >
          FUTTO
        </Text>
        <Text
          color="#6b7280"
          fontSize={13}
          marginTop={4}
          style={{ ...fonts.medium }}
          letterSpacing={1.2}
        >
          LE FOOT NOUS UNIT
        </Text>
      </YStack>

      <Animated.View
        style={[
          panelStyle,
          {
            borderTopLeftRadius: PANEL_RADIUS,
            borderTopRightRadius: PANEL_RADIUS,
            overflow: 'hidden',
          },
        ]}
      >
        <View
          style={{
            backgroundColor: colors.authGreen,
            borderTopLeftRadius: PANEL_RADIUS,
            borderTopRightRadius: PANEL_RADIUS,
            paddingHorizontal: 28,
            paddingTop: 32,
            paddingBottom: Math.max(insets.bottom, 18) + 12,
          }}
        >
          <Text fontFamily="$heading" fontSize={30} color="#fff">
            Bienvenue
          </Text>
          <Text
            color="rgba(255,255,255,0.85)"
            marginTop={10}
            marginBottom={28}
            fontSize={14}
            lineHeight={21}
            style={{ ...fonts.regular }}
          >
            Trouve un terrain, invite tes potes et lance le prochain match à Abidjan.
          </Text>

          <XStack gap={12}>
            <Pressable
              onPress={() => router.push('/login')}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 999,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text color="#fff" style={{ ...fonts.bold }} fontSize={15}>
                Se connecter
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/register')}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 999,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text color="#0d0d0d" style={{ ...fonts.bold }} fontSize={15}>
                S’inscrire
              </Text>
            </Pressable>
          </XStack>

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={{ paddingVertical: 16, marginTop: 4 }}
          >
            <Text
              color="rgba(255,255,255,0.65)"
              textAlign="center"
              style={{ ...fonts.medium }}
              fontSize={13}
            >
              Continuer sans compte
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </YStack>
  )
}
