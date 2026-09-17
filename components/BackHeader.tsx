import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

export function BackHeader({
  title,
  onBack,
  backHref,
  right,
}: {
  title: string
  onBack?: () => void
  backHref?: string
  right?: ReactNode
}) {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  function handleBack() {
    if (onBack) {
      onBack()
    } else if (backHref) {
      router.push(backHref as any)
    } else {
      router.back()
    }
  }

  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        backgroundColor: palette.card,
      }}
    >
      <Pressable
        onPress={handleBack}
        hitSlop={12}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronLeft size={22} color={palette.text} />
      </Pressable>

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          color: palette.text,
          ...fonts.bold,
        }}
      >
        {title}
      </Text>

      {right ? (
        <View style={{ minWidth: 38, alignItems: 'flex-end' }}>{right}</View>
      ) : (
        <View style={{ width: 38 }} />
      )}
    </View>
  )
}
