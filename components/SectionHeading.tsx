import type { ReactNode } from 'react'
import { Pressable } from 'react-native'
import { Text, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

type Props = {
  children: string
  /** muted = labels secondaires (TES MATCHS…) */
  tone?: 'default' | 'muted' | 'accent'
  marginTop?: number
  marginBottom?: number
  right?: ReactNode
  onAll?: () => void
  allLabel?: string
}

/** Titres de section app (hors sidebar) — Oswald + majuscules */
export function SectionHeading({
  children,
  tone = 'default',
  marginTop = 0,
  marginBottom = 12,
  right,
  onAll,
  allLabel = 'Voir tout',
}: Props) {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const color =
    tone === 'accent' ? palette.accent : tone === 'muted' ? palette.textMuted : palette.text

  return (
    <XStack
      marginTop={marginTop}
      marginBottom={marginBottom}
      justifyContent="space-between"
      alignItems="center"
      gap={12}
    >
      <Text
        flex={1}
        fontFamily="$heading"
        fontSize={tone === 'muted' || tone === 'accent' ? 12 : 16}
        color={color as any}
        textTransform="uppercase"
        letterSpacing={0}
        style={{ opacity: tone === 'muted' ? 0.55 : 0.95 }}
      >
        {children}
      </Text>
      {right}
      {onAll ? (
        <Pressable onPress={onAll}>
          <Text color={palette.primary as any} fontSize={12} style={{ ...fonts.medium, opacity: 0.85 }}>
            {allLabel}
          </Text>
        </Pressable>
      ) : null}
    </XStack>
  )
}
