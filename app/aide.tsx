import { Linking } from 'react-native'
import { Text, YStack } from 'tamagui'
import { StackScreenShell, usePalette } from '@/components/StackScreenShell'
import { fonts } from '@/lib/fonts'

export default function AideScreen() {
  const palette = usePalette()

  return (
    <StackScreenShell
      title="Aide"
      blurb="Un vrai geste : écris-nous. Pas une FAQ morte."
      cta="Écrire sur WhatsApp"
      onCta={() =>
        Linking.openURL(
          `https://wa.me/?text=${encodeURIComponent('Salut FUTTO, j’ai besoin d’aide : ')}`,
        )
      }
    >
      <YStack
        backgroundColor={palette.card}
        borderRadius={14}
        padding="$3"
        borderWidth={1}
        borderColor={palette.border}
        gap="$2"
      >
        <Text color={palette.text} style={{ ...fonts.semibold }}>
          Match / invitation
        </Text>
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Relance depuis l’accueil ou le détail match. WhatsApp ouvre le numéro quand vous
          partagez le même créneau.
        </Text>
      </YStack>

      <YStack
        backgroundColor={palette.card}
        borderRadius={14}
        padding="$3"
        borderWidth={1}
        borderColor={palette.border}
        gap="$2"
        marginTop="$3"
      >
        <Text color={palette.text} style={{ ...fonts.semibold }}>
          Crédits icônes
        </Text>
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Certaines icônes de l’app s’inspirent du style FlatIcon (flaticon.com). Les
          assets FlatIcon officiels seront crédités ici dès leur intégration, conformément
          à leurs conditions d’utilisation.
        </Text>
      </YStack>
    </StackScreenShell>
  )
}
