import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import type { Localisation } from '@/lib/types'

export function useLocalisations() {
  const [items, setItems] = useState<Localisation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from(T.localisations)
      .select('id, ville, commune, quartier, label, lat, lng, boost, active, created_at')
      .eq('active', true)
      .order('boost', { ascending: false })
      .order('ville')
      .order('commune')
      .order('quartier')
    if (err) setError(err.message)
    else {
      setError(null)
      setItems((data as Localisation[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { localisations: items, loading, error, refresh }
}
