export function isOpenOnFutto(visibility?: string | null) {
  return visibility === 'public' || visibility === 'both'
}

export function visibilityLabel(visibility?: string | null) {
  if (visibility === 'both') return 'PRIVÉ + OUVERT FUTTO'
  if (visibility === 'public') return 'OUVERT FUTTO'
  return 'PRIVÉ'
}
