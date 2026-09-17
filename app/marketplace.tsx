import { Stack } from 'expo-router'
import { Text, YStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

/** V1 — pas la boutique comme âme (FORMULATION). Écran vide volontaire. */
export default function MarketplaceScreen() {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  return (
    <YStack flex={1} backgroundColor={palette.bg} padding="$4" gap="$3">
      <Stack.Screen
        options={{
          title: 'Boutique',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <Text color={palette.textMuted} textAlign="center" style={{ ...fonts.medium }}>
        Pas encore de catalogue — focus matchs & terrains.
      </Text>
    </YStack>
  )
}
