import type { ReactNode } from 'react'
import Svg, { Circle, Path, Rect, G } from 'react-native-svg'
import { View } from 'react-native'

type Props = { size?: number; color?: string }

/** Icônes plates 2D colorées (home) — style FlatIcon. */
function Frame({ size = 40, children }: { size?: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {children}
      </Svg>
    </View>
  )
}

export function FlatIconReserver({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#E8F8EF" />
      <Path
        d="M32 14c-8.3 0-15 6.4-15 14.3 0 10.1 15 23.7 15 23.7s15-13.6 15-23.7C47 20.4 40.3 14 32 14z"
        fill="#00b14f"
      />
      <Circle cx="32" cy="28" r="5.5" fill="#fff" />
    </Frame>
  )
}

export function FlatIconCreer({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#FFF3E8" />
      <Rect x="18" y="16" width="28" height="32" rx="4" fill="#ff7a00" />
      <Rect x="22" y="20" width="12" height="3" rx="1.5" fill="#fff" opacity="0.9" />
      <Rect x="22" y="27" width="20" height="2.5" rx="1.2" fill="#fff" opacity="0.55" />
      <Rect x="22" y="33" width="16" height="2.5" rx="1.2" fill="#fff" opacity="0.55" />
      <Circle cx="42" cy="44" r="10" fill="#00b14f" />
      <Path d="M42 39v10M37 44h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </Frame>
  )
}

export function FlatIconJoueurs({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#EAF2FF" />
      <G fill="#3b82f6">
        <Circle cx="24" cy="24" r="6" />
        <Path d="M12 42c0-6.6 5.4-10 12-10s12 3.4 12 10v2H12v-2z" />
        <Circle cx="42" cy="24" r="5" opacity="0.85" />
        <Path d="M34 42c.8-4.8 4.6-7.5 8-7.5 4.2 0 8 3 8 7.5v2H34v-2z" opacity="0.85" />
      </G>
    </Frame>
  )
}

export function FlatIconTournois({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#FFF8E1" />
      <Path
        d="M22 18h20v6c0 6.6-4.5 12-10 13.5V44h6v4H26v-4h6v-6.5C26.5 36 22 30.6 22 24v-6z"
        fill="#ffb800"
      />
      <Path d="M18 20h4v6c-2.2 0-4-1.8-4-4v-2zM42 20h4v2c0 2.2-1.8 4-4 4v-6z" fill="#ffb800" />
    </Frame>
  )
}

export function FlatIconClassement({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#F3E8FF" />
      <Rect x="14" y="34" width="10" height="16" rx="2" fill="#a855f7" />
      <Rect x="27" y="22" width="10" height="28" rx="2" fill="#7c3aed" />
      <Rect x="40" y="28" width="10" height="22" rx="2" fill="#c084fc" />
    </Frame>
  )
}

export function FlatIconBoutique({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#FFE4EC" />
      <Path
        d="M18 24h28l-2.5 22a4 4 0 01-4 3.5H24.5a4 4 0 01-4-3.5L18 24z"
        fill="#ec4899"
      />
      <Path
        d="M24 24v-2a8 8 0 0116 0v2"
        stroke="#be185d"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </Frame>
  )
}

export function FlatIconStats({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#E0F7FA" />
      <Path d="M16 44V28l10 8 10-16 12 12v12H16z" fill="#06b6d4" opacity="0.9" />
      <Path
        d="M16 28l10 8 10-16 12 12"
        stroke="#0891b2"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

export function FlatIconMessages({ size = 40 }: Props) {
  return (
    <Frame size={size}>
      <Circle cx="32" cy="32" r="30" fill="#E8F5E9" />
      <Path
        d="M16 20h32a4 4 0 014 4v16a4 4 0 01-4 4H28l-8 8v-8h-4a4 4 0 01-4-4V24a4 4 0 014-4z"
        fill="#00b14f"
      />
      <Circle cx="26" cy="32" r="2.2" fill="#fff" />
      <Circle cx="32" cy="32" r="2.2" fill="#fff" />
      <Circle cx="38" cy="32" r="2.2" fill="#fff" />
    </Frame>
  )
}
