import { useState, useEffect } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Heart, MessageCircle, MoreHorizontal, Send, Share2, Trash2, X } from 'lucide-react-native'
import { Text, YStack, XStack, Button } from 'tamagui'
import { Image } from 'expo-image'
import { Avatar } from '@/components/Avatar'
import { BackHeader } from '@/components/BackHeader'
import { FuttoLogoLoader } from '@/components/FuttoLoader'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { useAppDialog } from '@/components/AppDialog'
import { useAuth } from '@/lib/auth'
import { fonts } from '@/lib/fonts'
import { colors, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import {
  feedAuthorInitials,
  feedAuthorName,
  formatFeedTime,
  usePostComments,
  type FeedPost,
} from '@/lib/feed'

function initials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const dialog = useAppDialog()

  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null)
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loadingPost, setLoadingPost] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [editBodyText, setEditBodyText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const { comments, loading: loadingComments, addComment, deleteComment } = usePostComments(id)

  useEffect(() => {
    async function loadPost() {
      if (!supabase || !id) return
      setLoadingPost(true)
      try {
        const { data, error } = await supabase
          .from(T.posts)
          .select(
            `id, author_id, body, image_url, likes_count, comments_count, created_at,
             author:futto_profiles!author_id ( id, full_name, first_name, pseudo, avatar_url )`,
          )
          .eq('id', id)
          .maybeSingle()

        if (!error && data) {
          const author = Array.isArray(data.author) ? data.author[0] ?? null : data.author
          const p = { ...data, author } as unknown as FeedPost
          setPost(p)
          setLikesCount(p.likes_count || 0)

          if (user?.id) {
            const { data: likeData } = await supabase
              .from(T.postLikes)
              .select('id')
              .eq('post_id', id)
              .eq('profile_id', user.id)
              .maybeSingle()
            setLiked(Boolean(likeData))
          }
        }
      } catch (e) {
        console.warn('[PostDetail] Error:', e)
      } finally {
        setLoadingPost(false)
      }
    }

    void loadPost()
  }, [id, user?.id])

  async function handleToggleLike() {
    if (!supabase || !user || !id) return
    const next = !liked
    setLiked(next)
    setLikesCount((prev) => Math.max(0, prev + (next ? 1 : -1)))

    try {
      await supabase.rpc('futto_toggle_post_like', { p_post_id: id })
    } catch {
      // ignore
    }
  }

  async function handleShare() {
    if (!post) return
    const authorName = feedAuthorName(post)
    const msg = post.body?.trim()
      ? `${authorName} sur FUTTO :\n${post.body.trim()}`
      : `${authorName} a partagé une publication sur FUTTO`
    await Share.share({ message: msg })
  }

  async function handleSendComment() {
    const text = commentText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const res = await addComment(text)
      if (res.error) {
        dialog.show({
          title: 'Erreur',
          message: res.error,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      } else {
        setCommentText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    const ok = await dialog.confirm({
      title: 'Supprimer ce commentaire ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    })
    if (ok) {
      await deleteComment(commentId)
    }
  }

  const isAuthor = Boolean(user?.id && post?.author_id && user.id === post.author_id)

  function handleAuthorMenu() {
    if (!post) return
    dialog.show({
      title: 'Gérer ma publication',
      message: 'Que souhaites-tu faire avec cette publication ?',
      actions: [
        {
          label: 'Modifier le texte',
          tone: 'primary',
          onPress: () => {
            setEditBodyText(post.body || '')
            setEditingPost(true)
          },
        },
        {
          label: 'Supprimer',
          tone: 'danger',
          onPress: () => void handleDeletePost(),
        },
        {
          label: 'Annuler',
          tone: 'cancel',
        },
      ],
    })
  }

  async function handleDeletePost() {
    if (!post || !supabase || !user) return
    const ok = await dialog.confirm({
      title: 'Supprimer la publication',
      message: 'Es-tu certain de vouloir supprimer cette publication ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    })
    if (ok) {
      const { error } = await supabase
        .from(T.posts)
        .delete()
        .eq('id', post.id)
        .eq('author_id', user.id)

      if (error) {
        dialog.show({
          title: 'Erreur',
          message: error.message,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      } else {
        router.back()
      }
    }
  }

  async function handleSaveEdit() {
    if (!post || !supabase || !user) return
    setSavingEdit(true)
    try {
      const clean = editBodyText.trim()
      const { error } = await supabase
        .from(T.posts)
        .update({ body: clean })
        .eq('id', post.id)
        .eq('author_id', user.id)

      if (error) {
        dialog.show({
          title: 'Erreur',
          message: error.message,
          actions: [{ label: 'OK', tone: 'primary' }],
        })
      } else {
        setPost((prev) => (prev ? { ...prev, body: clean } : prev))
        setEditingPost(false)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  if (loadingPost) {
    return (
      <YStack flex={1} backgroundColor={palette.bg} alignItems="center" justifyContent="center">
        <Stack.Screen options={{ headerShown: false }} />
        <FuttoLogoLoader size={68} label="Chargement de la publication…" />
      </YStack>
    )
  }

  if (!post) {
    return (
      <YStack flex={1} backgroundColor={palette.bg}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Publication" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding={20}>
          <Text color={palette.textMuted} fontSize={15} style={{ ...fonts.medium }}>
            Cette publication est introuvable ou a été supprimée.
          </Text>
        </YStack>
      </YStack>
    )
  }

  const authorName = feedAuthorName(post)

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader
        title="Publication"
        onBack={() => router.back()}
        right={
          isAuthor ? (
            <Pressable onPress={handleAuthorMenu} hitSlop={10} style={{ padding: 4 }}>
              <MoreHorizontal size={22} color={palette.text} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête auteur */}
        <XStack alignItems="center" gap={12} marginTop={12}>
          <Pressable
            onPress={() => {
              if (post.author?.avatar_url) {
                setViewerImage({ url: post.author.avatar_url, title: authorName })
              } else if (post.author_id) {
                if (post.author_id === user?.id) router.push('/profil')
                else router.push(`/joueurs/${post.author_id}`)
              }
            }}
            hitSlop={6}
          >
            <Avatar
              initials={feedAuthorInitials(post)}
              color={palette.primary}
              size={46}
              uri={post.author?.avatar_url}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              if (post.author_id === user?.id) router.push('/profil')
              else if (post.author_id) router.push(`/joueurs/${post.author_id}`)
            }}
            style={{ flex: 1 }}
          >
            <YStack>
              <Text
                color={authorName.startsWith('@') ? palette.primary : palette.text}
                fontSize={16}
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

        {/* Corps texte */}
        {post.body?.trim() ? (
          <Text
            color={palette.text}
            fontSize={15}
            lineHeight={22}
            marginTop={14}
            style={{ ...fonts.regular }}
          >
            {post.body.trim()}
          </Text>
        ) : null}

        {/* Image du post - cliquable pour voir en grand */}
        {post.image_url ? (
          <Pressable
            onPress={() => {
              if (post.image_url) {
                setViewerImage({ url: post.image_url, title: `Publication de ${authorName}` })
              }
            }}
          >
            <Image
              source={{ uri: post.image_url }}
              style={{ width: '100%', height: 260, borderRadius: 18, marginTop: 14 }}
              contentFit="cover"
            />
          </Pressable>
        ) : null}

        {/* Boutons actions (Like, Comments count, Share) */}
        <XStack
          alignItems="center"
          gap={20}
          marginTop={16}
          paddingVertical={10}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor={palette.border}
        >
          <Pressable onPress={() => void handleToggleLike()}>
            <XStack alignItems="center" gap={6}>
              <Heart
                size={20}
                color={liked ? palette.danger : palette.textMuted}
                fill={liked ? palette.danger : 'transparent'}
              />
              <Text
                color={liked ? palette.danger : palette.textMuted}
                fontSize={13}
                style={{ ...fonts.medium }}
              >
                {likesCount > 0 ? `${likesCount} j’aime` : 'J’aime'}
              </Text>
            </XStack>
          </Pressable>

          <XStack alignItems="center" gap={6}>
            <MessageCircle size={20} color={palette.primary} />
            <Text color={palette.primary} fontSize={13} style={{ ...fonts.semibold }}>
              {comments.length} commentaire{comments.length > 1 ? 's' : ''}
            </Text>
          </XStack>

          <Pressable onPress={() => void handleShare()}>
            <XStack alignItems="center" gap={6}>
              <Share2 size={20} color={palette.textMuted} />
              <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
                Partager
              </Text>
            </XStack>
          </Pressable>
        </XStack>

        {/* Section Commentaires */}
        <YStack marginTop={20} gap={12}>
          <Text
            color={palette.text}
            fontSize={17}
            style={{ ...fonts.bold }}
          >
            Commentaires ({comments.length})
          </Text>

          {loadingComments ? (
            <FuttoLogoLoader size={40} label="Chargement des commentaires…" inline />
          ) : comments.length === 0 ? (
            <YStack
              backgroundColor={palette.card}
              borderRadius={16}
              padding={20}
              alignItems="center"
              gap={8}
              borderWidth={1}
              borderColor={palette.border}
            >
              <Text color={palette.textMuted} fontSize={13} textAlign="center" style={{ ...fonts.medium }}>
                Aucun commentaire pour le moment.{'\n'}Sois le premier à réagir !
              </Text>
            </YStack>
          ) : (
            comments.map((c) => {
              const isMine = Boolean(user && c.author_id === user.id)
              const cAuthorName =
                c.author?.pseudo ? `@${c.author.pseudo}` : c.author?.full_name || c.author?.first_name || 'Joueur'

              return (
                <XStack
                  key={c.id}
                  backgroundColor={palette.card}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  padding={12}
                  gap={10}
                  alignItems="flex-start"
                >
                  <Pressable
                    onPress={() => {
                      if (c.author?.avatar_url) {
                        setViewerImage({ url: c.author.avatar_url, title: cAuthorName })
                      } else if (c.author_id) {
                        if (c.author_id === user?.id) router.push('/profil')
                        else router.push(`/joueurs/${c.author_id}`)
                      }
                    }}
                    hitSlop={6}
                  >
                    <Avatar
                      initials={initials(cAuthorName)}
                      color={palette.primary}
                      size={36}
                      uri={c.author?.avatar_url}
                    />
                  </Pressable>

                  <YStack flex={1} minWidth={0} gap={2}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <Pressable
                        onPress={() => {
                          if (c.author_id === user?.id) router.push('/profil')
                          else if (c.author_id) router.push(`/joueurs/${c.author_id}`)
                        }}
                      >
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
                      onPress={() => void handleDeleteComment(c.id)}
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
        </YStack>
      </ScrollView>

      {/* Barre de saisie de commentaire en bas */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={12}
        backgroundColor={palette.card}
        borderTopWidth={1}
        borderTopColor={palette.border}
        alignItems="center"
        gap={10}
      >
        <Avatar
          initials={initials(profile?.pseudo || profile?.full_name)}
          color={palette.primary}
          size={34}
          uri={profile?.avatar_url}
        />

        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Écrire un commentaire…"
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
          onPress={() => void handleSendComment()}
          disabled={!commentText.trim() || submitting}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: commentText.trim() ? palette.primary : palette.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <Send size={18} color="#fff" />
        </Pressable>
        </XStack>
      </KeyboardAvoidingView>

      {/* Modal d'édition de la publication */}
      <Modal
        visible={editingPost}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingPost(false)}
      >
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.65)" justifyContent="flex-end">
          <YStack
            backgroundColor={palette.card}
            borderTopLeftRadius={24}
            borderTopRightRadius={24}
            padding={20}
            gap={16}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontFamily="$heading" fontSize={20} color={palette.text}>
                Modifier la publication
              </Text>
              <Pressable onPress={() => setEditingPost(false)}>
                <X size={22} color={palette.textMuted} />
              </Pressable>
            </XStack>

            <TextInput
              value={editBodyText}
              onChangeText={setEditBodyText}
              placeholder="Texte de ta publication…"
              placeholderTextColor={palette.textMuted}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 120,
                backgroundColor: palette.bg,
                color: palette.text,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 14,
                fontSize: 15,
              }}
            />

            <XStack gap={10}>
              <Button
                flex={1}
                height={46}
                borderRadius={12}
                backgroundColor={palette.cardElevated}
                borderWidth={1}
                borderColor={palette.border}
                onPress={() => setEditingPost(false)}
              >
                <Text color={palette.text} style={{ ...fonts.semibold }}>
                  Annuler
                </Text>
              </Button>
              <Button
                flex={1}
                height={46}
                borderRadius={12}
                backgroundColor={palette.primary}
                disabled={savingEdit || !editBodyText.trim()}
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
      <ImageViewerModal
        visible={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </>
  )
}
