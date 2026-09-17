import { Tabs, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, Home, Newspaper, Plus, User } from 'lucide-react-native'
import { colors, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { fonts } from '@/lib/fonts'

/**
 * Tab bar FUTTO (peau démo) :
 * Accueil | Matchs | + Créer | Feed | Profil
 */
export default function TabsLayout() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 10) + 10
  const tabHeight = 56 + bottomPad

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, ...fonts.semibold },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="matchs"
        options={{
          title: 'Matchs',
          tabBarIcon: ({ color }) => <CalendarDays color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="creer-tab"
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault()
            router.push('/creer')
          },
        })}
        options={{
          title: 'Créer',
          tabBarIcon: () => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                shadowColor: colors.primary,
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Plus color="#fff" size={26} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Newspaper color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="tournois" options={{ href: null }} />
      <Tabs.Screen name="terrains" options={{ href: null }} />
    </Tabs>
  )
}
