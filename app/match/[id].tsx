import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Clock, Mail, MapPinned, Star, Users } from 'lucide-react-native'
import { Avatar } from '@/components/Avatar'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { useAuth } from '@/lib/auth'
import { useMyTeam } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { matchInviteMessage, openWhatsAppInvite, shareInvite } from '@/lib/share'
import { notifyUser } from '@/lib/push'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import type { MatchPlayer, MatchRow, Profile, Terrain } from '@/lib/types'
import { visibilityLabel } from '@/lib/match-visibility'
import { joinModeLabel, matchStatusLabel, skillLevelLabel } from '@/lib/labels'

const STATUS_FLOW: MatchRow['status'][] = [
  'draft',
  'planned',
  'confirmed',
  'played',
  'cancelled',
]

type PlayerRow = MatchPlayer & {
  profile?: Pick<
    Profile,
    'id' | 'pseudo' | 'full_name' | 'avatar_url' | 'position' | 'skill_level' | 'rating' | 'city'
  > | null
}

type TerrainSnap = Pick<
  Terrain,
  'id' | 'name' | 'image_url' | 'surface' | 'rating' | 'quartier' | 'zone'
> | null

function initialsFrom(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, profile } = useAuth()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { team, members: teamMembers } = useMyTeam()

  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [terrain, setTerrain] = useState<TerrainSnap>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !id) return
    setLoading(true)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from(T.matches).select('*').eq('id', id).maybeSingle(),
      supabase
        .from(T.matchPlayers)
        .select(
          `id, match_id, profile_id, display_name, phone, status, created_at,
           profile:futto_profiles!profile_id (
             id, pseudo, full_name, avatar_url, position, skill_level, rating, city
           )`,
        )
        .eq('match_id', id)
        .order('created_at', { ascending: true }),
    ])

    const matchRow = (m as MatchRow) ?? null
    setMatch(matchRow)

    const mapped = ((p as unknown as PlayerRow[]) ?? []).map((row) => ({
      ...row,
      profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile,
    }))
    setPlayers(mapped)

    if (matchRow?.terrain_id) {
      const { data: t } = await supabase
        .from(T.terrains)
        .select('id, name, image_url, surface, rating, quartier, zone')
        .eq('id', matchRow.terrain_id)
        .maybeSingle()
      setTerrain((t as TerrainSnap) ?? null)
    } else {
      setTerrain(null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const isHost = !!user && match?.host_id === user.id
  const meJoined = players.some((p) => p.profile_id === user?.id && p.status === 'joined')
  const meInvited = players.some((p) => p.profile_id === user?.id && p.status === 'invited')
  const joinMode = match?.join_mode ?? 'free'

  function inviteText() {
    if (!match) return ''
    return matchInviteMessage({
      title: match.title,
      terrain: match.terrain_label,
      kickoffAt: match.kickoff_at,
      spotsTaken: match.spots_taken,
      spotsTotal: match.spots_total,
      joinMode,
      price: match.price_participation,
      shareToken: match.share_token,
    })
  }

  async function join() {
    if (!supabase || !id) return
    setBusy(true)
    const { error } = await supabase.rpc('futto_join_match', { p_match_id: id })
    setBusy(false)
    if (error) {
      Alert.alert('Rejoindre', error.message)
      return
    }
    if (match?.host_id && match.host_id !== user?.id) {
      void notifyUser({
        profileId: match.host_id,
        title: 'Nouveau joueur ⚽',
        body: `${profile?.pseudo || profile?.full_name || 'Un joueur'} a rejoint « ${match.title} ».`,
        kind: 'match',
        data: { matchId: match.id },
      })
    }
    if (user?.id) {
      void notifyUser({
        profileId: user.id,
        title: 'Inscription confirmée ⚽',
        body: `Tu as rejoint « ${match.title} ». Rendez-vous sur le terrain !`,
        kind: 'match',
        data: { matchId: match.id },
      })
    }
    await load()
  }

  async function leave() {
    if (!supabase || !user || !id) return
    setBusy(true)
    await supabase
      .from(T.matchPlayers)
      .update({ status: 'left' })
      .eq('match_id', id)
      .eq('profile_id', user.id)
    setBusy(false)
    if (match?.host_id && match.host_id !== user.id) {
      void notifyUser({
        profileId: match.host_id,
        title: 'Désistement de match',
        body: `${profile?.pseudo || profile?.full_name || 'Un joueur'} s'est désisté de « ${match.title} ». Une place s'est libérée.`,
        kind: 'match',
        data: { matchId: match.id },
      })
    }
    await load()
  }

  async function setStatus(status: MatchRow['status']) {
    if (!supabase || !match || !isHost) return
    setBusy(true)
    const { error } = await supabase.from(T.matches).update({ status }).eq('id', match.id)
    setBusy(false)
    if (error) Alert.alert('Statut', error.message)
    else await load()
  }

  async function openBoth() {
    if (!supabase || !match || !isHost) return
    setBusy(true)
    const { error } = await supabase
      .from(T.matches)
      .update({
        visibility: 'both',
        status: match.status === 'draft' ? 'planned' : match.status,
      })
      .eq('id', match.id)
    setBusy(false)
    if (error) Alert.alert('Visibilité', error.message)
    else await load()
  }

  async function duplicate() {
    if (!supabase || !match || !user) return
    setBusy(true)
    const { data, error } = await supabase
      .from(T.matches)
      .insert({
        host_id: user.id,
        title: match.title,
        visibility: 'private',
        terrain_id: match.terrain_id,
        terrain_label: match.terrain_label,
        zone: match.zone,
        kickoff_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
        format: match.format,
        status: 'draft',
        spots_total: match.spots_total,
        spots_min: match.spots_min ?? 2,
        spots_taken: 0,
        join_mode: match.join_mode ?? 'free',
        price_participation: match.price_participation,
        share_token: cryptoRandom(),
      })
      .select('id')
      .single()
    setBusy(false)
    if (error || !data) {
      Alert.alert('Dupliquer', error?.message ?? 'Erreur')
      return
    }
    router.replace(`/match/${data.id}`)
  }

  async function inviteMyTeam() {
    if (!team || teamMembers.length === 0 || !match || !supabase) return
    const existingNames = new Set(players.map((p) => p.display_name?.toLowerCase().trim()))
    const toInvite = teamMembers.filter(
      (m) => !existingNames.has(m.display_name.toLowerCase().trim()),
    )

    if (toInvite.length === 0) {
      Alert.alert('Équipe', 'Tous les joueurs de ton équipe sont déjà sur ce match.')
      return
    }

    setBusy(true)
    try {
      // Rechercher les profils réels des coéquipiers par numéro de téléphone
      const phones = toInvite
        .map((m) => m.phone?.trim())
        .filter(Boolean) as string[]

      const profileMap = new Map<string, string>()
      if (phones.length > 0) {
        const { data: matched } = await supabase
          .from(T.profiles)
          .select('id, phone')
          .in('phone', phones)
        for (const mp of matched || []) {
          if (mp.phone) profileMap.set(mp.phone.trim(), mp.id)
        }
      }

      const rows = toInvite.map((m) => {
        const profileId = m.phone ? profileMap.get(m.phone.trim()) || null : null
        return {
          match_id: match.id,
          profile_id: profileId,
          display_name: m.display_name,
          phone: m.phone || null,
          status: 'invited',
        }
      })

      const { error } = await supabase.from(T.matchPlayers).insert(rows)
      if (error) throw error

      // Notifier chaque coéquipier disposant d'un compte FUTTO
      for (const [_, pid] of profileMap) {
        void notifyUser({
          profileId: pid,
          title: 'Invitation de ton équipe ⚽',
          body: `${profile?.pseudo ? `@${profile.pseudo}` : 'Ton capitaine'} a invité l’équipe « ${team.name} » pour « ${match.title} ».`,
          kind: 'invite',
          data: { matchId: match.id },
        })
      }

      Alert.alert('Équipe invitée !', `${toInvite.length} coéquipier(s) invité(s) avec succès.`)
      await load()
    } catch (err) {
      Alert.alert('Erreur invitation', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Match',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {loading ? (
          <Text color={palette.textMuted}>Chargement…</Text>
        ) : !match ? (
          <Text color={palette.textMuted}>Match introuvable.</Text>
        ) : (
          <>
            <YStack
              borderRadius={16}
              overflow="hidden"
              borderWidth={1}
              borderColor={palette.border}
              backgroundColor={palette.card}
            >
              {terrain?.image_url ? (
                <Image
                  source={{ uri: terrain.image_url }}
                  style={{ width: '100%', height: 180 }}
                  contentFit="cover"
                />
              ) : (
                <YStack
                  height={140}
                  backgroundColor={palette.primaryDark}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MapPinned size={40} color={palette.primary} />
                </YStack>
              )}
              <YStack padding={14} gap={4}>
                <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={16}>
                  {terrain?.name || match.terrain_label || 'Terrain'}
                </Text>
                <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                  {[terrain?.quartier || match.zone, terrain?.surface]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                  {terrain?.rating != null ? ` · ★ ${Number(terrain.rating).toFixed(1)}` : ''}
                </Text>
              </YStack>
            </YStack>

            {/* Banner invitation reçue */}
            {meInvited && (
              <XStack
                backgroundColor={`${palette.primary}18`}
                paddingHorizontal={14}
                paddingVertical={10}
                borderRadius={14}
                alignItems="center"
                gap={10}
                borderWidth={1}
                borderColor={`${palette.primary}33`}
              >
                <Mail size={20} color={palette.primary} />
                <YStack flex={1}>
                  <Text color={palette.primary} fontSize={13} style={{ ...fonts.bold }}>
                    Tu as reçu une invitation pour ce match privé !
                  </Text>
                  <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                    Accepte pour rejoindre l'effectif ou décline si tu n'es pas dispo.
                  </Text>
                </YStack>
              </XStack>
            )}

            <Text color={palette.accent} fontSize={12} style={{ ...fonts.bold }}>
              {visibilityLabel(match.visibility)} · {matchStatusLabel(match.status)} ·{' '}
              {joinModeLabel(joinMode)}
            </Text>
            <Text fontFamily="$heading" fontSize={28} color={palette.text}>
              {match.title}
            </Text>
            <Text color={palette.textMuted} style={{ ...fonts.regular }}>
              {match.format}
              {match.kickoff_at
                ? ` · ${new Date(match.kickoff_at).toLocaleString('fr-FR')}`
                : ''}
            </Text>
            <Text color={palette.primary} fontFamily="$heading" fontSize={20}>
              {match.spots_taken}/{match.spots_total} joueurs
              {match.spots_min ? ` · min ${match.spots_min}` : ''}
            </Text>
            <Text color={palette.gold} fontFamily="$heading" fontSize={18}>
              {joinMode === 'adhesion' && match.price_participation > 0
                ? formatFCFA(match.price_participation)
                : 'Gratuit'}
            </Text>

            <YStack gap={10} marginTop={8}>
              <Text color={palette.text} style={{ ...fonts.semibold }}>
                Effectif
              </Text>
              {players.filter((p) => p.status === 'joined').length === 0 ? (
                <Text color={palette.textMuted} style={{ ...fonts.regular }}>
                  Personne pour l’instant.
                </Text>
              ) : (
                players
                  .filter((p) => p.status === 'joined')
                  .map((p) => {
                    const pr = p.profile
                    const label =
                      pr?.pseudo ||
                      p.display_name ||
                      pr?.full_name ||
                      'Joueur'
                    const isMatchHost = p.profile_id === match.host_id
                    return (
                      <XStack
                        key={p.id}
                        alignItems="center"
                        gap={12}
                        padding={12}
                        borderRadius={14}
                        borderWidth={1}
                        borderColor={palette.border}
                        backgroundColor={palette.card}
                      >
                        <Pressable
                          onPress={() => {
                            if (pr?.avatar_url) {
                              setViewerImage({ url: pr.avatar_url, title: pr?.pseudo ? `@${pr.pseudo}` : label })
                            } else if (p.profile_id) {
                              if (p.profile_id === user?.id) router.push('/profil')
                              else router.push(`/joueurs/${p.profile_id}`)
                            }
                          }}
                          hitSlop={6}
                        >
                          <Avatar
                            initials={initialsFrom(label)}
                            color={palette.primary}
                            size={48}
                            uri={pr?.avatar_url}
                          />
                        </Pressable>
                        <YStack flex={1} gap={2}>
                          <Pressable
                            onPress={() => {
                              if (p.profile_id === user?.id) router.push('/profil')
                              else if (p.profile_id) router.push(`/joueurs/${p.profile_id}`)
                            }}
                          >
                            <XStack alignItems="center" gap={6}>
                              <Text color={palette.text} style={{ ...fonts.semibold }} fontSize={15}>
                                {pr?.pseudo ? `@${pr.pseudo}` : label}
                              </Text>
                              {isMatchHost ? (
                                <Text
                                  color={palette.primary}
                                  fontSize={11}
                                  style={{ ...fonts.bold }}
                                >
                                  Hôte
                                </Text>
                              ) : null}
                            </XStack>
                          </Pressable>
                          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                            {[
                              skillLevelLabel(pr?.skill_level),
                              pr?.position,
                              pr?.city,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Joueur FUTTO'}
                          </Text>
                          <XStack alignItems="center" gap={4}>
                            <Star
                              size={12}
                              color={
                                pr?.rating != null &&
                                Number(pr.rating) > 0 &&
                                Number(pr.rating) !== 3.0 &&
                                Number(pr.rating) !== 3
                                  ? palette.gold
                                  : palette.textMuted
                              }
                              fill={
                                pr?.rating != null &&
                                Number(pr.rating) > 0 &&
                                Number(pr.rating) !== 3.0 &&
                                Number(pr.rating) !== 3
                                  ? palette.gold
                                  : 'transparent'
                              }
                            />
                            <Text
                              color={
                                pr?.rating != null &&
                                Number(pr.rating) > 0 &&
                                Number(pr.rating) !== 3.0 &&
                                Number(pr.rating) !== 3
                                  ? palette.gold
                                  : palette.textMuted
                              }
                              fontSize={12}
                              style={{ ...fonts.medium }}
                            >
                              {pr?.rating != null &&
                              Number(pr.rating) > 0 &&
                              Number(pr.rating) !== 3.0 &&
                              Number(pr.rating) !== 3
                                ? `${Number(pr.rating).toFixed(1)} / 5`
                                : 'Note : Néant'}
                            </Text>
                          </XStack>
                        </YStack>
                      </XStack>
                    )
                  })
              )}

              {/* Joueurs invités en attente (visible pour l'hôte) */}
              {isHost && players.filter((p) => p.status === 'invited').length > 0 && (
                <YStack gap={8} marginTop={10}>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.semibold }}>
                    Invités en attente de réponse ({players.filter((p) => p.status === 'invited').length})
                  </Text>
                  {players
                    .filter((p) => p.status === 'invited')
                    .map((p) => {
                      const pr = p.profile
                      const label = pr?.pseudo ? `@${pr.pseudo}` : p.display_name || pr?.full_name || 'Joueur'
                      return (
                        <XStack
                          key={p.id}
                          alignItems="center"
                          gap={10}
                          padding={10}
                          borderRadius={12}
                          borderWidth={1}
                          borderColor={palette.border}
                          backgroundColor={palette.card}
                        >
                          <Pressable
                            onPress={() => {
                              if (pr?.avatar_url) {
                                setViewerImage({ url: pr.avatar_url, title: label })
                              } else if (p.profile_id) {
                                if (p.profile_id === user?.id) router.push('/profil')
                                else router.push(`/joueurs/${p.profile_id}`)
                              }
                            }}
                            hitSlop={6}
                          >
                            <Avatar
                              initials={initialsFrom(label)}
                              color={palette.primary}
                              size={36}
                              uri={pr?.avatar_url}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (p.profile_id === user?.id) router.push('/profil')
                              else if (p.profile_id) router.push(`/joueurs/${p.profile_id}`)
                            }}
                            style={{ flex: 1 }}
                          >
                            <YStack>
                              <Text color={palette.text} fontSize={13} style={{ ...fonts.semibold }}>
                                {label}
                              </Text>
                              <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                                Invitation en attente
                              </Text>
                            </YStack>
                          </Pressable>
                          <Clock size={14} color={palette.gold} />
                        </XStack>
                      )
                    })}
                </YStack>
              )}
            </YStack>

            <XStack gap={10} flexWrap="wrap" marginTop={8}>
              {!isHost && !meJoined ? (
                <Button
                  flex={1}
                  backgroundColor={palette.primary}
                  borderRadius={12}
                  disabled={busy}
                  onPress={() => void join()}
                >
                  <Text color="#fff" style={{ ...fonts.bold }}>
                    {meInvited ? "Accepter l'invitation" : 'Rejoindre'}
                  </Text>
                </Button>
              ) : null}
              {!isHost && meInvited && !meJoined ? (
                <Button
                  backgroundColor={palette.card}
                  borderWidth={1}
                  borderColor={palette.border}
                  borderRadius={12}
                  disabled={busy}
                  onPress={() => void leave()}
                >
                  <Text color={palette.textMuted} style={{ ...fonts.semibold }}>
                    Décliner
                  </Text>
                </Button>
              ) : null}
              {!isHost && meJoined ? (
                <Button
                  flex={1}
                  backgroundColor={palette.card}
                  borderWidth={1}
                  borderColor={palette.border}
                  borderRadius={12}
                  disabled={busy}
                  onPress={() => void leave()}
                >
                  <Text color={palette.text} style={{ ...fonts.semibold }}>
                    Quitter
                  </Text>
                </Button>
              ) : null}
              <Button
                flex={1}
                backgroundColor={palette.accent}
                borderRadius={12}
                onPress={() => void openWhatsAppInvite(inviteText())}
              >
                <Text color="#fff" style={{ ...fonts.bold }}>
                  WhatsApp
                </Text>
              </Button>
              <Button
                flex={1}
                backgroundColor={palette.cardElevated}
                borderWidth={1}
                borderColor={palette.border}
                borderRadius={12}
                onPress={() => void shareInvite(inviteText())}
              >
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  Partager
                </Text>
              </Button>
            </XStack>

            {isHost ? (
              <YStack gap={10} marginTop={12}>
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  Actions hôte
                </Text>

                {team && teamMembers.length > 0 ? (
                  <Button
                    backgroundColor={`${palette.primary}18`}
                    borderWidth={1}
                    borderColor={palette.primary}
                    borderRadius={12}
                    disabled={busy}
                    onPress={() => void inviteMyTeam()}
                  >
                    <XStack alignItems="center" gap={8}>
                      <Users size={16} color={palette.primary} />
                      <Text color={palette.primary} style={{ ...fonts.bold }}>
                        Inviter mon équipe « {team.name} » ({teamMembers.length})
                      </Text>
                    </XStack>
                  </Button>
                ) : null}

                <XStack gap={8} flexWrap="wrap">
                  {STATUS_FLOW.filter((s) => s !== match.status).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => void setStatus(s)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: palette.card,
                        borderWidth: 1,
                        borderColor: palette.border,
                      }}
                    >
                      <Text color={palette.text} fontSize={12} style={{ ...fonts.medium }}>
                        → {matchStatusLabel(s)}
                      </Text>
                    </Pressable>
                  ))}
                </XStack>
                {match.visibility === 'private' ? (
                  <Button
                    backgroundColor={palette.primary}
                    borderRadius={12}
                    disabled={busy}
                    onPress={() => void openBoth()}
                  >
                    <Text color="#fff" style={{ ...fonts.bold }}>
                      Aussi ouvrir aux joueurs FUTTO
                    </Text>
                  </Button>
                ) : null}
                {match.visibility === 'public' ? (
                  <Button
                    backgroundColor={palette.primary}
                    borderRadius={12}
                    disabled={busy}
                    onPress={() => void openBoth()}
                  >
                    <Text color="#fff" style={{ ...fonts.bold }}>
                      Activer aussi le lien privé
                    </Text>
                  </Button>
                ) : null}
                <Button
                  backgroundColor={palette.card}
                  borderWidth={1}
                  borderColor={palette.border}
                  borderRadius={12}
                  disabled={busy}
                  onPress={() => void duplicate()}
                >
                  <Text color={palette.text} style={{ ...fonts.semibold }}>
                    Dupliquer (nouveau créneau)
                  </Text>
                </Button>
                {match.spots_taken < match.spots_total ? (
                  <Button
                    backgroundColor={palette.accent}
                    borderRadius={12}
                    onPress={() =>
                      void openWhatsAppInvite(
                        `Relance ⚽ Il manque ${match.spots_total - match.spots_taken} joueur(s) pour « ${match.title} ».\n` +
                          inviteText(),
                      )
                    }
                  >
                    <Text color="#fff" style={{ ...fonts.bold }}>
                      Relancer places manquantes
                    </Text>
                  </Button>
                ) : null}
              </YStack>
            ) : null}
          </>
        )}
      </ScrollView>

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

function cryptoRandom() {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
