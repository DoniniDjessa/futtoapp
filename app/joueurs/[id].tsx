import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Lock,
  MapPin,
  MessageCircle,
  Star,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { useAppDialog } from '@/components/AppDialog'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { useMatches, usePlayers } from '@/lib/data'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { computePlayerBadge } from '@/lib/player-badge'
import { notifyUser } from '@/lib/push'
import type { MatchRow, Profile } from '@/lib/types'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

/**
 * Détail Joueur ("Carte joueur") — Alignement UX / UI fidèle à la démo futto.
 */
export default function JoueurDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const dialog = useAppDialog()

  const { players } = usePlayers()
  const { matches } = useMatches()

  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)
  const cachedJoueur = players.find((j) => j.id === id)
  const [joueur, setJoueur] = useState<Profile | null>(cachedJoueur ?? null)
  const [loading, setLoading] = useState(!cachedJoueur)

  const [invited, setInvited] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Picker de match si l'hôte a plusieurs matchs actifs
  const [hostMatches, setHostMatches] = useState<MatchRow[]>([])
  const [showPicker, setShowPicker] = useState(false)

  // Chargement direct du joueur si absent du cache
  useEffect(() => {
    if (!id || !supabase) return
    let active = true
    supabase
      .from(T.profiles)
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (data && !error) {
          setJoueur(data as Profile)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Vérifier si l'utilisateur a déjà invité ce joueur à l'un de ses matchs actifs
  useEffect(() => {
    if (!user || !id || !supabase) return
    let active = true
    supabase
      .from(T.matches)
      .select('id')
      .eq('host_id', user.id)
      .in('status', ['draft', 'planned', 'confirmed'])
      .then(async ({ data: myMatches }) => {
        if (!active || !myMatches || myMatches.length === 0) return
        const matchIds = myMatches.map((m) => m.id)
        const { data: mpData } = await supabase
          .from(T.matchPlayers)
          .select('status')
          .in('match_id', matchIds)
          .eq('profile_id', id)
          .in('status', ['invited', 'joined'])
        if (active && mpData && mpData.length > 0) {
          setInvited(true)
        }
      })
    return () => {
      active = false
    }
  }, [user, id])

  // Vérifier si l'utilisateur suit déjà ce joueur
  useEffect(() => {
    if (!user || !id || !supabase) return
    let active = true
    supabase
      .from(T.follows)
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setFollowed(true)
        }
      })
    return () => {
      active = false
    }
  }, [user, id])

  const isMe = Boolean(user && joueur && user.id === joueur.id)

  // Calcul dynamique des statistiques et du badge
  const playedCount = useMemo(() => {
    if (!joueur) return 0
    return matches.filter(
      (m) => m.status === 'played' && m.host_id === joueur.id,
    ).length
  }, [matches, joueur])

  const ratingNumber =
    joueur?.rating != null &&
    Number(joueur.rating) > 0 &&
    Number(joueur.rating) !== 3.0 &&
    Number(joueur.rating) !== 3
      ? Number(joueur.rating)
      : null

  const badge = useMemo(() => {
    return computePlayerBadge({
      playedCount,
      rating: ratingNumber,
      skillLevel: joueur?.skill_level,
    })
  }, [playedCount, ratingNumber, joueur?.skill_level])

  const displayName =
    joueur?.full_name || joueur?.first_name || joueur?.pseudo || 'Joueur FUTTO'

  async function handleInvite() {
    if (!user) {
      dialog.showDialog({
        title: 'Connexion requise',
        message: 'Connecte-toi pour inviter des joueurs à tes matchs.',
        confirmText: 'Se connecter',
        onConfirm: () => router.push('/connexion'),
        cancelText: 'Annuler',
      })
      return
    }

    if (isMe) return

    setInviting(true)
    try {
      const { data: myMatches, error } = await supabase
        .from(T.matches)
        .select('*')
        .eq('host_id', user.id)
        .in('status', ['draft', 'planned', 'confirmed'])
        .order('kickoff_at', { ascending: true })

      if (error || !myMatches || myMatches.length === 0) {
        dialog.showDialog({
          title: 'Aucun match actif',
          message: `Tu n'as pas de match actif en tant qu'organisateur pour le moment. Crée un match (public ou privé) pour pouvoir y inviter ${displayName}.`,
          confirmText: 'Créer un match',
          onConfirm: () => router.push('/creer'),
          cancelText: 'Fermer',
        })
        return
      }

      if (myMatches.length === 1) {
        await executeInvite(myMatches[0] as MatchRow)
      } else {
        setHostMatches(myMatches as MatchRow[])
        setShowPicker(true)
      }
    } finally {
      setInviting(false)
    }
  }

  async function executeInvite(targetMatch: MatchRow) {
    setShowPicker(false)
    if (!user || !joueur || !supabase) return

    // Vérifier si déjà invité ou dans l'équipe
    const { data: existing } = await supabase
      .from(T.matchPlayers)
      .select('status')
      .eq('match_id', targetMatch.id)
      .eq('profile_id', joueur.id)
      .maybeSingle()

    if (existing?.status === 'invited') {
      dialog.showDialog({
        title: 'Déjà invité',
        message: `${displayName} a déjà reçu une invitation pour « ${targetMatch.title} ».`,
        confirmText: 'Compris',
      })
      setInvited(true)
      return
    }

    if (existing?.status === 'joined') {
      dialog.showDialog({
        title: 'Déjà dans l’équipe',
        message: `${displayName} participe déjà à « ${targetMatch.title} ».`,
        confirmText: 'Compris',
      })
      setInvited(true)
      return
    }

    const { error: insertErr } = await supabase.from(T.matchPlayers).upsert({
      match_id: targetMatch.id,
      profile_id: joueur.id,
      display_name: displayName,
      status: 'invited',
    })

    if (insertErr) {
      dialog.showDialog({
        title: 'Erreur',
        message: insertErr.message || "Impossible d'envoyer l'invitation.",
        confirmText: 'OK',
      })
      return
    }

    // Push notification + In-app
    void notifyUser({
      profileId: joueur.id,
      title: 'Invitation à un match',
      body: `Tu as reçu une invitation pour rejoindre « ${targetMatch.title} ».`,
      kind: 'invite',
      data: { matchId: targetMatch.id },
    })

    setInvited(true)
    const isPrivate =
      targetMatch.visibility === 'private' || targetMatch.title.toLowerCase().startsWith('privé')

    dialog.showDialog({
      title: 'Invitation envoyée !',
      message: isPrivate
        ? `Ton invitation pour « ${targetMatch.title} » a été envoyée à ${displayName}. S'agissant d'un match privé, il le verra directement dans son onglet « Privé ».`
        : `Ton invitation pour « ${targetMatch.title} » a été envoyée à ${displayName}.`,
      confirmText: 'Parfait',
    })
  }

  function handleMessage() {
    if (!joueur) return
    router.push(`/messages/${joueur.id}`)
  }

  async function handleToggleFollow() {
    if (!user) {
      dialog.showDialog({
        title: 'Connexion requise',
        message: 'Connecte-toi pour suivre ce joueur.',
        confirmText: 'Se connecter',
        onConfirm: () => router.push('/connexion'),
        cancelText: 'Annuler',
      })
      return
    }
    if (!joueur || !supabase) return

    const next = !followed
    setFollowed(next)

    if (next) {
      await supabase.from(T.follows).upsert({
        follower_id: user.id,
        following_id: joueur.id,
      })
      void notifyUser({
        profileId: joueur.id,
        title: 'Nouvel abonné',
        body: `${profile?.pseudo ? `@${profile.pseudo}` : profile?.full_name || 'Un joueur'} a commencé à te suivre sur FUTTO.`,
        kind: 'system',
        data: { profileId: user.id },
      })
    } else {
      await supabase
        .from(T.follows)
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', joueur.id)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header personnalisé avec bouton retour */}
      <XStack
        paddingTop={52}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={palette.border}
        backgroundColor={palette.card}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: palette.cardElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={palette.text} />
        </Pressable>
        <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
          Carte joueur
        </Text>
        <YStack width={36} />
      </XStack>

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color={palette.textMuted} style={{ ...fonts.medium }}>
            Chargement du profil…
          </Text>
        </YStack>
      ) : !joueur ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={20} gap={10}>
          <Text color={palette.text} fontSize={16} style={{ ...fonts.semibold }}>
            Joueur introuvable
          </Text>
          <Button onPress={() => router.back()} backgroundColor={palette.primary} borderRadius={999}>
            <Text color="#fff" style={{ ...fonts.bold }}>
              Retour aux joueurs
            </Text>
          </Button>
        </YStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Section Hero Joueur */}
          <YStack alignItems="center" paddingTop={28} paddingHorizontal={20}>
            <Pressable
              onPress={() => {
                if (joueur.avatar_url) {
                  setViewerImage({ url: joueur.avatar_url, title: displayName })
                }
              }}
              disabled={!joueur.avatar_url}
              style={{ position: 'relative' }}
            >
              <YStack
                borderWidth={4}
                borderColor={palette.primary}
                borderRadius={56}
                padding={3}
                backgroundColor={palette.card}
                elevation={4}
              >
                <Avatar
                  initials={initials(displayName)}
                  color={palette.primary}
                  size={96}
                  uri={joueur.avatar_url}
                />
              </YStack>
            </Pressable>

            <Text
              marginTop={14}
              fontFamily="$heading"
              fontSize={26}
              color={palette.text}
              textAlign="center"
              style={{ ...fonts.bold }}
            >
              {displayName}
            </Text>

            {joueur.pseudo ? (
              <Text color={palette.primary} fontSize={15} style={{ ...fonts.semibold }} marginTop={2}>
                @{joueur.pseudo}
              </Text>
            ) : null}

            {/* Badges Post / Position / Ville */}
            <XStack flexWrap="wrap" gap={8} marginTop={12} justifyContent="center" alignItems="center">
              {joueur.position ? (
                <YStack
                  backgroundColor={`${palette.primary}18`}
                  paddingHorizontal={12}
                  paddingVertical={5}
                  borderRadius={999}
                >
                  <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                    {joueur.position}
                  </Text>
                </YStack>
              ) : null}

              {joueur.city ? (
                <XStack
                  alignItems="center"
                  gap={4}
                  backgroundColor={palette.card}
                  borderWidth={1}
                  borderColor={palette.border}
                  paddingHorizontal={10}
                  paddingVertical={5}
                  borderRadius={999}
                >
                  <MapPin size={12} color={palette.textMuted} />
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                    {joueur.city}
                  </Text>
                </XStack>
              ) : null}

              <YStack
                backgroundColor={`${badge.color}22`}
                paddingHorizontal={12}
                paddingVertical={5}
                borderRadius={999}
              >
                <Text color={badge.color} fontSize={12} style={{ ...fonts.bold }}>
                  {badge.label}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Grille de stats façon DealPro / FUTTO */}
          <XStack paddingHorizontal={20} marginTop={24} gap={12}>
            {/* Matchs joués */}
            <YStack
              flex={1}
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              paddingVertical={16}
              alignItems="center"
              gap={4}
            >
              <Trophy size={18} color={palette.accent} />
              <Text fontFamily="$heading" fontSize={24} color={palette.text} style={{ ...fonts.bold }}>
                {playedCount}
              </Text>
              <Text
                color={palette.textMuted}
                fontSize={11}
                style={{ ...fonts.bold }}
                letterSpacing={0.5}
                textTransform="uppercase"
              >
                Matchs joués
              </Text>
            </YStack>

            {/* Note moyenne */}
            <YStack
              flex={1}
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              paddingVertical={16}
              alignItems="center"
              gap={4}
            >
              <Star
                size={18}
                color={ratingNumber != null ? palette.gold : palette.textMuted}
                fill={ratingNumber != null ? palette.gold : 'transparent'}
              />
              <Text fontFamily="$heading" fontSize={24} color={palette.text} style={{ ...fonts.bold }}>
                {ratingNumber != null ? ratingNumber.toFixed(1) : 'Néant'}
              </Text>
              <Text
                color={palette.textMuted}
                fontSize={11}
                style={{ ...fonts.bold }}
                letterSpacing={0.5}
                textTransform="uppercase"
              >
                Note
              </Text>
            </YStack>

            {/* Niveau */}
            <YStack
              flex={1}
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              paddingVertical={16}
              alignItems="center"
              gap={4}
            >
              <Zap size={18} color={palette.primary} />
              <Text
                fontFamily="$heading"
                fontSize={15}
                color={palette.text}
                numberOfLines={1}
                style={{ ...fonts.bold }}
              >
                {joueur.skill_level || 'Loisir'}
              </Text>
              <Text
                color={palette.textMuted}
                fontSize={11}
                style={{ ...fonts.bold }}
                letterSpacing={0.5}
                textTransform="uppercase"
              >
                Niveau
              </Text>
            </YStack>
          </XStack>

          {/* Grille Buts & Points */}
          <XStack paddingHorizontal={20} marginTop={12} gap={12}>
            <YStack
              flex={1}
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              paddingVertical={16}
              alignItems="center"
              gap={4}
            >
              <Text
                color={palette.textMuted}
                fontSize={11}
                style={{ ...fonts.bold }}
                letterSpacing={1}
                textTransform="uppercase"
              >
                Disponibilité
              </Text>
              <Text
                fontFamily="$heading"
                fontSize={16}
                color={joueur.is_available_to_play ? palette.primary : palette.textMuted}
                style={{ ...fonts.bold }}
              >
                {joueur.is_available_to_play ? 'Disponible' : 'Non dispo'}
              </Text>
            </YStack>

            <YStack
              flex={1}
              backgroundColor={palette.card}
              borderRadius={16}
              borderWidth={1}
              borderColor={palette.border}
              paddingVertical={16}
              alignItems="center"
              gap={4}
            >
              <Text
                color={palette.textMuted}
                fontSize={11}
                style={{ ...fonts.bold }}
                letterSpacing={1}
                textTransform="uppercase"
              >
                Buts
              </Text>
              <Text fontFamily="$heading" fontSize={24} color={palette.text} style={{ ...fonts.bold }}>
                —
              </Text>
            </YStack>
          </XStack>

          {/* Boutons d'actions */}
          <YStack marginTop={24} paddingHorizontal={20} gap={10}>
            {isMe ? (
              <Button
                height={50}
                borderRadius={999}
                backgroundColor={palette.primary}
                onPress={() => router.push('/profil')}
              >
                <Text color="#fff" fontSize={14} style={{ ...fonts.bold }}>
                  Voir mon profil complet
                </Text>
              </Button>
            ) : (
              <>
                <Button
                  height={50}
                  borderRadius={999}
                  backgroundColor={invited ? `${palette.primary}22` : palette.primary}
                  borderWidth={invited ? 1 : 0}
                  borderColor={palette.primary}
                  disabled={inviting}
                  onPress={() => void handleInvite()}
                >
                  <XStack alignItems="center" gap={8}>
                    {invited ? (
                      <>
                        <Check size={18} color={palette.primary} />
                        <Text color={palette.primary} fontSize={14} style={{ ...fonts.bold }}>
                          Invité au match
                        </Text>
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} color="#fff" />
                        <Text color="#fff" fontSize={14} style={{ ...fonts.bold }}>
                          {inviting ? 'Recherche de tes matchs…' : 'Inviter au match'}
                        </Text>
                      </>
                    )}
                  </XStack>
                </Button>

                <Button
                  height={50}
                  borderRadius={999}
                  backgroundColor={palette.card}
                  borderWidth={1}
                  borderColor={palette.border}
                  onPress={handleMessage}
                >
                  <XStack alignItems="center" gap={8}>
                    <MessageCircle size={18} color={palette.text} />
                    <Text color={palette.text} fontSize={14} style={{ ...fonts.semibold }}>
                      Envoyer un message
                    </Text>
                  </XStack>
                </Button>

                <Button
                  height={44}
                  backgroundColor="transparent"
                  onPress={() => void handleToggleFollow()}
                >
                  <Text color={palette.primary} fontSize={14} style={{ ...fonts.bold }}>
                    {followed ? 'Ne plus suivre' : 'Suivre ce joueur'}
                  </Text>
                </Button>
              </>
            )}
          </YStack>
        </ScrollView>
      )}

      {/* Modal choix de match quand l'hôte a plusieurs matchs actifs */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <YStack
            backgroundColor={palette.card}
            borderTopLeftRadius={24}
            borderTopRightRadius={24}
            padding={20}
            paddingBottom={36}
            gap={14}
            maxHeight="80%"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text fontFamily="$heading" fontSize={18} color={palette.text} style={{ ...fonts.bold }}>
                  Choisir un match
                </Text>
                <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                  Sélectionne le match auquel inviter {displayName}
                </Text>
              </YStack>
              <Pressable
                onPress={() => setShowPicker(false)}
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {hostMatches.map((m) => {
                const isPrivate = m.visibility === 'private' || m.title.toLowerCase().startsWith('privé')
                const kickoffStr = m.kickoff_at
                  ? new Date(m.kickoff_at).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Date à définir'

                return (
                  <Pressable
                    key={m.id}
                    onPress={() => void executeInvite(m)}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.cardElevated,
                      gap: 8,
                    }}
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text
                        fontFamily="$heading"
                        fontSize={16}
                        color={palette.text}
                        numberOfLines={1}
                        style={{ ...fonts.bold, flex: 1 }}
                      >
                        {m.title}
                      </Text>
                      <YStack
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={999}
                        backgroundColor={isPrivate ? `${palette.primary}22` : `${palette.accent}22`}
                      >
                        <Text
                          color={isPrivate ? palette.primary : palette.accent}
                          fontSize={11}
                          style={{ ...fonts.bold }}
                        >
                          {isPrivate ? 'Privé' : 'Public'}
                        </Text>
                      </YStack>
                    </XStack>

                    <XStack alignItems="center" gap={12}>
                      <XStack alignItems="center" gap={4}>
                        <Clock size={13} color={palette.primary} />
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {kickoffStr}
                        </Text>
                      </XStack>
                      <XStack alignItems="center" gap={4}>
                        <Users size={13} color={palette.primary} />
                        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                          {m.spots_taken}/{m.spots_total}
                        </Text>
                      </XStack>
                    </XStack>
                  </Pressable>
                )
              })}
            </ScrollView>
          </YStack>
        </View>
      </Modal>

      {/* Visualiseur photo en grand format */}
      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </YStack>
  )
}
