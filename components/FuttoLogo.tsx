import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { View } from 'react-native'
import { colors } from '@/lib/theme'

type Props = {
  size?: number
  /** Rounded mark on green (default) or flat wordmark-friendly mark */
  variant?: 'mark' | 'flat'
}

/** Logo marque FUTTO — monogramme terrain / F. */
export function FuttoLogo({ size = 88, variant = 'mark' }: Props) {
  const r = size * 0.22
  if (variant === 'flat') {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
          <Path
            d="M28 22h40c2.2 0 4 1.8 4 4v8H48v10h20v10H48v20H36V26c0-2.2 1.8-4 4-4h-12z"
            fill={colors.primary}
          />
          <Circle cx="70" cy="70" r="10" fill={colors.accent} />
          <Circle cx="70" cy="70" r="4" fill="#0d0d0d" />
        </Svg>
      </View>
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: 'hidden',
        backgroundColor: colors.primary,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Rect width="96" height="96" rx={20} fill={colors.primary} />
        {/* Ball hint */}
        <Circle cx="68" cy="30" r="14" fill="rgba(255,255,255,0.18)" />
        <Path
          d="M68 20c2.5 2.2 4 5.4 4 9s-1.5 6.8-4 9"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          fill="none"
        />
        {/* F / pitch lines */}
        <Path
          d="M26 28h34v10H40v8h18v10H40v20H26V28z"
          fill="#fff"
        />
        <Path
          d="M18 78h60"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}
