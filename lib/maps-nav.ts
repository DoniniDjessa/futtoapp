import { Linking, Platform } from 'react-native'

/** Ouvre Google Maps en mode navigation vers lat/lng. */
export function openGoogleMapsNavigation(lat: number, lng: number, label?: string) {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`
  const url =
    Platform.OS === 'ios'
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
  const fallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  return Linking.openURL(url).catch(() => Linking.openURL(fallback))
}

export function terrainImages(terrain: {
  image_url?: string | null
  gallery_urls?: string[] | null
}): string[] {
  const fromGallery = Array.isArray(terrain.gallery_urls)
    ? terrain.gallery_urls.filter(Boolean)
    : []
  if (fromGallery.length > 0) return fromGallery
  if (terrain.image_url) return [terrain.image_url]
  return []
}
