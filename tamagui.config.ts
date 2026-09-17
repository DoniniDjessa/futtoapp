import { defaultConfig } from '@tamagui/config/v5'
import { createFont, createTamagui } from 'tamagui'

/**
 * Keep this file free of react-native / app lib imports —
 * Tamagui’s babel compiler must evaluate it in Node (Got config: null otherwise).
 *
 * Body faces = Plus Jakarta (Android + loaded on iOS).
 * Runtime iOS SF Pro still applied via `lib/fonts` style tokens.
 */
const body = createFont({
  family: 'PlusJakartaSans_400Regular',
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 24,
    9: 32,
    10: 40,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 20,
    4: 22,
    5: 24,
    6: 26,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
    true: 24,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    8: '800',
    true: '400',
  },
  letterSpacing: {
    4: 0,
    true: 0,
  },
  face: {
    400: { normal: 'PlusJakartaSans_400Regular' },
    500: { normal: 'PlusJakartaSans_500Medium' },
    600: { normal: 'PlusJakartaSans_600SemiBold' },
    700: { normal: 'PlusJakartaSans_700Bold' },
  },
})

const oswald = createFont({
  family: 'Oswald_700Bold',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 22,
    6: 28,
    7: 34,
    8: 42,
    9: 52,
    10: 64,
    true: 22,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 20,
    4: 24,
    5: 28,
    6: 34,
    7: 40,
    8: 48,
    9: 58,
    10: 72,
    true: 28,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    true: '700',
  },
  letterSpacing: {
    4: 0,
    true: 0,
  },
  face: {
    400: { normal: 'Oswald_400Regular' },
    500: { normal: 'Oswald_500Medium' },
    600: { normal: 'Oswald_600SemiBold' },
    700: { normal: 'Oswald_700Bold' },
  },
})

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    heading: oswald,
    body,
  },
})

export default tamaguiConfig

export type AppConfig = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
