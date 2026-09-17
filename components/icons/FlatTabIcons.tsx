import type { ReactNode } from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { View } from 'react-native'

type Props = { size?: number; color?: string }

/** Icônes 2D plates unicolores pour la bottom tab. */
function Frame({ size = 24, children }: { size?: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {children}
      </Svg>
    </View>
  )
}

export function TabIconHome({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Path
        d="M12 28L32 12l20 16v24a4 4 0 01-4 4H16a4 4 0 01-4-4V28z"
        fill={color}
      />
      <Rect x="26" y="36" width="12" height="16" rx="2" fill="#fff" opacity={0.95} />
    </Frame>
  )
}

export function TabIconMatchs({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Rect x="14" y="14" width="36" height="40" rx="6" fill={color} />
      <Rect x="20" y="10" width="6" height="8" rx="2" fill={color} />
      <Rect x="38" y="10" width="6" height="8" rx="2" fill={color} />
      <Rect x="20" y="26" width="10" height="8" rx="2" fill="#fff" opacity={0.9} />
      <Rect x="34" y="26" width="10" height="8" rx="2" fill="#fff" opacity={0.9} />
      <Rect x="20" y="38" width="10" height="8" rx="2" fill="#fff" opacity={0.55} />
      <Rect x="34" y="38" width="10" height="8" rx="2" fill="#fff" opacity={0.55} />
    </Frame>
  )
}

export function TabIconCreer({ size = 28, color = '#ffffff' }: Props) {
  return (
    <Frame size={size}>
      <Path
        d="M32 14v36M14 32h36"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </Frame>
  )
}

export function TabIconTournois({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Path
        d="M20 14h24v8c0 7.5-5.2 13.5-12 15.2V46h8v4H24v-4h8v-8.8C25.2 35.5 20 29.5 20 22v-8z"
        fill={color}
      />
      <Path d="M16 16h4v8c-2.2 0-4-1.8-4-4v-4zM44 16h4v4c0 2.2-1.8 4-4 4v-8z" fill={color} />
      <Rect x="24" y="48" width="16" height="4" rx="2" fill={color} />
    </Frame>
  )
}

export function TabIconCarte({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Path
        d="M32 10c-9 0-16 7-16 15.5C16 36.5 32 52 32 52s16-15.5 16-26.5C48 17 41 10 32 10z"
        fill={color}
      />
      <Circle cx="32" cy="26" r="7" fill="#fff" />
    </Frame>
  )
}

export function TabIconTerrains({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Rect x="10" y="14" width="44" height="36" rx="6" fill={color} />
      <Path
        d="M32 14v36M10 32h44"
        stroke="#fff"
        strokeWidth="2.5"
        strokeOpacity={0.9}
      />
      <Circle cx="32" cy="32" r="7" stroke="#fff" strokeWidth="2.5" fill="none" />
      <Path
        d="M10 22c6 0 10 4 10 10s-4 10-10 10M54 22c-6 0-10 4-10 10s4 10 10 10"
        stroke="#fff"
        strokeWidth="2.2"
        strokeOpacity={0.75}
        fill="none"
      />
    </Frame>
  )
}

export function TabIconFeed({ size = 24, color = '#00b14f' }: Props) {
  return (
    <Frame size={size}>
      <Rect x="12" y="12" width="40" height="40" rx="8" fill={color} />
      <Rect x="18" y="20" width="18" height="3.5" rx="1.5" fill="#fff" opacity={0.95} />
      <Rect x="18" y="28" width="28" height="2.5" rx="1.2" fill="#fff" opacity={0.55} />
      <Rect x="18" y="34" width="24" height="2.5" rx="1.2" fill="#fff" opacity={0.55} />
      <Circle cx="44" cy="44" r="10" fill={color} />
      <Circle cx="44" cy="44" r="7.5" fill="#fff" opacity={0.2} />
      <Path
        d="M40 42.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5v1.5h-8v-1.5z"
        fill="#fff"
      />
      <Circle cx="44" cy="38.5" r="2.2" fill="#fff" />
    </Frame>
  )
}
