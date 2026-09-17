import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { MapPin, Search, X } from 'lucide-react-native'
import { fonts } from '@/lib/fonts'
import type { Terrain } from '@/lib/types'

type Palette = {
  bg: string
  card: string
  border: string
  text: string
  textMuted: string
  primary: string
}

type Props = {
  terrains: Terrain[]
  loading?: boolean
  value: Terrain | null
  onChange: (terrain: Terrain | null) => void
  palette: Palette
  onOpenChange?: (open: boolean) => void
}

function labelOf(t: Terrain) {
  return [t.name, t.quartier, t.zone].filter(Boolean).join(' · ')
}

function matchesQuery(t: Terrain, q: string) {
  const hay = [t.name, t.zone, t.quartier, t.surface]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

/**
 * Sélecteur localisation type Yango : taper pour filtrer, choisir un terrain
 * enregistré uniquement (pas de lieu libre).
 */
export function TerrainZonePicker({
  terrains,
  loading,
  value,
  onChange,
  palette,
  onOpenChange,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return terrains.slice(0, 12)
    return terrains.filter((t) => matchesQuery(t, q)).slice(0, 20)
  }, [terrains, query])

  // Zones uniques pour suggestions rapides (quand peu de texte)
  const zoneHints = useMemo(() => {
    const set = new Set<string>()
    for (const t of terrains) {
      if (t.zone?.trim()) set.add(t.zone.trim())
      if (t.quartier?.trim()) set.add(t.quartier.trim())
    }
    const q = query.trim().toLowerCase()
    return [...set]
      .filter((z) => !q || z.toLowerCase().includes(z))
      .slice(0, 8)
  }, [terrains, query])

  function selectTerrain(t: Terrain) {
    onChange(t)
    setQuery('')
    setOpenState(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    setOpenState(false)
  }

  function pickZoneHint(zone: string) {
    setQuery(zone)
    setOpen(true)
  }

  return (
    <View style={{ gap: 8, zIndex: 20 }}>
      <Text style={{ color: palette.text, fontSize: 14, ...fonts.semibold }}>
        Localisation
      </Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, ...fonts.regular }}>
        Tape ta zone, puis choisis un terrain FUTTO (seuls les terrains enregistrés).
      </Text>

      {value ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: palette.card,
            borderWidth: 1.5,
            borderColor: palette.primary,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <MapPin size={18} color={palette.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: palette.text, ...fonts.semibold }} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12, ...fonts.regular }} numberOfLines={1}>
              {[value.quartier, value.zone].filter(Boolean).join(' · ') || 'Terrain FUTTO'}
            </Text>
          </View>
          <Pressable onPress={clear} hitSlop={10}>
            <X size={18} color={palette.textMuted} />
          </Pressable>
        </View>
      ) : (
        <View style={{ position: 'relative' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: open ? palette.primary : palette.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 52,
            }}
          >
            <Search size={18} color={palette.textMuted} />
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t)
                setOpenState(true)
                if (value) onChange(null)
              }}
              onFocus={() => setOpenState(true)}
              placeholder="Ex. Cocody, Angré, complexe…"
              placeholderTextColor={palette.textMuted}
              style={{
                flex: 1,
                color: palette.text,
                height: 48,
                fontSize: 14,
                ...fonts.regular,
              }}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('')
                  setOpenState(true)
                }}
                hitSlop={8}
              >
                <X size={16} color={palette.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {open ? (
            <View
              style={{
                marginTop: 8,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 16,
                overflow: 'hidden',
                maxHeight: 280,
              }}
            >
              {loading ? (
                <View style={{ padding: 12 }}>
                  <Text style={{ color: palette.textMuted, ...fonts.medium }}>
                    Chargement des terrains…
                  </Text>
                </View>
              ) : terrains.length === 0 ? (
                <View style={{ padding: 12, gap: 4 }}>
                  <Text style={{ color: palette.text, ...fonts.semibold }}>
                    Aucun terrain enregistré
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, ...fonts.regular }}>
                    Un manager doit d’abord ajouter le complexe dans le backoffice.
                  </Text>
                </View>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {zoneHints.length > 0 && query.trim().length < 2 ? (
                    <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8 }}>
                      <Text
                        style={{
                          color: palette.textMuted,
                          fontSize: 11,
                          letterSpacing: 0.6,
                          ...fonts.medium,
                        }}
                      >
                        ZONES
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {zoneHints.map((z) => (
                          <Pressable
                            key={z}
                            onPress={() => pickZoneHint(z)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: palette.bg,
                              borderWidth: 1,
                              borderColor: palette.border,
                            }}
                          >
                            <Text style={{ color: palette.text, fontSize: 12, ...fonts.medium }}>
                              {z}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
                    <Text
                      style={{
                        color: palette.textMuted,
                        fontSize: 11,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        letterSpacing: 0.6,
                        ...fonts.medium,
                      }}
                    >
                      TERRAINS ({filtered.length})
                    </Text>
                    {filtered.length === 0 ? (
                      <View style={{ padding: 12 }}>
                        <Text style={{ color: palette.textMuted, fontSize: 13, ...fonts.regular }}>
                          Aucun terrain pour « {query.trim()} ». Essaie une autre zone.
                        </Text>
                      </View>
                    ) : (
                      filtered.map((t) => (
                        <Pressable
                          key={t.id}
                          onPress={() => selectTerrain(t)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: 'rgba(0,177,79,0.15)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MapPin size={16} color={palette.primary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{ color: palette.text, ...fonts.semibold }}
                              numberOfLines={1}
                            >
                              {t.name}
                            </Text>
                            <Text
                              style={{ color: palette.textMuted, fontSize: 12, ...fonts.regular }}
                              numberOfLines={1}
                            >
                              {labelOf(t)}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}
