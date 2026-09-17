import { Pressable } from 'react-native'
import { Menu } from 'lucide-react-native'
import { useMenu } from '@/lib/menu'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

export function MenuButton() {
  const { setOpen } = useMenu()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  return (
    <Pressable
      accessibilityLabel="Menu"
      onPress={() => setOpen(true)}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.cardElevated,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Menu color={palette.text} size={20} />
    </Pressable>
  )
}
