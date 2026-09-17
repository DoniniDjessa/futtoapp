import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { Text, YStack, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'

type Props = {
  visible: boolean
  imageUrl: string | null
  title?: string | null
  onClose: () => void
}

/** Modal plein écran pour visualiser une photo (avatar ou publication) en grand format. */
export function ImageViewerModal({ visible, imageUrl, title, onClose }: Props) {
  if (!imageUrl) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Barre du haut */}
        <XStack
          paddingTop={50}
          paddingHorizontal={20}
          paddingBottom={16}
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          zIndex={10}
        >
          <Text
            color="#fff"
            fontSize={15}
            numberOfLines={1}
            flex={1}
            style={{ ...fonts.semibold }}
          >
            {title || 'Photo'}
          </Text>

          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={styles.closeBtn}
          >
            <X size={20} color="#fff" />
          </Pressable>
        </XStack>

        {/* Zone Image */}
        <Pressable style={styles.imageContainer} onPress={onClose}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
  },
})
