import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { MapPin, Search, X } from 'lucide-react-native'
import { Text, YStack, XStack, Input } from 'tamagui'
import { fonts } from '@/lib/fonts'
import type { Localisation } from '@/lib/types'

type Palette = {
  bg: string
  card: string
  border: string
  text: string
  textMuted: string
  primary: string
}

type Props = {
  items: Localisation[]
  loading?: boolean
  value: Localisation | null
  onChange: (loc: Localisation | null) => void
  palette: Palette
  onOpenChange?: (open: boolean) => void
}

/** Tape + sélectionne une localisation FUTTO (ville · commune · quartier). */
export function LocalisationSearchPicker({
  items,
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
    if (!q) return items.slice(0, 24)
    return items
      .filter((l) =>
        [l.label, l.ville, l.commune, l.quartier].join(' ').toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [items, query])

  if (value) {
    return (
      <YStack gap="$2">
        <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
          Localisation
        </Text>
        <XStack
          alignItems="center"
          gap="$3"
          backgroundColor={palette.card}
          borderWidth={1.5}
          borderColor={palette.primary}
          borderRadius={14}
          paddingHorizontal={14}
          paddingVertical={12}
        >
          <MapPin size={18} color={palette.primary} />
          <YStack flex={1} minWidth={0}>
            <Text color={palette.text} style={{ ...fonts.semibold }} numberOfLines={1}>
              {value.label}
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              Référentiel FUTTO
              {value.boost > 0 ? ` · boost ${value.boost}` : ''}
            </Text>
          </YStack>
          <Pressable
            onPress={() => {
              onChange(null)
              setOpen(false)
            }}
            hitSlop={10}
          >
            <X size={18} color={palette.textMuted} />
          </Pressable>
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack gap="$2" zIndex={30}>
      <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
        Localisation
      </Text>
      <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
        Tape et choisis une entrée du référentiel (pas de saisie libre).
      </Text>
      <View style={{ position: 'relative' }}>
        <XStack
          alignItems="center"
          gap="$2"
          backgroundColor={palette.card}
          borderWidth={1}
          borderColor={open ? palette.primary : palette.border}
          borderRadius={14}
          paddingHorizontal={12}
          height={52}
        >
          <Search size={18} color={palette.textMuted} />
          <Input
            flex={1}
            unstyled
            value={query}
            onChangeText={(t) => {
              setQuery(t)
              setOpenState(true)
            }}
            onFocus={() => setOpenState(true)}
            placeholder="Ex. Cocody, Angré…"
            color={palette.text}
            placeholderTextColor={palette.textMuted}
            style={{ ...fonts.regular, height: 48 }}
          />
        </XStack>

        {open ? (
          <YStack
            marginTop={8}
            backgroundColor={palette.card}
            borderWidth={1}
            borderColor={palette.border}
            borderRadius={16}
            overflow="hidden"
            maxHeight={260}
          >
            {loading ? (
              <YStack padding="$3">
                <Text color={palette.textMuted} style={{ ...fonts.medium }}>
                  Chargement…
                </Text>
              </YStack>
            ) : items.length === 0 ? (
              <YStack padding="$3">
                <Text color={palette.textMuted} style={{ ...fonts.regular }} fontSize={13}>
                  Aucune localisation — le superAdmin doit les créer dans le backoffice.
                </Text>
              </YStack>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {filtered.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      onChange(l)
                      setQuery('')
                      setOpen(false)
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <MapPin size={16} color={palette.primary} />
                    <YStack flex={1}>
                      <Text color={palette.text} style={{ ...fonts.semibold }} numberOfLines={1}>
                        {l.label}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </YStack>
        ) : null}
      </View>
    </YStack>
  )
}
