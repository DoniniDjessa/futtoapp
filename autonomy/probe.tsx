import { YStack } from 'tamagui'

export function Probe() {
  return (
    <YStack
      flex={1}
      background={'#000'}
      backgroundColor={'#000'}
      padding={1}
      paddingVertical={1}
      paddingHorizontal={1}
      alignItems={'center'}
      justifyContent={'space-between'}
      gap={1}
      marginTop={1}
      marginBottom={1}
      borderRadius={1}
      borderWidth={1}
      minWidth={1}
      maxWidth={1}
    />
  )
}

export function ProbeText() {
  return (
    <YStack>
      <YStack backgroundColor={'#000'} />
    </YStack>
  )
}