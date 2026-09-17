/**
 * Logique de calcul des badges dynamiques des joueurs FUTTO.
 * Critères pris en compte :
 * - Nombre de matchs joués (playedCount)
 * - Nombre de matchs organisés en tant qu'hôte (organizedCount)
 * - Note moyenne reçue (rating : null si pas encore noté)
 * - Niveau manuel déclaré (skill_level)
 */

export type PlayerBadge = {
  key: string
  label: string
  color: string
  bgColor: string
  description: string
}

export function computePlayerBadge(params: {
  playedCount: number
  organizedCount?: number
  rating?: number | null
  skillLevel?: string | null
}): PlayerBadge {
  const { playedCount = 0, organizedCount = 0, rating, skillLevel } = params
  const r = rating != null && rating > 0 ? Number(rating) : null

  // 1. Légende : 30+ matchs joués ET excellente note (>= 4.0)
  if (playedCount >= 30 && (r === null || r >= 4.0)) {
    return {
      key: 'legende',
      label: 'Légende',
      color: '#F59E0B', // Or ambré éclatant
      bgColor: 'rgba(245, 158, 11, 0.16)',
      description: 'Légende vivante de FUTTO avec plus de 30 matchs au compteur.',
    }
  }

  // 2. Élite : 15+ matchs joués avec bonne régularité/note
  if (playedCount >= 15 && (r === null || r >= 3.8)) {
    return {
      key: 'elite',
      label: 'Élite',
      color: '#8B5CF6', // Violet prestige
      bgColor: 'rgba(139, 92, 246, 0.16)',
      description: 'Joueur d’élite incontournable sur les terrains.',
    }
  }

  // 3. Capitaine : Organisateur assidu (3+ matchs organisés)
  if (organizedCount >= 3 && playedCount >= 2) {
    return {
      key: 'capitaine',
      label: 'Capitaine',
      color: '#EC4899', // Rose fuchsia dynamique
      bgColor: 'rgba(236, 72, 153, 0.16)',
      description: 'Meneur et rassembleur de communauté sur les matchs.',
    }
  }

  // 4. Confirmé : 8 à 14 matchs joués OU très bonne note avec au moins 3 matchs
  if (playedCount >= 8 || (playedCount >= 3 && r !== null && r >= 4.0)) {
    return {
      key: 'confirme',
      label: 'Confirmé',
      color: '#3B82F6', // Bleu dynamique
      bgColor: 'rgba(59, 130, 246, 0.16)',
      description: 'Joueur expérimenté, régulier et toujours présent.',
    }
  }

  // 5. Amateur : 4 à 7 matchs joués
  if (playedCount >= 4) {
    return {
      key: 'amateur',
      label: 'Amateur',
      color: '#10B981', // Émeraude
      bgColor: 'rgba(16, 185, 129, 0.16)',
      description: 'Habitué des matchs amicaux et des sessions de foot.',
    }
  }

  // 6. Espoir : 1 à 3 matchs joués
  if (playedCount >= 1) {
    return {
      key: 'espoir',
      label: 'Espoir',
      color: '#06B6D4', // Cyan
      bgColor: 'rgba(6, 182, 212, 0.16)',
      description: 'Premiers pas prometteurs sur les terrains FUTTO.',
    }
  }

  // 7. Nouveau / Rookie : 0 match joué, débute sur l'app
  return {
    key: 'nouveau',
    label: 'Nouveau',
    color: '#94A3B8', // Slate moderne
    bgColor: 'rgba(148, 163, 184, 0.16)',
    description: 'Nouveau joueur sur FUTTO, prêt pour son premier match !',
  }
}
