import { Linking, Share, Platform } from 'react-native'

export function matchShareUrl(shareToken: string) {
  // Deep link schéma app + fallback web plus tard
  return `https://futto.app/m/${shareToken}`
}

export function matchInviteMessage(opts: {
  title: string
  terrain?: string | null
  kickoffAt?: string | null
  spotsTaken: number
  spotsTotal: number
  joinMode: 'free' | 'adhesion'
  price?: number
  shareToken?: string | null
}) {
  const when = opts.kickoffAt
    ? new Date(opts.kickoffAt).toLocaleString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'date à confirmer'
  const places = `${opts.spotsTaken}/${opts.spotsTotal} places`
  const price =
    opts.joinMode === 'adhesion' && (opts.price ?? 0) > 0
      ? `${opts.price!.toLocaleString('fr-FR')} FCFA / joueur`
      : 'Gratuit'
  const link = opts.shareToken ? `\n${matchShareUrl(opts.shareToken)}` : ''
  return `⚽ FUTTO — ${opts.title}
📍 ${opts.terrain || 'Terrain'}
🕒 ${when}
👥 ${places}
💰 ${price}${link}

Rejoins-nous !`
}

export async function openWhatsAppInvite(message: string, phone?: string) {
  const text = encodeURIComponent(message)
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`
    : `https://wa.me/?text=${text}`
  const can = await Linking.canOpenURL(url)
  if (can) await Linking.openURL(url)
  else await Share.share({ message })
}

export async function shareInvite(message: string) {
  await Share.share({
    message,
    ...(Platform.OS === 'ios' ? { url: undefined } : {}),
  })
}
