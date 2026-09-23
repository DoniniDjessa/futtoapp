import { Stack } from 'expo-router'
import { Text, YStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

export default function MarketplaceScreen() {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  return (
    <YStack flex={1} backgroundColor={palette.bg} padding="$4" justifyContent="center" alignItems="center">
      <Stack.Screen
        options={{
          title: 'Boutique',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <Text color={palette.textMuted} fontSize={15} textAlign="center" style={{ ...fonts.medium }}>
        Aucune donnée pour l'instant
      </Text>
    </YStack>
  )
}
