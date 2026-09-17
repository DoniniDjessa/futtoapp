import type { TextStyle } from 'react-native'

/**
 * Textes ordinaires — Plus Jakarta Sans (iOS + Android).
 * Titres = Oswald via fontFamily="$heading".
 * Embarquées via expo-font plugin (EAS / stores) pour ne pas retomber sur la police système.
 */
export const bodyFaces = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const

function face(family: string): TextStyle {
  return { fontFamily: family }
}

export const fonts = {
  regular: face(bodyFaces.regular),
  medium: face(bodyFaces.medium),
  semibold: face(bodyFaces.semibold),
  bold: face(bodyFaces.bold),
}

export const bodyFontFamily = bodyFaces.regular
