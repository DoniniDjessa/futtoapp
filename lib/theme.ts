import type { ColorTokens } from '@tamagui/web'
import type { OpaqueColorValue } from 'react-native'

/** Couleur hex dynamique (valide en runtime) vers les props couleur Tamagui (strictes en type). */
export const toColor = (v: string): OpaqueColorValue => v as unknown as OpaqueColorValue

/** Hex + suffixe alpha ex. '22' (~13 %) — props couleur Tamagui strictes en type. */
export const withAlpha = (hex: string, alpha = '22'): OpaqueColorValue =>
  `${hex}${alpha}` as unknown as OpaqueColorValue

/** Valeur des props *Color des champs Tamagui (placeholder/selection → ColorTokens). */
export const toTokenColor = (v: string): ColorTokens => v as unknown as ColorTokens

export { fonts, bodyFontFamily } from '@/lib/fonts'

/** FUTTO skin — from ../futto demo + FORMULATION.md */
export const colors = {
  bg: '#0d0d0d',
  card: '#161616',
  cardElevated: '#1c1c1c',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#9ca3af',
  primary: '#00b14f',
  primaryDark: '#006838',
  /** Vert quasi-noir (welcome / login / register) */
  authGreen: '#06140c',
  accent: '#ff7a00',
  gold: '#ffb800',
  danger: '#ef4444',
  success: '#00b14f',
} as const

export const lightColors = {
  bg: '#f4f7f5',
  card: '#ffffff',
  cardElevated: '#ffffff',
  border: '#e5e7eb',
  text: '#0d0d0d',
  textMuted: '#6b7280',
  primary: '#00b14f',
  primaryDark: '#006838',
  authGreen: '#06140c',
  accent: '#ff7a00',
  gold: '#ffb800',
  danger: '#ef4444',
  success: '#00b14f',
} as const

export type ThemeMode = 'dark' | 'light'

export function palette(mode: ThemeMode = 'dark') {
  return mode === 'dark' ? colors : lightColors
}

export function formatFCFA(amount: number) {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`
}
