import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Calendar, MapPin, Plus, Trophy, Users } from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { BackHeader } from '@/components/BackHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { fonts } from '@/lib/fonts'
import { useTournaments, type TournamentRow } from '@/lib/data'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, formatFCFA, lightColors } from '@/lib/theme'

export default function TournoisScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { tournaments: list, loading, refresh } = useTournaments()
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  function getStatusLabel(status: string) {
    if (status === 'full') return { label: 'Complet', color: palette.textMuted, bg: `${palette.border}` }
    if (status === 'running') return { label: 'En cours', color: palette.accent, bg: `${palette.accent}22` }
    return { label: 'Inscriptions ouvertes', color: palette.primary, bg: `${palette.primary}22` }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header avec action de création */}
      <BackHeader
        title="Tournois"
        backHref="/"
        right={
          <Pressable
            onPress={() => router.push('/creer-tournoi')}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.primary,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 4,
            }}
          >
            <Plus size={15} color="#fff" />
            <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
              Créer
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {list.length > 0 && (
          <Pressable
            onPress={() => router.push(`/tournois/${list[0].id}` as any)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: `${palette.gold}55`,
              backgroundColor: palette.card,
              padding: 20,
            }}
          >
            <View style={{ position: 'absolute', right: -15, top: -15, opacity: 0.12 }}>
              <Trophy size={130} color={palette.gold} />
            </View>

            <XStack
              alignSelf="flex-start"
              alignItems="center"
              gap={6}
              backgroundColor={`${palette.gold}22`}
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={999}
            >
              <Trophy size={14} color={palette.gold} />
              <Text color={palette.gold} fontSize={11} style={{ ...fonts.bold }}>
                Événement Phare
              </Text>
            </XStack>

            <Text
              fontFamily="$heading"
              fontSize={26}
              color={palette.text}
              marginTop={10}
              style={{ ...fonts.bold }}
            >
              {list[0].name}
            </Text>
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              {[list[0].location || 'Abidjan', `${list[0].teams_max || 8} équipes max`].join(' · ')}
            </Text>

            {list[0].prize ? (
              <Text
                color={palette.gold}
                fontSize={18}
                marginTop={8}
                style={{ ...fonts.bold }}
              >
                {list[0].prize} à gagner
              </Text>
            ) : null}
          </Pressable>
        )}

        <Text color={palette.text} fontSize={17} marginTop={6} style={{ ...fonts.bold }}>
          Toutes les compétitions
        </Text>

        {loading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical={40}>
            <FuttoLogoLoader size={60} label="Chargement des tournois…" />
          </YStack>
        ) : list.length === 0 ? (
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={28}
            alignItems="center"
            gap={12}
            marginTop={10}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: `${palette.gold}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={28} color={palette.gold} />
            </View>
            <Text color={palette.text} fontSize={17} textAlign="center" style={{ ...fonts.bold }}>
              Aucun tournoi ouvert
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              style={{ ...fonts.regular, maxWidth: 280 }}
            >
              Organise ton propre tournoi avec cash prize et inscriptions d'équipes !
            </Text>
            <Button
              marginTop={6}
              backgroundColor={palette.primary}
              borderRadius={999}
              height={44}
              paddingHorizontal={20}
              onPress={() => router.push('/creer-tournoi')}
            >
              <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                + Créer un tournoi
              </Text>
            </Button>
          </YStack>
        ) : (
          list.map((t) => {
            const st = getStatusLabel(t.status)
            const pct = Math.min(100, Math.round((t.teams / (t.teams_max || 8)) * 100))
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/tournois/${t.id}` as any)}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  padding: 16,
                  gap: 12,
                }}
              >
                <XStack justifyContent="space-between" alignItems="flex-start" gap={8}>
                  <YStack flex={1} gap={3}>
                    <Text
                      fontFamily="$heading"
                      fontSize={18}
                      color={palette.text}
                      numberOfLines={1}
                      style={{ ...fonts.bold }}
                    >
                      {t.name}
                    </Text>
                    <XStack alignItems="center" gap={10} flexWrap="wrap">
                      <XStack alignItems="center" gap={4}>
                        <Calendar size={13} color={palette.primary} />
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {t.date_label || 'Bientôt'}
                        </Text>
                      </XStack>
                      <XStack alignItems="center" gap={4}>
                        <MapPin size={13} color={palette.primary} />
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {t.location || 'Abidjan'}
                        </Text>
                      </XStack>
                    </XStack>
                  </YStack>

                  <YStack
                    paddingHorizontal={10}
                    paddingVertical={4}
                    borderRadius={999}
                    backgroundColor={st.bg}
                  >
                    <Text color={st.color} fontSize={11} style={{ ...fonts.bold }}>
                      {st.label}
                    </Text>
                  </YStack>
                </XStack>

                {/* Dotation */}
                <XStack
                  backgroundColor={palette.cardElevated}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  borderRadius={12}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                    Dotation / Cash Prize
                  </Text>
                  <Text color={palette.gold} fontSize={14} style={{ ...fonts.bold }}>
                    {t.prize || 'À définir'}
                  </Text>
                </XStack>

                {/* Equipes & Barre de progression */}
                <YStack gap={6}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack alignItems="center" gap={5}>
                      <Users size={14} color={palette.primary} />
                      <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                        {t.teams}/{t.teams_max || 8} équipes inscrites
                      </Text>
                    </XStack>
                    <Text color={palette.accent} fontSize={12} style={{ ...fonts.bold }}>
                      Frais : {formatFCFA(t.fee_fcfa)}
                    </Text>
                  </XStack>

                  <View
                    style={{
                      height: 6,
                      backgroundColor: palette.border,
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: palette.primary,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </YStack>

                {/* Bouton Voir / S'inscrire */}
                <Button
                  height={44}
                  borderRadius={999}
                  backgroundColor={palette.primary}
                  onPress={() => router.push(`/tournois/${t.id}` as any)}
                >
                  <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                    Voir le tournoi & Participer
                  </Text>
                </Button>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </YStack>
  )
}
