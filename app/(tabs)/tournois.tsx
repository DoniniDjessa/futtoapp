import { useMemo, useState } from 'react'
import { Pressable, ScrollView } from 'react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Banknote, CalendarDays, MapPin, Tag, Users } from 'lucide-react-native'
import { ScreenHeader } from '@/components/ScreenHeader'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { useTournaments, type TournamentRow } from '@/lib/data'

type TabKey = 'upcoming' | 'running' | 'done'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'running', label: 'En cours' },
  { key: 'done', label: 'Terminés' },
]

function tabForStatus(status: string): TabKey {
  if (status === 'running') return 'running'
  if (status === 'done') return 'done'
  return 'upcoming' // open | full
}

function ctaLabel(status: string): string {
  if (status === 'running') return 'Voir le tournoi'
  if (status === 'done') return 'Voir les résultats'
  if (status === 'full') return 'Complet — détails'
  return "S'inscrire"
}

export default function TournoisScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { tournaments, loading } = useTournaments()
  const [tab, setTab] = useState<TabKey>('upcoming')

  const filtered = useMemo(
    () => tournaments.filter((t) => tabForStatus(t.status) === tab),
    [tournaments, tab],
  )

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <YStack paddingHorizontal="$4" paddingTop={52} gap="$3">
        <ScreenHeader title="Tournois" subtitle="Inscriptions & affiches" />

        <Button
          backgroundColor={palette.primary}
          borderRadius={12}
          onPress={() => router.push('/creer-tournoi')}
        >
          <Text color="#fff" style={{ ...fonts.bold }}>
            Organiser un tournoi
          </Text>
        </Button>

        <XStack gap={8}>
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1 }}>
                <YStack
                  alignItems="center"
                  paddingVertical={10}
                  borderRadius={999}
                  backgroundColor={active ? palette.primary : palette.card}
                  borderWidth={1}
                  borderColor={active ? palette.primary : palette.border}
                >
                  <Text
                    color={active ? '#fff' : palette.textMuted}
                    fontSize={13}
                    style={{ ...(active ? fonts.bold : fonts.medium) }}
                  >
                    {t.label}
                  </Text>
                </YStack>
              </Pressable>
            )
          })}
        </XStack>
      </YStack>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement…
          </Text>
        ) : filtered.length === 0 ? (
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            {tab === 'upcoming'
              ? 'Aucun tournoi à venir — organise le premier (commission 10 %).'
              : tab === 'running'
                ? 'Aucun tournoi en cours.'
                : 'Aucun tournoi terminé.'}
          </Text>
        ) : (
          filtered.map((t) => (
            <TournamentCard key={t.id} t={t} palette={palette} />
          ))
        )}
      </ScrollView>
    </YStack>
  )
}

function TournamentCard({
  t,
  palette,
}: {
  t: TournamentRow
  palette: typeof colors | typeof lightColors
}) {
  const price =
    t.fee_fcfa > 0 ? `À partir de ${formatFCFA(t.fee_fcfa)}` : 'Inscription gratuite'
  const statusBadge =
    t.status === 'running'
      ? 'En cours'
      : t.status === 'done'
        ? 'Terminé'
        : t.status === 'full'
          ? 'Complet'
          : 'Tournoi'

  return (
    <YStack
      backgroundColor={palette.card}
      borderRadius={18}
      overflow="hidden"
      borderWidth={1}
      borderColor={palette.border}
    >
      <YStack position="relative">
        {t.poster_url ? (
          <Image
            source={{ uri: t.poster_url }}
            style={{ width: '100%', height: 200 }}
            contentFit="cover"
          />
        ) : (
          <YStack
            height={200}
            backgroundColor={palette.primaryDark}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="#fff" fontSize={22} style={{ ...fonts.bold }}>
              {t.name.slice(0, 1).toUpperCase()}
            </Text>
          </YStack>
        )}

        <XStack
          position="absolute"
          bottom={12}
          right={0}
          backgroundColor={palette.accent}
          paddingHorizontal={12}
          paddingVertical={6}
          borderTopLeftRadius={10}
          borderBottomLeftRadius={10}
          alignItems="center"
          gap={6}
        >
          <Tag size={14} color="#fff" />
          <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
            {statusBadge}
          </Text>
        </XStack>
      </YStack>

      <YStack padding="$4" gap="$2.5">
        <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
          <Text
            flex={1}
            color={palette.text}
            fontSize={16}
            numberOfLines={2}
            style={{ ...fonts.bold }}
          >
            {t.name}
          </Text>
          <YStack alignItems="center" minWidth={44} gap={2}>
            <Users size={18} color={palette.primary} />
            <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.medium }}>
              {t.teams}/{t.teams_max}
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          <CalendarDays size={16} color={palette.textMuted} />
          <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
            {t.date_label?.trim() || 'Date à confirmer'}
          </Text>
        </XStack>

        <XStack alignItems="center" gap={8}>
          <Banknote size={16} color={palette.primary} />
          <Text color={palette.primary} fontSize={14} style={{ ...fonts.bold }}>
            {price}
          </Text>
        </XStack>

        <XStack alignItems="center" gap={8}>
          <MapPin size={16} color={palette.textMuted} />
          <Text
            flex={1}
            color={palette.textMuted}
            fontSize={13}
            numberOfLines={1}
            style={{ ...fonts.regular }}
          >
            {t.location?.trim() || 'Lieu à confirmer'}
          </Text>
        </XStack>

        {t.prize ? (
          <Text color={palette.gold} fontSize={12} style={{ ...fonts.medium }}>
            Dotation · {t.prize}
          </Text>
        ) : null}

        <Button
          marginTop={4}
          backgroundColor={palette.primary}
          borderRadius={999}
          height={48}
          pressStyle={{ opacity: 0.9 }}
        >
          <Text color="#fff" fontSize={15} style={{ ...fonts.bold }}>
            {ctaLabel(t.status)}
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
