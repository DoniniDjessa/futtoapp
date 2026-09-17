import { Text, type TextProps } from 'tamagui'
import { fonts } from '@/lib/fonts'

type Weight = keyof typeof fonts

type Props = TextProps & {
  weight?: Weight
}

/** Texte courant FUTTO — Jakarta forcé (évite le fallback système) */
export function AppText({ weight = 'regular', style, ...props }: Props) {
  return <Text {...props} style={[fonts[weight], style as object]} />
}
