import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  Calendar,
  Check,
  MapPin,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { BackHeader } from '@/components/BackHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { useAppDialog } from '@/components/AppDialog'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useMyTeam, type TournamentRow } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, formatFCFA, lightColors } from '@/lib/theme'
import { notifyUser } from '@/lib/push'

type RegisteredTeam = {
  id: string
  tournament_id: string
  captain_id: string | null
  team_name: string
  contact_phone: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  paid_fcfa: number
  created_at: string
}

type TournamentMatch = {
  id: string
  tournament_id: string
  round: string
  team_a_name: string
  team_b_name: string
  score_a: number | null
  score_b: number | null
  status: 'scheduled' | 'playing' | 'finished'
  match_date: string | null
  pitch_name: string | null
}

export default function TournoiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const dialog = useAppDialog()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { team } = useMyTeam()

  const [tournoi, setTournoi] = useState<TournamentRow | null>(null)
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [customTeamName, setCustomTeamName] = useState('')

  const loadData = useCallback(async () => {
    if (!id || !supabase) {
      setLoading(false)
      return
    }

    try {
      // 1. Récupérer le tournoi réel
      const { data: tData } = await supabase
        .from(T.tournaments)
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (tData) {
        setTournoi(tData as TournamentRow)
      }

      // 2. Récupérer les équipes inscrites réelles
      const { data: regData } = await supabase
        .from(T.tournamentRegistrations)
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true })

      if (regData) {
        setRegisteredTeams(regData as RegisteredTeam[])
      }

      // 3. Récupérer les matchs réels du tournoi
      const { data: mData } = await supabase
        .from(T.tournamentMatches)
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true })

      if (mData) {
        setMatches(mData as TournamentMatch[])
      }
    } catch (e) {
      console.warn('Erreur chargement tournoi:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const isUserRegistered = Boolean(
    user && registeredTeams.some((r) => r.captain_id === user.id),
  )

  const isFull =
    tournoi != null &&
    (tournoi.status === 'full' || registeredTeams.length >= (tournoi.teams_max || 8))

  function promptRegister() {
    if (!user) {
      dialog.showDialog({
        title: 'Connexion requise',
        message: 'Connecte-toi pour inscrire ton équipe à ce tournoi.',
        confirmText: 'Se connecter',
        onConfirm: () => router.push('/connexion' as any),
        cancelText: 'Annuler',
      })
      return
    }

    if (isUserRegistered) {
      dialog.showDialog({
        title: 'Déjà inscrit',
        message: 'Ton équipe est déjà engagée dans cette compétition !',
        confirmText: 'Compris',
      })
      return
    }

    if (team?.name) {
      // Équipe existante dans "Mon Équipe"
      confirmRegistration(team.name)
    } else {
      // Demander un nom d'équipe
      setCustomTeamName('')
      setShowTeamModal(true)
    }
  }

  function confirmRegistration(teamNameToUse: string) {
    const fee = tournoi?.fee_fcfa || 0
    dialog.showDialog({
      title: 'Inscrire mon équipe',
      message: `Engager l'équipe « ${teamNameToUse} » pour « ${tournoi?.name} » ?\nFrais d'inscription : ${formatFCFA(fee)}.`,
      confirmText: 'Confirmer & Valider',
      onConfirm: async () => {
        await executeRegistration(teamNameToUse)
      },
      cancelText: 'Annuler',
    })
  }

  async function executeRegistration(teamNameToUse: string) {
    if (!supabase || !user || !id || !tournoi) return
    setRegistering(true)

    try {
      const fee = tournoi.fee_fcfa || 0

      // Débit wallet si des frais existent
      if (fee > 0) {
        const { error: debitErr } = await supabase.rpc('futto_wallet_debit', {
          p_amount: fee,
          p_kind: 'participation',
          p_label: `Inscription tournoi — ${tournoi.name}`,
          p_provider: 'cash',
        })
        if (debitErr) {
          console.warn('Wallet debit failed, proceeding with direct reg:', debitErr)
        }
      }

      // Insertion dans futto_tournament_registrations
      const { error: regErr } = await supabase
        .from(T.tournamentRegistrations)
        .insert({
          tournament_id: id,
          captain_id: user.id,
          team_name: teamNameToUse.trim(),
          contact_phone: profile?.phone || null,
          status: 'confirmed',
          paid_fcfa: fee,
        })

      if (regErr) throw regErr

      // Incrémenter le nombre d'équipes sur le tournoi
      const newCount = registeredTeams.length + 1
      await supabase
        .from(T.tournaments)
        .update({
          teams: newCount,
          status: newCount >= (tournoi.teams_max || 8) ? 'full' : tournoi.status,
        })
        .eq('id', id)

      dialog.showDialog({
        title: 'Inscription validée ! ⚽🔥',
        message: `L'équipe « ${teamNameToUse} » est engagée pour « ${tournoi.name} ». Tu apparais désormais dans la liste officielle des équipes participantes.`,
        confirmText: 'Super !',
      })

      void notifyUser({
        profileId: user.id,
        title: 'Inscription au tournoi validée ! 🏆',
        body: `Ton équipe « ${teamNameToUse} » est officiellement engagée pour « ${tournoi.name} ».`,
        kind: 'tournament',
        data: { tournament_id: id },
      })

      if (tournoi.organizer_id && tournoi.organizer_id !== user.id) {
        void notifyUser({
          profileId: tournoi.organizer_id,
          title: 'Nouvelle équipe inscrite ! ⚽',
          body: `L'équipe « ${teamNameToUse} » s'est inscrite à ton tournoi « ${tournoi.name} ».`,
          kind: 'tournament',
          data: { tournament_id: id },
        })
      }

      await loadData()
    } catch (e) {
      dialog.showDialog({
        title: 'Erreur d’inscription',
        message: e instanceof Error ? e.message : 'Impossible de valider l’inscription.',
        confirmText: 'OK',
      })
    } finally {
      setRegistering(false)
    }
  }

  const scheduledMatches = matches.filter((m) => m.status === 'scheduled')
  const playedMatches = matches.filter((m) => m.status === 'finished')

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      <BackHeader title={tournoi?.name || 'Tournoi'} backHref="/tournois" />

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <FuttoLogoLoader size={60} label="Chargement du tournoi…" />
        </YStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void loadData()}
              tintColor={palette.primary}
            />
          }
        >
          {/* En-tête Tournoi */}
          <YStack
            backgroundColor={palette.card}
            borderRadius={24}
            padding={20}
            borderWidth={1}
            borderColor={palette.border}
            gap={14}
          >
            <XStack
              alignSelf="flex-start"
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={999}
              backgroundColor={isFull ? `${palette.border}` : `${palette.primary}22`}
            >
              <Text
                color={isFull ? palette.textMuted : palette.primary}
                fontSize={11}
                style={{ ...fonts.bold }}
              >
                {isFull ? 'Complet' : 'Inscriptions ouvertes'}
              </Text>
            </XStack>

            <Text fontFamily="$heading" fontSize={26} color={palette.text} style={{ ...fonts.bold }}>
              {tournoi?.name}
            </Text>

            <XStack alignItems="center" gap={12} flexWrap="wrap">
              <XStack alignItems="center" gap={4}>
                <Calendar size={14} color={palette.primary} />
                <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
                  {tournoi?.date_label || 'Date à définir'}
                </Text>
              </XStack>
              <XStack alignItems="center" gap={4}>
                <MapPin size={14} color={palette.primary} />
                <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
                  {tournoi?.location || 'Abidjan'}
                </Text>
              </XStack>
            </XStack>

            {/* Dotation */}
            <XStack
              backgroundColor={`${palette.gold}18`}
              paddingHorizontal={14}
              paddingVertical={12}
              borderRadius={14}
              borderWidth={1}
              borderColor={`${palette.gold}44`}
              alignItems="center"
              justifyContent="space-between"
            >
              <Text color={palette.text} fontSize={13} style={{ ...fonts.bold }}>
                Dotation / Cash Prize
              </Text>
              <Text color={palette.gold} fontSize={20} style={{ ...fonts.bold }}>
                {tournoi?.prize || 'À définir'}
              </Text>
            </XStack>

            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap={6}>
                <Users size={16} color={palette.primary} />
                <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
                  {registeredTeams.length}/{tournoi?.teams_max || 8} équipes inscrites
                </Text>
              </XStack>
              <Text color={palette.accent} fontSize={13} style={{ ...fonts.bold }}>
                Frais : {formatFCFA(tournoi?.fee_fcfa || 0)}
              </Text>
            </XStack>

            {/* Bouton d'inscription réelle */}
            <Button
              height={50}
              borderRadius={999}
              backgroundColor={
                isUserRegistered
                  ? `${palette.primary}22`
                  : isFull
                  ? palette.cardElevated
                  : palette.primary
              }
              borderWidth={isUserRegistered ? 1 : 0}
              borderColor={palette.primary}
              disabled={registering || (isFull && !isUserRegistered)}
              onPress={promptRegister}
              marginTop={4}
            >
              {isUserRegistered ? (
                <XStack alignItems="center" gap={8}>
                  <Check size={18} color={palette.primary} />
                  <Text color={palette.primary} fontSize={14} style={{ ...fonts.bold }}>
                    Mon équipe est inscrite
                  </Text>
                </XStack>
              ) : isFull ? (
                <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.medium }}>
                  Tournoi Complet
                </Text>
              ) : (
                <Text color="#fff" fontSize={14} style={{ ...fonts.bold }}>
                  {registering ? 'Inscription en cours…' : 'Inscrire mon équipe & Réserver'}
                </Text>
              )}
            </Button>
          </YStack>

          {/* Section Équipes inscrites (Flux 100% réel) */}
          <YStack gap={10}>
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={6}>
                <Shield size={18} color={palette.primary} />
                <Text color={palette.text} fontSize={17} style={{ ...fonts.bold }}>
                  Équipes inscrites ({registeredTeams.length})
                </Text>
              </XStack>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                Max {tournoi?.teams_max || 8}
              </Text>
            </XStack>

            {registeredTeams.length === 0 ? (
              <YStack
                backgroundColor={palette.card}
                borderRadius={16}
                borderWidth={1}
                borderColor={palette.border}
                padding={20}
                alignItems="center"
                gap={6}
              >
                <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
                  Aucune équipe inscrite pour le moment.
                </Text>
                <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                  Sois le premier capitaine à engager sa formation !
                </Text>
              </YStack>
            ) : (
              <YStack
                backgroundColor={palette.card}
                borderRadius={16}
                borderWidth={1}
                borderColor={palette.border}
                overflow="hidden"
              >
                {registeredTeams.map((teamRow, idx) => {
                  const isMyTeamRow = user?.id && teamRow.captain_id === user.id
                  const isLast = idx === registeredTeams.length - 1
                  return (
                    <XStack
                      key={teamRow.id}
                      alignItems="center"
                      justifyContent="space-between"
                      padding={14}
                      borderBottomWidth={isLast ? 0 : 1}
                      borderBottomColor={palette.border}
                      backgroundColor={isMyTeamRow ? `${palette.primary}08` : 'transparent'}
                    >
                      <XStack alignItems="center" gap={12}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: palette.cardElevated,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.bold }}>
                            {idx + 1}
                          </Text>
                        </View>
                        <YStack gap={2}>
                          <Text color={palette.text} fontSize={14} style={{ ...fonts.bold }}>
                            {teamRow.team_name}
                          </Text>
                          {isMyTeamRow && (
                            <Text color={palette.primary} fontSize={11} style={{ ...fonts.semibold }}>
                              ★ Ton équipe
                            </Text>
                          )}
                        </YStack>
                      </XStack>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: `${palette.primary}18`,
                        }}
                      >
                        <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                          Confirmée
                        </Text>
                      </View>
                    </XStack>
                  )
                })}
              </YStack>
            )}
          </YStack>

          {/* Tableau / Calendrier des matchs programmés */}
          <YStack gap={10}>
            <Text color={palette.text} fontSize={17} style={{ ...fonts.bold }}>
              Calendrier des matchs
            </Text>

            {scheduledMatches.length === 0 ? (
              <YStack
                backgroundColor={palette.card}
                borderRadius={16}
                borderWidth={1}
                borderColor={palette.border}
                padding={18}
                alignItems="center"
              >
                <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
                  Le calendrier des matchs sera généré à la clôture des inscriptions.
                </Text>
              </YStack>
            ) : (
              scheduledMatches.map((g) => (
                <XStack
                  key={g.id}
                  backgroundColor={palette.card}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  padding={14}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <YStack gap={3}>
                    <Text color={palette.text} fontSize={14} style={{ ...fonts.bold }}>
                      {g.team_a_name} vs {g.team_b_name}
                    </Text>
                    <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                      {[g.round, g.match_date, g.pitch_name].filter(Boolean).join(' · ')}
                    </Text>
                  </YStack>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: `${palette.primary}18`,
                    }}
                  >
                    <Text color={palette.primary} fontSize={11} style={{ ...fonts.bold }}>
                      Programmé
                    </Text>
                  </View>
                </XStack>
              ))
            )}
          </YStack>

          {/* Derniers Résultats */}
          {playedMatches.length > 0 && (
            <YStack gap={10}>
              <XStack alignItems="center" gap={6}>
                <Trophy size={18} color={palette.gold} />
                <Text color={palette.text} fontSize={17} style={{ ...fonts.bold }}>
                  Derniers Résultats
                </Text>
              </XStack>

              {playedMatches.map((r) => (
                <XStack
                  key={r.id}
                  backgroundColor={palette.card}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  padding={14}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <YStack gap={2}>
                    <Text color={palette.text} fontSize={14} style={{ ...fonts.semibold }}>
                      {r.team_a_name} vs {r.team_b_name}
                    </Text>
                    <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                      {r.round}
                    </Text>
                  </YStack>
                  <Text color={palette.gold} fontSize={16} style={{ ...fonts.bold }}>
                    {r.score_a ?? 0} – {r.score_b ?? 0}
                  </Text>
                </XStack>
              ))}
            </YStack>
          )}
        </ScrollView>
      )}

      {/* Modal saisie nom d'équipe si le joueur n'a pas encore créé d'équipe */}
      <Modal
        visible={showTeamModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeamModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <YStack
            backgroundColor={palette.card}
            borderRadius={24}
            padding={20}
            borderWidth={1}
            borderColor={palette.border}
            gap={14}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
                Nom de ton équipe
              </Text>
              <Pressable
                onPress={() => setShowTeamModal(false)}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: palette.cardElevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={palette.text} />
              </Pressable>
            </XStack>

            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              Indique le nom officiel avec lequel ton équipe participera au tournoi.
            </Text>

            <TextInput
              value={customTeamName}
              onChangeText={setCustomTeamName}
              placeholder="Ex: Abidjan All Stars"
              placeholderTextColor={palette.textMuted}
              style={{
                height: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.cardElevated,
                paddingHorizontal: 14,
                color: palette.text,
                fontSize: 14,
                ...fonts.regular,
              }}
            />

            <XStack gap={10} marginTop={4}>
              <Button
                flex={1}
                height={46}
                borderRadius={12}
                backgroundColor={palette.cardElevated}
                onPress={() => setShowTeamModal(false)}
              >
                <Text color={palette.textMuted} style={{ ...fonts.semibold }}>
                  Annuler
                </Text>
              </Button>
              <Button
                flex={1}
                height={46}
                borderRadius={12}
                backgroundColor={palette.primary}
                disabled={!customTeamName.trim()}
                onPress={() => {
                  const val = customTeamName.trim()
                  setShowTeamModal(false)
                  confirmRegistration(val)
                }}
              >
                <Text color="#fff" style={{ ...fonts.bold }}>
                  Continuer
                </Text>
              </Button>
            </XStack>
          </YStack>
        </View>
      </Modal>
    </YStack>
  )
}
