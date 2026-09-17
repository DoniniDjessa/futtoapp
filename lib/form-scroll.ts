import { useRef } from 'react'
import type { ScrollView } from 'react-native'

/**
 * Scroll un formulaire pour faire remonter un input / select ouvert
 * tout en haut de l'écran visible afin que l'utilisateur voie immédiatement
 * les premières options de la liste.
 */
export function useFormScroll() {
  const scrollRef = useRef<ScrollView>(null)
  const offsets = useRef<Record<string, number>>({})

  function onFieldLayout(key: string, y: number) {
    offsets.current[key] = y
  }

  function scrollToField(key: string, padding = 12, delay = 80) {
    const y = offsets.current[key]
    if (y == null || !scrollRef.current) return

    const runScroll = () => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - padding),
        animated: true,
      })
    }

    if (delay > 0) {
      setTimeout(runScroll, delay)
    } else {
      requestAnimationFrame(runScroll)
    }
  }

  return { scrollRef, onFieldLayout, scrollToField }
}

