import { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { BrandLogo } from '@/components/BrandLogo'
import { colors, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { fonts } from '@/lib/fonts'

export function FuttoLogoLoader({
  size = 68,
  label = 'Chargement…',
  inline = false,
}: {
  size?: number
  label?: string
  inline?: boolean
}) {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const scale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.06, 0.92],
  })
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.65, 0.2],
  })
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.34],
  })

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: inline ? 12 : 24,
        gap: 14,
      }}
    >
      <View
        style={{
          width: size + 32,
          height: size + 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Anneau pulsant vert émeraude FUTTO façon DealPro */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size + 22,
            height: size + 22,
            borderRadius: (size + 22) / 2,
            borderWidth: 2.5,
            borderColor: palette.primary,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />

        {/* Logo FUTTO animé en pulsation douce */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <BrandLogo size={size} />
        </Animated.View>
      </View>

      {label ? (
        <Text
          style={{
            fontSize: 13,
            color: palette.textMuted,
            ...fonts.semibold,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  )
}

export function FuttoBootScreen({ label = 'Chargement de FUTTO…' }: { label?: string }) {
  let mode: 'dark' | 'light' = 'dark'
  try {
    const theme = useThemeMode()
    if (theme?.mode) mode = theme.mode
  } catch {
    mode = 'dark'
  }
  const palette = mode === 'dark' ? colors : lightColors

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FuttoLogoLoader size={76} label={label} />
    </View>
  )
}
