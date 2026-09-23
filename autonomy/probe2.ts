import { YStack, XStack, Text, Button } from 'tamagui'

export type Y = typeof YStack
export type X = typeof XStack
export type Txt = typeof Text
export type Btn = typeof Button

export type YProps = import('tamagui').GetProps<typeof YStack>