import { useState, useCallback } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native'
import { Heart, MessageCircle, MoreVertical, Plus, Send, Share2, Trash2, UserPlus, X } from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Image } from 'expo-image'
import { useFocusEffect, useRouter } from 'expo-router'
import { Avatar } from '@/components/Avatar'
import { ScreenHeader } from '@/components/ScreenHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { useAppDialog } from '@/components/AppDialog'
import { fonts } from '@/lib/fonts'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import {
  feedAuthorInitials,
  feedAuthorName,
  formatFeedTime,
  useFeedPosts,
  usePostComments,
  type FeedPost,
} from '@/lib/feed'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

/** Feed social — UI alignée sur la démo futto (posts réels, likes, commentaires, suivre). */
export default function FeedTabScreen() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const dialog = useAppDialog()

  const { posts, loading, error, refresh, toggleLike, deletePost, editPost } = useFeedPosts()
  const [refreshing, setRefreshing] = useState(false)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  // Aperçu grand format des photos (avatar ou image post)
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)

  // Modale d'édition
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null)
  const [editBodyText, setEditBodyText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Sheet de commentaires
  const [commentingPost, setCommentingPost] = useState<FeedPost | null>(null)

  const loadFollows = useCallback(async () => {
    if (!supabase || !user?.id) return
    const { data } = await supabase
      .from(T.follows)
      .select('following_id')
      .eq('follower_id', user.id)
    if (data) {
      setFollowingIds(new Set(data.map((r: { following_id: string }) => r.following_id)))
    }
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void refresh()
      void loadFollows()
    }, [refresh, loadFollows]),
  )

  async function handleToggleFollow(targetId: string) {
    if (!supabase) return
    if (!user?.id) {
      router.push('/connexion')
      return
    }
    const isFollowing = followingIds.has(targetId)
    if (isFollowing) {
      setFollowingIds((prev) => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
      await supabase.from(T.follows).delete().eq('follower_id', user.id).eq('following_id', targetId)
    } else {
      setFollowingIds((prev) => {
        const next = new Set(prev)
        next.add(targetId)
        return next
      })
      await supabase.from(T.follows).upsert({ follower_id: user.id, following_id: targetId })
      void notifyUser({
        profileId: targetId,
        title: 'Nouvel abonné',
        body: `${profile?.pseudo ? `@${profile.pseudo}` : profile?.full_name || 'Un joueur'} a commencé à te suivre sur FUTTO.`,
        kind: 'system',
        data: { profileId: user.id },
      })
    }
  }

  const myInitials =
    (profile?.full_name || profile?.first_name || profile?.pseudo || 'TU')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'TU'

  async function onRefresh() {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  function handleStartEdit(post: FeedPost) {
    setEditingPost(post)
    setEditBodyText(post.body || '')
  }

  async function handleSaveEdit() {
    if (!editingPost) return
    setSavingEdit(true)
    try {
      const res = await editPost(editingPost.id, editBodyText)
      if (res.error) {
        dialog.show({
          title: 'Erreur',
          message: res.error,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      } else {
        setEditingPost(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  function handleAuthorMenu(post: FeedPost) {
    dialog.show({
      title: 'Gérer ma publication',
      message: 'Que souhaites-tu faire avec cette publication ?',
      actions: [
        {
          label: 'Modifier le texte',
          tone: 'primary',
          onPress: () => handleStartEdit(post),
        },
        {
          label: 'Supprimer',
          tone: 'danger',
          onPress: () => void handleDeletePost(post.id),
        },
        {
          label: 'Annuler',
          tone: 'cancel',
        },
      ],
    })
  }

  async function handleDeletePost(postId: string) {
    const ok = await dialog.confirm({
      title: 'Supprimer la publication',
      message: 'Es-tu certain de vouloir supprimer cette publication ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    })
    if (ok) {
      const res = await deletePost(postId)
      if (res.error) {
        dialog.show({
          title: 'Erreur',
          message: res.error,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      }
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 52, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        <ScreenHeader
          title="Le Fil FUTTO"
          subtitle="Le foot amateur ivoirien en direct"
          right={
            <Pressable
              onPress={() => router.push('/publier-feed')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: palette.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          }
        />

        <Pressable onPress={() => router.push('/publier-feed')}>
          <XStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={14}
            alignItems="center"
            gap={12}
            marginBottom={18}
          >
            <Avatar
              initials={myInitials}
              color={palette.primary}
              size={44}
              uri={profile?.avatar_url}
            />
            <YStack flex={1}>
              <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.medium }}>
                Exprime-toi, partage une photo ou un match…
              </Text>
            </YStack>
          </XStack>
        </Pressable>

        {loading && posts.length === 0 ? (
          <YStack paddingVertical={40} alignItems="center" justifyContent="center">
            <FuttoLogoLoader size={64} label="Chargement du fil d'actualités…" />
          </YStack>
        ) : error ? (
          <YStack
            marginTop={20}
            borderRadius={16}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.card}
            padding={20}
            gap={8}
          >
            <Text color={palette.text} fontSize={15} style={{ ...fonts.semibold }}>
              Feed indisponible
            </Text>
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
              {/relation|does not exist|PGRST/i.test(error)
                ? 'Exécute le script SQL du feed dans le Dashboard Supabase, puis tire pour rafraîchir.'
                : error}
            </Text>
          </YStack>
        ) : posts.length === 0 ? (
          <YStack
            marginTop={20}
            borderRadius={16}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.card}
            padding={20}
            alignItems="center"
            gap={8}
          >
            <Text color={palette.text} fontSize={16} style={{ ...fonts.semibold }} textAlign="center">
              Aucun post pour l’instant
            </Text>
            <Text
              color={palette.textMuted}
              fontSize={13}
              textAlign="center"
              style={{ ...fonts.regular }}
            >
              Sois le premier : partage un match, une photo de terrain ou un appel à jouer.
            </Text>
          </YStack>
        ) : (
          <YStack marginTop={16} gap={16}>
            {posts.map((p) => (
              <FeedPostCard
                key={p.id}
                post={p}
                palette={palette}
                currentUserId={user?.id}
                isFollowing={p.author_id ? followingIds.has(p.author_id) : false}
                onToggleFollow={(authorId) => void handleToggleFollow(authorId)}
                onLike={() => void toggleLike(p.id)}
                onOpenMenu={() => handleAuthorMenu(p)}
                onOpenComments={() => setCommentingPost(p)}
                onPressPost={() => router.push(`/feed/${p.id}`)}
                onPressAuthor={() => {
                  if (p.author_id === user?.id) {
                    router.push('/profil')
                  } else if (p.author_id) {
                    router.push(`/joueurs/${p.author_id}`)
                  }
                }}
                onPressAvatar={() => {
                  const aName = feedAuthorName(p)
                  if (p.author?.avatar_url) {
                    setViewerImage({ url: p.author.avatar_url, title: aName })
                  } else if (p.author_id) {
                    if (p.author_id === user?.id) router.push('/profil')
                    else router.push(`/joueurs/${p.author_id}`)
                  }
                }}
                onPressImage={() => {
                  const aName = feedAuthorName(p)
                  if (p.image_url) {
                    setViewerImage({ url: p.image_url, title: `Publication de ${aName}` })
                  }
                }}
              />
            ))}
          </YStack>
        )}
      </ScrollView>

      {/* Modale d'édition d'une publication */}
      <Modal
        visible={Boolean(editingPost)}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingPost(null)}
      >
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.65)" justifyContent="flex-end">
          <YStack
            backgroundColor={palette.card}
            borderTopLeftRadius={24}
            borderTopRightRadius={24}
            padding={20}
            gap={14}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text color={palette.text} fontSize={17} style={{ ...fonts.bold }}>
                Modifier la publication
              </Text>
              <Pressable onPress={() => setEditingPost(null)} hitSlop={10}>
                <X size={20} color={palette.textMuted} />
              </Pressable>
            </XStack>

            <TextInput
              value={editBodyText}
              onChangeText={setEditBodyText}
              multiline
              placeholder="Que veux-tu modifier ?"
              placeholderTextColor={palette.textMuted}
              style={{
                backgroundColor: palette.cardElevated,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.border,
                color: palette.text,
                padding: 14,
                fontSize: 14.5,
                minHeight: 110,
                textAlignVertical: 'top',
              }}
            />

            <XStack gap={10} justifyContent="flex-end">
              <Button
                size="$3"
                backgroundColor={palette.cardElevated}
                borderWidth={1}
                borderColor={palette.border}
                onPress={() => setEditingPost(null)}
              >
                <Text color={palette.textMuted} style={{ ...fonts.medium }}>
                  Annuler
                </Text>
              </Button>
              <Button
                size="$3"
                backgroundColor={palette.primary}
                disabled={savingEdit}
                onPress={() => void handleSaveEdit()}
              >
                <Text color="#fff" style={{ ...fonts.bold }}>
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                </Text>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* Sheet de Commentaires interactif */}
      {commentingPost && (
        <FeedCommentsSheet
          post={commentingPost}
          palette={palette}
          currentUserId={user?.id}
          myAvatarUrl={profile?.avatar_url}
          myPseudo={profile?.pseudo || profile?.full_name}
          onClose={() => setCommentingPost(null)}
          onPressUser={(userId) => {
            setCommentingPost(null)
            if (userId === user?.id) router.push('/profil')
            else router.push(`/joueurs/${userId}`)
          }}
          onPressAvatar={(avatarUrl, name, userId) => {
            if (avatarUrl) {
              setViewerImage({ url: avatarUrl, title: name })
            } else if (userId) {
              setCommentingPost(null)
              if (userId === user?.id) router.push('/profil')
              else router.push(`/joueurs/${userId}`)
            }
          }}
        />
      )}

      {/* Visualiseur d'image plein écran */}
      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </YStack>
  )
}

function FeedPostCard({
  post,
  palette,
  currentUserId,
  isFollowing,
  onToggleFollow,
  onLike,
  onOpenMenu,
  onOpenComments,
  onPressPost,
  onPressAuthor,
  onPressAvatar,
  onPressImage,
}: {
  post: FeedPost
  palette: typeof colors | typeof lightColors
  currentUserId?: string
  isFollowing?: boolean
  onToggleFollow?: (authorId: string) => void
  onLike: () => void
  onOpenMenu: () => void
  onOpenComments: () => void
  onPressPost: () => void
  onPressAuthor: () => void
  onPressAvatar: () => void
  onPressImage: () => void
}) {
  const liked = Boolean(post.liked_by_me)
  const isAuthor = Boolean(currentUserId && post.author_id === currentUserId)
  const authorName = feedAuthorName(post)

  async function onShare() {
    const msg = post.body?.trim()
      ? `${authorName} sur FUTTO :\n${post.body.trim()}`
      : `${authorName} a partagé une photo sur FUTTO`
    await Share.share({ message: msg })
  }

  // Détection éventuelle de hashtag ou mot-clé comme tag pill (ex: #match, #five, etc.)
  const hashtagMatch = post.body?.match(/#([a-zA-Z0-9_À-ÿ]+)/)
  const tag = hashtagMatch ? `#${hashtagMatch[1]}` : null

  return (
    <YStack
      borderRadius={20}
      borderWidth={1}
      borderColor={palette.border}
      backgroundColor={palette.card}
      overflow="hidden"
    >
      {/* Header Auteur */}
      <XStack
        paddingHorizontal={16}
        paddingTop={15}
        paddingBottom={12}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
          <Pressable onPress={onPressAvatar} hitSlop={6}>
            <Avatar
              initials={feedAuthorInitials(post)}
              color={palette.primary}
              size={44}
              uri={post.author?.avatar_url}
            />
          </Pressable>
          <Pressable onPress={onPressAuthor} style={{ flex: 1, minWidth: 0 }}>
            <YStack gap={1}>
              <Text
                color={palette.text}
                fontSize={15}
                numberOfLines={1}
                style={{ ...fonts.bold }}
              >
                {authorName}
              </Text>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                {formatFeedTime(post.created_at)}
              </Text>
            </YStack>
          </Pressable>
        </XStack>

        {isAuthor ? (
          <Pressable
            onPress={onOpenMenu}
            hitSlop={12}
            style={{
              padding: 6,
              borderRadius: 8,
            }}
          >
            <MoreVertical size={18} color={palette.textMuted} />
          </Pressable>
        ) : onToggleFollow && post.author_id ? (
          <Pressable
            onPress={() => onToggleFollow(post.author_id)}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isFollowing ? `${palette.cardElevated}` : `${palette.primary}1A`,
            }}
          >
            {!isFollowing && <UserPlus size={13} color={palette.primary} />}
            <Text
              color={isFollowing ? palette.textMuted : palette.primary}
              fontSize={12}
              style={{ ...fonts.bold }}
            >
              {isFollowing ? 'Suivi' : 'Suivre'}
            </Text>
          </Pressable>
        ) : null}
      </XStack>

      {/* Contenu texte & tag */}
      <Pressable onPress={onPressPost}>
        <YStack paddingHorizontal={16} paddingBottom={post.image_url ? 12 : 14} gap={6}>
          {tag ? (
            <XStack marginBottom={2}>
              <XStack
                backgroundColor={`${palette.accent}20`}
                paddingHorizontal={10}
                paddingVertical={3}
                borderRadius={999}
              >
                <Text color={palette.accent} fontSize={11} style={{ ...fonts.bold }}>
                  {tag}
                </Text>
              </XStack>
            </XStack>
          ) : null}

          {post.body?.trim() ? (
            <Text
              color={palette.text}
              fontSize={14.5}
              lineHeight={22}
              style={{ ...fonts.regular }}
            >
              {post.body.trim()}
            </Text>
          ) : null}
        </YStack>
      </Pressable>

      {/* Media (Image) - cliquable pour voir en grand */}
      {post.image_url ? (
        <Pressable onPress={onPressImage}>
          <Image
            source={{ uri: post.image_url }}
            style={{ width: '100%', height: 235, backgroundColor: palette.bg }}
            contentFit="cover"
          />
        </Pressable>
      ) : null}

      {/* Barre d'actions (footer) */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={14}
        borderTopWidth={1}
        borderTopColor={palette.border}
        alignItems="center"
      >
        {/* Like */}
        <Pressable onPress={onLike} hitSlop={10}>
          <XStack alignItems="center" gap={6}>
            <Heart
              size={20}
              color={liked ? palette.accent : palette.textMuted}
              fill={liked ? palette.accent : 'transparent'}
            />
            <Text
              color={liked ? palette.accent : palette.textMuted}
              fontSize={13}
              style={{ ...(liked ? fonts.bold : fonts.medium) }}
            >
              {post.likes_count || 0}
            </Text>
          </XStack>
        </Pressable>

        {/* Commentaires */}
        <Pressable onPress={onOpenComments} hitSlop={10} style={{ marginLeft: 22 }}>
          <XStack alignItems="center" gap={6}>
            <MessageCircle size={20} color={palette.textMuted} />
            <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
              {post.comments_count || 0}
            </Text>
          </XStack>
        </Pressable>

        {/* Partager à droite */}
        <Pressable onPress={() => void onShare()} hitSlop={10} style={{ marginLeft: 'auto' }}>
          <Share2 size={20} color={palette.textMuted} />
        </Pressable>
      </XStack>
    </YStack>
  )
}

function FeedCommentsSheet({
  post,
  palette,
  currentUserId,
  myAvatarUrl,
  myPseudo,
  onClose,
  onPressUser,
  onPressAvatar,
}: {
  post: FeedPost
  palette: typeof colors | typeof lightColors
  currentUserId?: string
  myAvatarUrl?: string | null
  myPseudo?: string | null
  onClose: () => void
  onPressUser: (userId: string) => void
  onPressAvatar: (avatarUrl?: string | null, name?: string, userId?: string) => void
}) {
  const dialog = useAppDialog()
  const { mode } = useThemeMode()
  const { comments, loading, addComment, deleteComment } = usePostComments(post.id)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSend() {
    const clean = text.trim()
    if (!clean || submitting) return
    setSubmitting(true)
    try {
      const res = await addComment(clean)
      if (res.error) {
        dialog.show({
          title: 'Erreur',
          message: res.error,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      } else {
        setText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    const ok = await dialog.confirm({
      title: 'Supprimer ce commentaire ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    })
    if (ok) {
      await deleteComment(commentId)
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack
          backgroundColor={palette.card}
          borderTopLeftRadius={26}
          borderTopRightRadius={26}
          maxHeight="82%"
          paddingTop={16}
        >
          {/* Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal={20}
            paddingBottom={12}
            borderBottomWidth={1}
            borderBottomColor={palette.border}
          >
            <Text fontFamily="$heading" fontSize={18} color={palette.text}>
              Commentaires ({comments.length})
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color={palette.textMuted} />
            </Pressable>
          </XStack>

          {/* Liste des commentaires */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <FuttoLogoLoader size={44} label="Chargement…" inline />
            ) : comments.length === 0 ? (
              <YStack paddingVertical={30} alignItems="center" gap={6}>
                <Text color={palette.textMuted} fontSize={14} style={{ ...fonts.medium }}>
                  Aucun commentaire pour le moment.
                </Text>
                <Text color={palette.primary} fontSize={12} style={{ ...fonts.semibold }}>
                  Sois le premier à réagir !
                </Text>
              </YStack>
            ) : (
              comments.map((c) => {
                const isMine = Boolean(currentUserId && c.author_id === currentUserId)
                const cAuthorName =
                  c.author?.pseudo ? `@${c.author.pseudo}` : c.author?.full_name || c.author?.first_name || 'Joueur'

                return (
                  <XStack
                    key={c.id}
                    backgroundColor={mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
                    borderRadius={16}
                    borderWidth={1}
                    borderColor={palette.border}
                    padding={12}
                    gap={10}
                    alignItems="flex-start"
                  >
                    <Pressable
                      onPress={() => onPressAvatar(c.author?.avatar_url, cAuthorName, c.author_id)}
                      hitSlop={6}
                    >
                      <Avatar
                        initials={initials(cAuthorName)}
                        color={palette.primary}
                        size={34}
                        uri={c.author?.avatar_url}
                      />
                    </Pressable>

                    <YStack flex={1} minWidth={0} gap={2}>
                      <XStack alignItems="center" justifyContent="space-between">
                        <Pressable onPress={() => onPressUser(c.author_id)}>
                          <Text
                            color={cAuthorName.startsWith('@') ? palette.primary : palette.text}
                            fontSize={13}
                            style={{ ...fonts.semibold }}
                          >
                            {cAuthorName}
                          </Text>
                        </Pressable>
                        <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
                          {formatFeedTime(c.created_at)}
                        </Text>
                      </XStack>

                      <Text
                        color={palette.text}
                        fontSize={13}
                        lineHeight={18}
                        style={{ ...fonts.regular }}
                      >
                        {c.content}
                      </Text>
                    </YStack>

                    {isMine && (
                      <Pressable
                        onPress={() => void handleDelete(c.id)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={15} color={palette.danger} />
                      </Pressable>
                    )}
                  </XStack>
                )
              })
            )}
          </ScrollView>

          {/* Saisie commentaire */}
          <XStack
            paddingHorizontal={16}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor={palette.border}
            alignItems="center"
            gap={10}
          >
            <Avatar
              initials={initials(myPseudo)}
              color={palette.primary}
              size={34}
              uri={myAvatarUrl}
            />

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor={palette.textMuted}
              style={{
                flex: 1,
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                color: palette.text,
                maxHeight: 100,
              }}
              multiline
            />

            <Pressable
              onPress={() => void handleSend()}
              disabled={!text.trim() || submitting}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: text.trim() ? palette.primary : palette.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Send size={16} color="#fff" />
            </Pressable>
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  )
}
