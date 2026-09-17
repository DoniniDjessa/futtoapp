import { Text, YStack } from 'tamagui'
import { StackScreenShell, usePalette } from '@/components/StackScreenShell'
import { fonts } from '@/lib/fonts'

export default function AProposScreen() {
  const palette = usePalette()

  return (
    <StackScreenShell title="À propos" blurb="Le foot nous unit — Abidjan d’abord.">
      <YStack
        backgroundColor={palette.card}
        borderRadius={14}
        padding="$4"
        borderWidth={1}
        borderColor={palette.border}
        gap="$2"
        alignItems="center"
      >
        <Text fontFamily="$heading" fontSize={36} color={palette.primary}>
          FUTTO
        </Text>
        <Text color={palette.textMuted} textAlign="center" style={{ ...fonts.medium }}>
          App pour se rencontrer et jouer au foot en ville. L’unité, c’est le match honoré.
        </Text>
      </YStack>
    </StackScreenShell>
  )
}
