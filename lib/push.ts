import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'

type NotificationsMod = typeof import('expo-notifications')

/** Expo Go SDK 53+ : `require('expo-notifications')` throw sur Android — ne pas charger. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo'
}

function tryNotifications(): NotificationsMod | null {
  if (isExpoGo()) return null
  try {
    return require('expo-notifications') as NotificationsMod
  } catch {
    return null
  }
}

export async function ensureAndroidChannel() {
  const Notifications = tryNotifications()
  if (!Notifications || Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('futto', {
    name: 'FUTTO',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00b14f',
  })
}

/** Demande permission + enregistre le token Expo sur le profil. */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const Notifications = tryNotifications()
  if (!Notifications || !supabase) return null

  try {
    await ensureAndroidChannel()

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    // projectId EAS requis pour getExpoPushTokenAsync
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId

    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync()

    const token = tokenRes.data
    if (!token) return null

    await supabase
      .from(T.profiles)
      .update({ expo_push_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId)

    return token
  } catch {
    return null
  }
}

/** Envoie une push Expo (best-effort). Ne plante pas l’UI. */
export async function sendExpoPush(params: {
  to: string | string[]
  title: string
  body: string
  data?: Record<string, unknown>
}) {
  const tokens = (Array.isArray(params.to) ? params.to : [params.to]).filter(Boolean)
  if (tokens.length === 0) return { ok: false as const, reason: 'no-token' }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          sound: 'default',
          title: params.title,
          body: params.body,
          data: params.data ?? {},
          channelId: 'futto',
        })),
      ),
    })
    if (!res.ok) return { ok: false as const, reason: await res.text() }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, reason: e instanceof Error ? e.message : 'push-failed' }
  }
}

/**
 * In-app + push (si token connu).
 * Utilise insert notif + lecture expo_push_token du destinataire.
 */
export async function notifyUser(params: {
  profileId: string
  title: string
  body: string
  kind?: 'match' | 'invite' | 'reminder' | 'system' | 'booking' | 'wallet' | 'tournament'
  data?: Record<string, unknown>
}) {
  if (!supabase) return

  try {
    const row: Record<string, unknown> = {
      profile_id: params.profileId,
      title: params.title,
      body: params.body,
      kind: params.kind ?? 'system',
    }
    if (params.data) row.data = params.data
    const { error } = await supabase.from(T.notifications).insert(row)
    if (error && /data/i.test(error.message)) {
      delete row.data
      await supabase.from(T.notifications).insert(row)
    }
  } catch {
    /* RLS / table */
  }

  try {
    const { data } = await supabase
      .from(T.profiles)
      .select('expo_push_token')
      .eq('id', params.profileId)
      .maybeSingle()
    const token = (data as { expo_push_token?: string | null } | null)?.expo_push_token
    if (token) {
      await sendExpoPush({
        to: token,
        title: params.title,
        body: params.body,
        data: params.data,
      })
    }
  } catch {
    /* ignore */
  }
}

/** Programme un rappel local (device) avant kickoff — best-effort. */
export async function scheduleMatchReminder(opts: {
  matchId: string
  title: string
  kickoffAt: string
}) {
  const Notifications = tryNotifications()
  if (!Notifications) return

  try {
    const kickoff = new Date(opts.kickoffAt).getTime()
    const twoHoursBefore = kickoff - 2 * 3600_000
    const delay = twoHoursBefore - Date.now()
    if (delay < 60_000) return

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Coup d’envoi bientôt',
        body: `« ${opts.title} » dans ~2 h — prépare-toi.`,
        data: { matchId: opts.matchId, kind: 'reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: new Date(twoHoursBefore),
      } as never,
    })
  } catch {
    /* Expo Go / permissions */
  }
}
