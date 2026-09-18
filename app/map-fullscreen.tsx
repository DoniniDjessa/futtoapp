import { Stack, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { HomeMap } from '@/components/HomeMap'
import { useTerrains } from '@/lib/data'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'

/** Carte plein écran (Leaflet / OpenStreetMap). */
export default function MapFullscreenScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { terrains } = useTerrains()

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <HomeMap terrains={terrains} fullscreen showExpand={false} />
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityLabel="Fermer"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: mode === 'dark' ? 'rgba(13,13,13,0.9)' : 'rgba(255,255,255,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <X size={22} color={palette.text} />
      </Pressable>
    </View>
  )
}
