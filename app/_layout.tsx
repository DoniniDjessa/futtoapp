import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import tamaguiConfig from '@/tamagui.config'
import { colors, lightColors } from '@/lib/theme'
import { isSupabaseConfigured } from '@/lib/env'
import { ThemeModeProvider, useThemeMode } from '@/lib/theme-mode'
import { MenuProvider } from '@/lib/menu'
import { AuthProvider, useAuth } from '@/lib/auth'
import { isPermissionsPending } from '@/lib/permission-flags'
import { AppDrawer } from '@/components/AppDrawer'
import { AppDialogProvider } from '@/components/AppDialog'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

function MissingConfig() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined)
  }, [])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: 24,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.text, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }}>
        Config Supabase manquante
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          marginTop: 12,
          lineHeight: 22,
          fontFamily: 'PlusJakartaSans_400Regular',
        }}
      >
        Ajoute EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans
        .env.local puis relance Expo.
      </Text>
    </View>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const root = segments[0]
    const onAuth =
      root === 'splash' ||
      root === 'welcome' ||
      root === 'login' ||
      root === 'register' ||
      root === 'onboarding'
    const onPermissions = root === 'permissions'

    let cancelled = false
    ;(async () => {
      if (!session) return
      if (onPermissions) return

      const pending = await isPermissionsPending()
      if (cancelled) return

      if (pending) {
        router.replace('/permissions')
        return
      }

      if (onAuth) {
        router.replace('/(tabs)')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, session, segments, router])

  return <>{children}</>
}

function RootNav() {
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.bg,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      primary: palette.primary,
    },
  }

  const headerOpts = {
    headerStyle: { backgroundColor: palette.card },
    headerTintColor: palette.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: palette.bg },
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={mode}>
      <ThemeProvider value={navTheme}>
        <AppDialogProvider>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack
            initialRouteName="splash"
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}
          >
            <Stack.Screen name="splash" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="permissions" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="creer"
              options={{
                ...headerOpts,
                presentation: 'modal',
                headerShown: true,
                title: 'Nouveau match',
              }}
            />
            <Stack.Screen
              name="ajouter-terrain"
              options={{
                ...headerOpts,
                headerShown: true,
                title: 'Ajouter un terrain',
              }}
            />
            <Stack.Screen
              name="map-fullscreen"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="profil-edit"
              options={{ ...headerOpts, headerShown: true, title: 'Modifier le profil' }}
            />
            <Stack.Screen
              name="portefeuille"
              options={{ ...headerOpts, headerShown: true, title: 'Portefeuille' }}
            />
            <Stack.Screen
              name="notifications"
              options={{ ...headerOpts, headerShown: true, title: 'Notifications' }}
            />
            <Stack.Screen name="joueurs" options={{ ...headerOpts, headerShown: true, title: 'Joueurs' }} />
            <Stack.Screen
              name="joueurs/[id]"
              options={{ ...headerOpts, headerShown: true, title: 'Joueur' }}
            />
            <Stack.Screen
              name="reserver"
              options={{ ...headerOpts, headerShown: true, title: 'Réserver' }}
            />
            <Stack.Screen
              name="parametres"
              options={{ ...headerOpts, headerShown: true, title: 'Paramètres' }}
            />
            <Stack.Screen
              name="mon-equipe"
              options={{ ...headerOpts, headerShown: true, title: 'Mon équipe' }}
            />
            <Stack.Screen name="amis" options={{ ...headerOpts, headerShown: true, title: 'Mes amis' }} />
            <Stack.Screen
              name="classement"
              options={{ ...headerOpts, headerShown: true, title: 'Classement' }}
            />
            <Stack.Screen
              name="demander-creneau"
              options={{ ...headerOpts, headerShown: true, title: 'Demander un créneau' }}
            />
            <Stack.Screen
              name="mes-reservations"
              options={{ ...headerOpts, headerShown: true, title: 'Mes demandes' }}
            />
            <Stack.Screen
              name="creer-tournoi"
              options={{ ...headerOpts, headerShown: true, title: 'Organiser un tournoi' }}
            />
            <Stack.Screen
              name="publier-feed"
              options={{ ...headerOpts, headerShown: true, title: 'Publier' }}
            />
            <Stack.Screen
              name="feed/[id]"
              options={{ ...headerOpts, headerShown: true, title: 'Publication' }}
            />
            <Stack.Screen
              name="carte"
              options={{ ...headerOpts, headerShown: true, title: 'Carte' }}
            />
            <Stack.Screen
              name="marketplace"
              options={{ ...headerOpts, headerShown: true, title: 'Boutique' }}
            />
            <Stack.Screen
              name="messages"
              options={{ ...headerOpts, headerShown: true, title: 'Messages' }}
            />
            <Stack.Screen
              name="stats"
              options={{ ...headerOpts, headerShown: true, title: 'Statistiques' }}
            />
            <Stack.Screen name="aide" options={{ ...headerOpts, headerShown: true, title: 'Aide' }} />
            <Stack.Screen
              name="a-propos"
              options={{ ...headerOpts, headerShown: true, title: 'À propos' }}
            />
            <Stack.Screen
              name="recherche"
              options={{ ...headerOpts, headerShown: true, title: 'Recherche' }}
            />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="match/[id]" options={{ ...headerOpts, headerShown: true, title: 'Match' }} />
            <Stack.Screen
              name="terrain/[id]"
              options={{ ...headerOpts, headerShown: true, title: 'Terrain' }}
            />
          </Stack>
          <AppDrawer />
        </AppDialogProvider>
      </ThemeProvider>
    </TamaguiProvider>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null
  if (!isSupabaseConfigured()) return <MissingConfig />

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider>
        <AuthProvider>
          <MenuProvider>
            <AuthGate>
              <RootNav />
            </AuthGate>
          </MenuProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </GestureHandlerRootView>
  )
}
