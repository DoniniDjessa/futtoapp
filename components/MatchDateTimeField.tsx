import { useEffect, useState } from 'react'
import { Platform, Pressable } from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { CalendarDays, Clock } from 'lucide-react-native'
import { Text, YStack, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'

type Palette = {
  card: string
  border: string
  text: string
  textMuted: string
  primary: string
  bg: string
}

type Props = {
  value: Date | null
  onChange: (d: Date) => void
  palette: Palette
  label?: string
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function formatDateFr(d: Date) {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeFr(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Calendrier + horloge (pas de saisie libre). */
export function MatchDateTimeField({
  value,
  onChange,
  palette,
  label = 'Date & heure',
}: Props) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null)
  const current = value ?? new Date(Date.now() + 3600_000)

  useEffect(() => {
    if (!value) onChange(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onPicker(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setMode(null)
    if (event.type === 'dismissed') {
      setMode(null)
      return
    }
    if (!selected) return
    const next = new Date(value ?? current)
    if (mode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    }
    onChange(next)
  }

  return (
    <YStack gap="$2">
      <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={14}>
        {label}
      </Text>
      <XStack gap="$2">
        <Pressable
          onPress={() => setMode('date')}
          style={{
            flex: 1.2,
            height: 52,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: mode === 'date' ? palette.primary : palette.border,
            backgroundColor: palette.card,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CalendarDays size={18} color={palette.primary} />
          <Text color={palette.text} style={{ ...fonts.medium }} fontSize={13} numberOfLines={1}>
            {formatDateFr(value ?? current)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('time')}
          style={{
            flex: 0.9,
            height: 52,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: mode === 'time' ? palette.primary : palette.border,
            backgroundColor: palette.card,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={18} color={palette.primary} />
          <Text color={palette.text} style={{ ...fonts.bold }} fontSize={15}>
            {formatTimeFr(value ?? current)}
          </Text>
        </Pressable>
      </XStack>

      {mode ? (
        <DateTimePicker
          value={value ?? current}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPicker}
          minimumDate={mode === 'date' ? new Date() : undefined}
          is24Hour
          themeVariant={palette.bg === '#0d0d0d' || palette.bg.startsWith('#0') ? 'dark' : 'light'}
        />
      ) : null}

      {Platform.OS === 'ios' && mode ? (
        <Pressable onPress={() => setMode(null)} style={{ paddingVertical: 8 }}>
          <Text color={palette.primary} textAlign="center" style={{ ...fonts.semibold }}>
            OK
          </Text>
        </Pressable>
      ) : null}
    </YStack>
  )
}
