import { useEffect } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Text, YStack } from 'tamagui'
import { BrandLogo } from '@/components/BrandLogo'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

const SPLASH_MS = 2400
const { width } = Dimensions.get('window')

/** Splash motion — plein écran, distinct du welcome. */
export default function SplashScreen() {
  const router = useRouter()
  const { session, loading } = useAuth()

  const lineW = useSharedValue(0)
  const logoY = useSharedValue(40)
  const logoOp = useSharedValue(0)
  const wordOp = useSharedValue(0)
  const wordX = useSharedValue(-24)
  const fade = useSharedValue(1)

  function goNext() {
    router.replace(session ? '/(tabs)' : '/welcome')
  }

  useEffect(() => {
    if (loading) return

    logoOp.value = withTiming(1, { duration: 450 })
    logoY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })
    wordOp.value = withDelay(320, withTiming(1, { duration: 500 }))
    wordX.value = withDelay(
      320,
      withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }),
    )
    lineW.value = withDelay(
      500,
      withTiming(width * 0.45, { duration: 700, easing: Easing.out(Easing.quad) }),
    )

    const timer = setTimeout(() => {
      fade.value = withSequence(
        withTiming(1, { duration: 1 }),
        withTiming(0, { duration: 280 }, (done) => {
          if (done) runOnJS(goNext)()
        }),
      )
    }, SPLASH_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ translateY: logoY.value }],
  }))

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOp.value,
    transform: [{ translateX: wordX.value }],
  }))

  const lineStyle = useAnimatedStyle(() => ({
    width: lineW.value,
    opacity: wordOp.value,
  }))

  const screenStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }))

  return (
    <YStack flex={1} backgroundColor="#050805">
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
      <Animated.View style={[{ flex: 1 }, screenStyle]}>
        {/* Diagonal pitch bands — unique to splash */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: '#050805',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -80,
            right: -60,
            width: width * 0.85,
            height: width * 0.85,
            borderRadius: width,
            borderWidth: 40,
            borderColor: 'rgba(0,177,79,0.08)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -40,
            left: -80,
            width: width * 0.7,
            height: width * 0.7,
            borderRadius: width,
            borderWidth: 28,
            borderColor: 'rgba(255,122,0,0.06)',
          }}
        />

        <YStack flex={1} justifyContent="center" paddingHorizontal={36} gap={18}>
          <Animated.View style={logoStyle}>
            <BrandLogo size={88} />
          </Animated.View>

          <Animated.View style={wordStyle}>
            <Text
              fontFamily="$heading"
              fontSize={56}
              color="#fff"
              letterSpacing={4}
            >
              FUTTO
            </Text>
            <Text
              color={colors.primary}
              marginTop={6}
              style={{ ...fonts.semibold }}
              fontSize={13}
            >
              ABIDJAN · MATCH HONORÉ
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              {
                height: 3,
                borderRadius: 2,
                backgroundColor: colors.primary,
                marginTop: 8,
              },
              lineStyle,
            ]}
          />
        </YStack>
      </Animated.View>
    </YStack>
  )
}
