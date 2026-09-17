import * as Location from 'expo-location'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { persistCoords, type UserCoords } from '@/lib/location'
import { clearPermissionsPending } from '@/lib/permission-flags'
import { supabase } from '@/lib/supabase'

export type PermResult = {
  location: boolean
  camera: boolean
  audio: boolean
  notifications: boolean
  coords: UserCoords | null
}

export {
  markPermissionsPending,
  clearPermissionsPending,
  isPermissionsPending,
  PENDING_PERMS_KEY,
  PERMS_DONE_KEY,
} from '@/lib/permission-flags'

/** Charge un module natif optionnel (Expo Go / build sans le module → false). */
function tryNative<T>(loader: () => T): T | null {
  try {
    return loader()
  } catch {
    return null
  }
}

async function requestCamera(): Promise<boolean> {
  const mod = tryNative(() => require('expo-camera') as any)
  if (!mod?.Camera?.requestCameraPermissionsAsync && !mod?.requestCameraPermissionsAsync) {
    return false
  }
  try {
    const fn =
      mod.requestCameraPermissionsAsync ??
      mod.Camera.requestCameraPermissionsAsync.bind(mod.Camera)
    const cam = await fn()
    return cam.status === 'granted'
  } catch {
    return false
  }
}

async function requestAudio(): Promise<boolean> {
  const cam = tryNative(() => require('expo-camera') as any)
  if (cam?.requestMicrophonePermissionsAsync) {
    try {
      const mic = await cam.requestMicrophonePermissionsAsync()
      return mic.status === 'granted'
    } catch {
      /* fall through */
    }
  }
  if (cam?.Camera?.requestMicrophonePermissionsAsync) {
    try {
      const mic = await cam.Camera.requestMicrophonePermissionsAsync()
      return mic.status === 'granted'
    } catch {
      /* fall through */
    }
  }

  const av = tryNative(() => require('expo-av') as typeof import('expo-av'))
  if (av?.Audio?.requestPermissionsAsync) {
    try {
      const mic = await av.Audio.requestPermissionsAsync()
      return mic.status === 'granted'
    } catch {
      return false
    }
  }
  return false
}

/**
 * Notifications : expo-notifications throw à l'import dans Expo Go (SDK 53+ Android).
 * Skip total en Expo Go ; push réel = dev/production build.
 */
async function requestNotifications(): Promise<boolean> {
  if (Constants.appOwnership === 'expo') return false
  const Notifications = tryNative(
    () => require('expo-notifications') as typeof import('expo-notifications'),
  )
  if (!Notifications?.requestPermissionsAsync) {
    return false
  }
  try {
    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('futto', {
        name: 'FUTTO',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      })
    }
    const notif = await Notifications.requestPermissionsAsync()
    return Boolean(
      notif.granted ||
        notif.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL,
    )
  } catch {
    return false
  }
}

/** Demande localisation, caméra, micro, notifications (après inscription). */
export async function requestOnboardingPermissions(): Promise<PermResult> {
  const result: PermResult = {
    location: false,
    camera: false,
    audio: false,
    notifications: false,
    coords: null,
  }

  try {
    const loc = await Location.requestForegroundPermissionsAsync()
    result.location = loc.status === 'granted'
    if (result.location) {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        result.coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        await persistCoords(result.coords)
      } catch {
        /* keep null */
      }
    }
  } catch {
    result.location = false
  }

  result.camera = await requestCamera()
  result.audio = await requestAudio()
  result.notifications = await requestNotifications()

  // Enregistre le token push si possible (user déjà connecté)
  if (result.notifications && supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user?.id) {
        const { registerForPushNotifications } = await import('@/lib/push')
        await registerForPushNotifications(data.user.id)
      }
    } catch {
      /* ignore */
    }
  }

  await clearPermissionsPending()
  return result
}
