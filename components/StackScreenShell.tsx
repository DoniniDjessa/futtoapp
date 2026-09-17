import type { ReactNode } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Text, YStack, Button } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

type Props = {
  title: string
  blurb: string
  cta?: string
  onCta?: () => void
  children?: ReactNode
}

export function StackScreenShell({ title, blurb, cta, onCta, children }: Props) {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  return (
    <YStack flex={1} backgroundColor={palette.bg as any} padding="$4" gap="$3">
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <Text color={palette.textMuted as any} fontSize={13} style={{ ...fonts.medium }}>
        {blurb}
      </Text>
      {children}
      {cta && onCta ? (
        <Button
          marginTop="$2"
          backgroundColor={palette.primary as any}
          color="#fff"
          borderRadius={12}
          onPress={onCta}
        >
          {cta}
        </Button>
      ) : null}
    </YStack>
  )
}

export function usePalette() {
  const { mode } = useThemeMode()
  return mode === 'dark' ? colors : lightColors
}

export function useGo() {
  return useRouter()
}
