/** Libellés FR pour codes techniques stockés en anglais en base. */

export function matchStatusLabel(status?: string | null): string {
  switch (status) {
    case 'draft':
      return 'Brouillon'
    case 'planned':
      return 'Planifié'
    case 'confirmed':
      return 'Confirmé'
    case 'played':
      return 'Joué'
    case 'cancelled':
      return 'Annulé'
    default:
      return status || '—'
  }
}

export function joinModeLabel(mode?: string | null): string {
  if (mode === 'adhesion') return 'Adhésion'
  return 'Gratuit'
}

export function bookingStatusLabel(status?: string | null): string {
  switch (status) {
    case 'requested':
      return 'Demandé'
    case 'confirmed':
      return 'Confirmé (à payer)'
    case 'rejected':
      return 'Refusé'
    case 'paid':
      return 'Payé'
    case 'cancelled':
      return 'Annulé'
    default:
      return status || '—'
  }
}

export function tournamentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'open':
      return 'Inscriptions ouvertes'
    case 'running':
      return 'En cours'
    case 'full':
      return 'Complet'
    case 'done':
      return 'Terminé'
    default:
      return status || '—'
  }
}

export function playerStatusLabel(status?: string | null): string {
  switch (status) {
    case 'invited':
      return 'Invité'
    case 'joined':
      return 'Inscrit'
    case 'left':
      return 'Parti'
    case 'no_show':
      return 'Absent'
    default:
      return status || '—'
  }
}

export function skillLevelLabel(level?: string | null): string {
  if (!level) return 'Amateur'
  const map: Record<string, string> = {
    beginner: 'Débutant',
    amateur: 'Amateur',
    intermediate: 'Intermédiaire',
    advanced: 'Confirmé',
    pro: 'Pro',
  }
  return map[level.toLowerCase()] || level
}
