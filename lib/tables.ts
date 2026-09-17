/** Tables Supabase préfixées futto_ */
export const T = {
  profiles: 'futto_profiles',
  terrains: 'futto_terrains',
  matches: 'futto_matches',
  matchPlayers: 'futto_match_players',
  walletAccounts: 'futto_wallet_accounts',
  walletTransactions: 'futto_wallet_transactions',
  notifications: 'futto_notifications',
  tournaments: 'futto_tournaments',
  localisations: 'futto_localisations',
  bookings: 'futto_terrain_bookings',
  teams: 'futto_teams',
  teamMembers: 'futto_team_members',
  posts: 'futto_posts',
  postLikes: 'futto_post_likes',
  postComments: 'futto_post_comments',
  conversations: 'futto_conversations',
  conversationParticipants: 'futto_conversation_participants',
  messages: 'futto_messages',
  follows: 'futto_follows',
  platformSettings: 'futto_platform_settings',
  tournamentRegistrations: 'futto_tournament_registrations',
  tournamentMatches: 'futto_tournament_matches',
} as const

/** Plafond adhésion match (FCFA) — anti-magouille */
export const MAX_ADHESION_FCFA = 5000

export const BO_EMAIL_DOMAIN = 'bo.futto.app'

export function aliasEmailFromPseudo(pseudo: string) {
  const clean = pseudo
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^\.+|\.+$/g, '')
  if (!clean) throw new Error('Pseudo invalide')
  return `${clean}@${BO_EMAIL_DOMAIN}`
}

export function isBoAliasEmail(email?: string | null) {
  return !!email && email.toLowerCase().endsWith(`@${BO_EMAIL_DOMAIN}`)
}
