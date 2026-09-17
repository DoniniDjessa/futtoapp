import { Image } from 'expo-image'
import { View } from 'react-native'

const icon = require('../assets/images/icon.png')

type Props = {
  size?: number
  rounded?: number
}

/** Logo FUTTO = icône app (assets/images/icon.png). */
export function BrandLogo({ size = 96, rounded }: Props) {
  const radius = rounded ?? Math.round(size * 0.28)
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <Image
        source={icon}
        style={{ width: size, height: size }}
        contentFit="cover"
      />
    </View>
  )
}
