import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

export type UserCoords = { lat: number; lng: number }

/** Abidjan Plateau — fallback si aucune zone connue */
export const ABIDJAN: UserCoords = { lat: 5.36, lng: -4.0083 }

const LAST_COORDS_KEY = 'futto_last_coords'

export async function persistCoords(coords: UserCoords) {
  await AsyncStorage.setItem(LAST_COORDS_KEY, JSON.stringify(coords))
}

export async function loadLastCoords(): Promise<UserCoords | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_COORDS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserCoords
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords>(ABIDJAN)
  const [granted, setGranted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'gps' | 'last' | 'fallback'>('fallback')

  const applyFallback = useCallback(async () => {
    const last = await loadLastCoords()
    if (last) {
      setCoords(last)
      setSource('last')
      return last
    }
    setCoords(ABIDJAN)
    setSource('fallback')
    return ABIDJAN
  }, [])

  const request = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setGranted(false)
        setError('Permission localisation refusée')
        await applyFallback()
        setLoading(false)
        return false
      }
      setGranted(true)
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setCoords(next)
      setSource('gps')
      await persistCoords(next)
      setLoading(false)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Localisation indisponible')
      setGranted(false)
      await applyFallback()
      setLoading(false)
      return false
    }
  }, [applyFallback])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Affiche tout de suite la dernière zone connue (évite carte vide)
      const last = await loadLastCoords()
      if (!alive) return
      if (last) {
        setCoords(last)
        setSource('last')
      }

      const { status } = await Location.getForegroundPermissionsAsync()
      if (!alive) return
      if (status === 'granted') {
        setGranted(true)
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          if (!alive) return
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCoords(next)
          setSource('gps')
          await persistCoords(next)
        } catch {
          if (!alive) return
          await applyFallback()
        }
      } else {
        await applyFallback()
      }
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [applyFallback])

  return {
    coords,
    granted,
    loading,
    error,
    source,
    request,
    fallback: ABIDJAN,
  }
}

/** Pins % for overlay on a static map bbox approx around center */
export function pinPercent(
  lat: number,
  lng: number,
  center: UserCoords,
  span = 0.08,
): { top: `${number}%`; left: `${number}%` } {
  const top = Math.min(90, Math.max(8, 50 - ((lat - center.lat) / span) * 50))
  const left = Math.min(92, Math.max(8, 50 + ((lng - center.lng) / span) * 50))
  return { top: `${top}%`, left: `${left}%` }
}

/**
 * Calcul de la distance géodésique (formule de Haversine) en kilomètres.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Rayon moyen de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

/**
 * Rayon de proximité standard : 2.5 km (soit environ 5 km de diamètre).
 */
export const PROXIMITY_RADIUS_KM = 2.5

export function getTerrainDistanceKm(
  terrain: {
    lat?: number | null
    lng?: number | null
    distance_km?: number | null
    distanceKm?: number | null
  },
  userCoords: UserCoords,
): number {
  if (terrain.lat != null && terrain.lng != null) {
    return haversineDistanceKm(userCoords.lat, userCoords.lng, Number(terrain.lat), Number(terrain.lng))
  }
  if (terrain.distanceKm != null) return Number(terrain.distanceKm)
  if (terrain.distance_km != null) return Number(terrain.distance_km)
  return 999
}

export function isTerrainNearby(
  terrain: {
    lat?: number | null
    lng?: number | null
    distance_km?: number | null
    distanceKm?: number | null
  },
  userCoords: UserCoords,
  radiusKm: number = PROXIMITY_RADIUS_KM,
): boolean {
  const dist = getTerrainDistanceKm(terrain, userCoords)
  return dist <= radiusKm
}

