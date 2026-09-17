/** Rôles app mobile — pas de superAdmin côté joueur. */
export type UserRole = 'player' | 'manager'

/** superAdmin = staff backoffice uniquement. */
export type DbUserRole = UserRole | 'superAdmin'

export function isManager(role?: string | null) {
  return role === 'manager'
}

/** Managers + superAdmin (backoffice) peuvent ajouter des terrains dans l’app. */
export function canAddTerrains(role?: string | null) {
  return role === 'manager' || role === 'superAdmin'
}

export const SURFACE_OPTIONS = [
  'Synthétique',
  'Gazon naturel',
  'Béton',
  'Terre battue',
  'Indoor',
  'Autre',
] as const

export type Profile = {
  id: string
  email: string | null
  pseudo?: string | null
  full_name: string | null
  first_name: string | null
  phone: string | null
  position: string | null
  city: string | null
  avatar_url: string | null
  cover_url?: string | null
  is_available_to_play?: boolean | null
  skill_level?: string | null
  rating?: number | null
  expo_push_token?: string | null
  role: DbUserRole
  created_at: string
  updated_at?: string
}

export type Terrain = {
  id: string
  name: string
  zone: string | null
  quartier: string | null
  price_per_hour: number
  surface: string | null
  rating: number | null
  distance_km: number | null
  lat: number | null
  lng: number | null
  image_url: string | null
  photos?: string[] | null
  description?: string | null
  amenities?: string[] | null
  contact_phone?: string | null
  opening_time?: string | null
  closing_time?: string | null
  pin_top: string | null
  pin_left: string | null
  localisation_id?: string | null
  created_by: string | null
  created_at: string
  updated_at?: string
}

export type Localisation = {
  id: string
  ville: string
  commune: string
  quartier: string
  label: string
  lat: number | null
  lng: number | null
  boost: number
  active: boolean
  created_at: string
}

export type MatchHostProfile = {
  id: string
  full_name?: string | null
  first_name?: string | null
  pseudo?: string | null
  avatar_url?: string | null
  rating?: number | null
  position?: string | null
}

export type MatchRow = {
  id: string
  host_id: string
  title: string
  visibility: 'private' | 'public' | 'both'
  terrain_id: string | null
  terrain_label: string | null
  zone: string | null
  kickoff_at: string | null
  format: string | null
  spots_total: number
  spots_taken: number
  spots_min?: number
  join_mode?: 'free' | 'adhesion'
  share_token?: string | null
  booking_id?: string | null
  price_participation: number
  status: 'draft' | 'planned' | 'confirmed' | 'played' | 'cancelled'
  created_at: string
  updated_at?: string
  host?: MatchHostProfile | null
}

export type TerrainBooking = {
  id: string
  terrain_id: string
  requester_id: string
  match_id: string | null
  starts_at: string
  duration_hours: number
  amount_fcfa: number
  status: 'requested' | 'confirmed' | 'rejected' | 'paid' | 'cancelled'
  payment_provider: 'orange' | 'mtn' | 'wave' | 'cash' | null
  note: string | null
  manager_note: string | null
  created_at: string
  updated_at?: string
}

export type MatchPlayer = {
  id: string
  match_id: string
  profile_id: string | null
  display_name: string | null
  phone: string | null
  status: 'invited' | 'joined' | 'left' | 'no_show'
  created_at: string
}
