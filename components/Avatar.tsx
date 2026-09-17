import { useState } from 'react'
import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { fonts } from '@/lib/fonts'

type Props = {
  initials: string
  color?: string
  size?: number
  uri?: string | null
}

/** Avatar initiales ou photo avec repli automatique */
export function Avatar({ initials, color = '#00b14f', size = 44, uri }: Props) {
  const [hasError, setHasError] = useState(false)

  if (uri && !hasError) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        onError={() => setHasError(true)}
      />
    )
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        style={{
          ...fonts.bold,
          color: '#fff',
          fontSize: size * 0.36,
        }}
      >
        {initials}
      </Text>
    </View>
  )
}
