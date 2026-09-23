import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import {
  Check,
  MessageCircle,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react-native'
import { Text, YStack, XStack, Input } from 'tamagui'
import { Avatar } from '@/components/Avatar'
import { BackHeader } from '@/components/BackHeader'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { usePlayers } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { notifyUser } from '@/lib/push'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, toTokenColor } from '@/lib/theme'
import type { Profile } from '@/lib/types'

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function AmisScreen() {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user, profile } = useAuth()
  const { players, loading: playersLoading, refresh: refreshPlayers } = usePlayers(false)

  const [activeTab, setActiveTab] = useState<'following' | 'suggestions'>('following')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollows, setLoadingFollows] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)

  const loadFollows = useCallback(async () => {
    if (!supabase || !user) {
      setFollowingIds(new Set())
      setLoadingFollows(false)
      return
    }
    setLoadingFollows(true)
    try {
      const { data, error } = await supabase
        .from(T.follows)
        .select('following_id')
        .eq('follower_id', user.id)

      if (!error && data) {
        setFollowingIds(new Set(data.map((r) => r.following_id)))
      }
    } catch {
      // Table may not exist yet or offline
    } finally {
      setLoadingFollows(false)
    }
  }, [user])

  useEffect(() => {
    void loadFollows()
    const timer = setTimeout(() => {
      setLoadingFollows(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [loadFollows])

  async function toggleFollow(targetId: string) {
    if (!supabase || !user) {
      router.push('/login')
      return
    }

    const isCurrentlyFollowing = followingIds.has(targetId)
    const nextSet = new Set(followingIds)

    if (isCurrentlyFollowing) {
      nextSet.delete(targetId)
      setFollowingIds(nextSet)
      await supabase
        .from(T.follows)
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
    } else {
      nextSet.add(targetId)
      setFollowingIds(nextSet)
      await supabase.from(T.follows).upsert({
        follower_id: user.id,
        following_id: targetId,
      })
      void notifyUser({
        profileId: targetId,
        title: 'Nouvel abonné',
        body: `${profile?.pseudo ? `@${profile.pseudo}` : profile?.full_name || 'Un joueur'} a commencé à te suivre sur FUTTO.`,
        kind: 'system',
        data: { profileId: user.id },
      })
    }
  }

  // Filtrage selon onglet et recherche
  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    let pool = players.filter((p) => p.id !== user?.id)

    if (activeTab === 'following') {
      pool = pool.filter((p) => followingIds.has(p.id))
    } else {
      // Suggestions : joueurs non suivis STRICTEMENT dans le même rayon / même zone que l'utilisateur
      const notFollowed = pool.filter((p) => !followingIds.has(p.id))
      const myCity = (profile?.city || '').trim().toLowerCase()

      if (myCity) {
        // Filtre les joueurs qui sont dans la même commune/ville ou zone urbaine
        pool = notFollowed.filter((p) => {
          const c = (p.city || '').trim().toLowerCase()
          if (!c) return false
          return (
            c === myCity ||
            c.includes(myCity) ||
            myCity.includes(c) ||
            (myCity.includes('abidjan') && c.includes('abidjan'))
          )
        })
      } else {
        // Si l'utilisateur n'a pas spécifié de commune, afficher par défaut la communauté du grand Abidjan
        pool = notFollowed.filter((p) => (p.city || '').trim().toLowerCase().includes('abidjan'))
      }
    }

    if (q) {
      pool = pool.filter(
        (p) =>
          p.pseudo?.toLowerCase().includes(q) ||
          p.full_name?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q),
      )
    }

    return pool
  }, [players, followingIds, activeTab, search, user?.id, profile?.city])

  const loading = playersLoading && loadingFollows

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      <BackHeader title="Amis & Réseau" onBack={() => router.back()} />

      {/* Barre de recherche */}
      <XStack paddingHorizontal={16} paddingTop={8} paddingBottom={4}>
        <XStack
          flex={1}
          alignItems="center"
          backgroundColor={palette.card}
          borderRadius={14}
          borderWidth={1}
          borderColor={palette.border}
          paddingHorizontal={12}
          height={46}
          gap={8}
        >
          <Search size={16} color={palette.textMuted} />
          <Input
            flex={1}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom, pseudo, poste…"
            placeholderTextColor={toTokenColor(palette.textMuted)}
            backgroundColor="transparent"
            borderWidth={0}
            color={palette.text}
            fontSize={14}
          />
        </XStack>
      </XStack>

      {/* Onglets : Abonnements / Suggestions */}
      <XStack paddingHorizontal={16} paddingVertical={10} gap={8}>
        <Pressable
          onPress={() => setActiveTab('following')}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: activeTab === 'following' ? palette.primary : palette.cardElevated,
            borderWidth: 1,
            borderColor: activeTab === 'following' ? palette.primary : palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            color={activeTab === 'following' ? '#fff' : palette.textMuted}
            fontSize={12}
            style={{ ...fonts.bold }}
          >
            Abonnements ({followingIds.size})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('suggestions')}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: activeTab === 'suggestions' ? palette.primary : palette.cardElevated,
            borderWidth: 1,
            borderColor: activeTab === 'suggestions' ? palette.primary : palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            color={activeTab === 'suggestions' ? '#fff' : palette.textMuted}
            fontSize={12}
            style={{ ...fonts.bold }}
          >
            Suggestions
          </Text>
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await Promise.all([refreshPlayers(), loadFollows()])
              setRefreshing(false)
            }}
            tintColor={palette.primary}
          />
        }
      >
        {loading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical={60}>
            <FuttoLogoLoader size={50} label="Chargement du réseau…" />
          </YStack>
        ) : list.length === 0 ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical={50}
            gap={10}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: palette.cardElevated,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <Users size={26} color={palette.textMuted} />
            </View>
            <Text color={palette.text} fontSize={16} style={{ ...fonts.bold }}>
              {activeTab === 'following'
                ? 'Aucun abonnement pour l’instant'
                : 'Aucun joueur dans ton rayon pour l’instant'}
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              maxWidth={280}
              style={{ ...fonts.regular }}
            >
              {activeTab === 'following'
                ? 'Consulte l’onglet Suggestions pour trouver des joueurs dans ton rayon et les suivre.'
                : 'D’autres joueurs de ta zone apparaîtront ici dès leur inscription sur FUTTO !'}
            </Text>
          </YStack>
        ) : (
          list.map((j) => {
            const isFollowing = followingIds.has(j.id)
            const label = j.pseudo ? `@${j.pseudo}` : j.full_name || j.first_name || 'Joueur'

            return (
              <Pressable
                key={j.id}
                onPress={() => router.push(`/joueurs/${j.id}`)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor={palette.card}
                  borderRadius={16}
                  padding={12}
                  borderWidth={1}
                  borderColor={palette.border}
                  gap={10}
                >
                  <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
                    <Pressable
                      onPress={(e) => {
                        if (j.avatar_url) {
                          e.stopPropagation()
                          setViewerImage({ url: j.avatar_url, title: label })
                        }
                      }}
                      hitSlop={6}
                    >
                      <Avatar
                        initials={initials(label)}
                        color={palette.primary}
                        size={44}
                        uri={j.avatar_url}
                      />
                    </Pressable>

                    <YStack flex={1} minWidth={0} gap={2}>
                      <Text
                        color={palette.text}
                        fontSize={14}
                        numberOfLines={1}
                        style={{ ...fonts.semibold }}
                      >
                        {label}
                      </Text>
                      <Text
                        color={activeTab === 'suggestions' ? palette.primary : palette.textMuted}
                        fontSize={12}
                        numberOfLines={1}
                        style={{ ...fonts.medium }}
                      >
                        {activeTab === 'suggestions'
                          ? `Même rayon · ${j.city || 'Abidjan'}${j.position ? ` · ${j.position}` : ''}`
                          : [j.position, j.city || 'Abidjan'].filter(Boolean).join(' · ')}
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack alignItems="center" gap={8}>
                    {/* Bouton Message direct */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation()
                        router.push(`/messages/${j.id}`)
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: palette.cardElevated,
                        borderWidth: 1,
                        borderColor: palette.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MessageCircle size={16} color={palette.text} />
                    </Pressable>

                    {/* Bouton Suivre / Suivi */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation()
                        void toggleFollow(j.id)
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: isFollowing
                          ? `${palette.primary}18`
                          : palette.primary,
                        borderWidth: 1,
                        borderColor: isFollowing ? palette.primary : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {isFollowing ? (
                        <>
                          <Check size={13} color={palette.primary} />
                          <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                            Suivi
                          </Text>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} color="#fff" />
                          <Text color="#fff" fontSize={12} style={{ ...fonts.bold }}>
                            Suivre
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </XStack>
                </XStack>
              </Pressable>
            )
          })
        )}
      </ScrollView>

      {/* Visualiseur de photo en grand format */}
      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </YStack>
  )
}
