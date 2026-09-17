import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useAuth } from '@/lib/auth'

export type FeedPostAuthor = {
  id: string
  full_name: string | null
  first_name: string | null
  pseudo: string | null
  avatar_url: string | null
}

export type FeedPost = {
  id: string
  author_id: string
  body: string
  image_url: string | null
  likes_count: number
  comments_count?: number
  created_at: string
  author?: FeedPostAuthor | null
  liked_by_me?: boolean
}

export type PostComment = {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  author?: FeedPostAuthor | null
}

function authorDisplayName(a?: FeedPostAuthor | null) {
  if (!a) return 'Joueur'
  if (a.pseudo && a.pseudo.trim()) {
    return `@${a.pseudo.trim().replace(/^@/, '')}`
  }
  return a.first_name?.trim() || a.full_name?.trim() || 'Joueur'
}

export function feedAuthorName(post: FeedPost) {
  return authorDisplayName(post.author)
}

export function feedAuthorInitials(post: FeedPost) {
  const a = post.author
  const name = a?.full_name?.trim() || a?.first_name?.trim() || a?.pseudo?.trim() || 'FU'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function formatFeedTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'À l’instant'
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return `Il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function useFeedPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from(T.posts)
      .select(
        `id, author_id, body, image_url, likes_count, comments_count, created_at,
         author:futto_profiles!author_id ( id, full_name, first_name, pseudo, avatar_url )`,
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (err) {
      setError(err.message)
      setPosts([])
      setLoading(false)
      return
    }

    let rows = ((data as unknown as FeedPost[]) ?? []).map((p) => {
      const author = Array.isArray(p.author) ? p.author[0] ?? null : p.author
      return { ...p, author }
    })

    if (user?.id && rows.length > 0) {
      const ids = rows.map((p) => p.id)
      const { data: likes } = await supabase
        .from(T.postLikes)
        .select('post_id')
        .eq('profile_id', user.id)
        .in('post_id', ids)
      const liked = new Set((likes ?? []).map((l) => l.post_id as string))
      rows = rows.map((p) => ({ ...p, liked_by_me: liked.has(p.id) }))
    }

    setPosts(rows)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!supabase || !user) return
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const liked = Boolean(post.liked_by_me)
      // Mise à jour optimiste
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: !liked,
                likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)),
              }
            : p,
        ),
      )

      try {
        // 1. Essai avec RPC atomique avec bypass RLS
        const { data: rpcData, error: rpcErr } = await supabase.rpc('futto_toggle_post_like', {
          p_post_id: postId,
        })

        if (!rpcErr && rpcData) {
          const result = rpcData as { liked: boolean; likes_count: number }
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    liked_by_me: result.liked,
                    likes_count: result.likes_count,
                  }
                : p,
            ),
          )
          return
        }

        // 2. Fallback direct table
        if (liked) {
          const { error: delErr } = await supabase
            .from(T.postLikes)
            .delete()
            .eq('post_id', postId)
            .eq('profile_id', user.id)
          if (delErr) {
            console.warn('[Feed] Erreur suppression like:', delErr)
            await refresh()
          }
        } else {
          const { error: insErr } = await supabase.from(T.postLikes).insert({
            post_id: postId,
            profile_id: user.id,
          })
          if (insErr) {
            console.warn('[Feed] Erreur ajout like:', insErr)
            await refresh()
          }
        }
      } catch (e) {
        console.warn('[Feed] Erreur toggleLike:', e)
        await refresh()
      }
    },
    [posts, user, refresh],
  )

  const deletePost = useCallback(
    async (postId: string) => {
      if (!supabase || !user) return { error: 'Non connecté' }
      const { error: err } = await supabase
        .from(T.posts)
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id)
      if (err) {
        console.warn('[Feed] Erreur suppression post:', err)
        return { error: err.message }
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      return { success: true }
    },
    [user],
  )

  const editPost = useCallback(
    async (postId: string, newBody: string) => {
      if (!supabase || !user) return { error: 'Non connecté' }
      const clean = newBody.trim()
      const { error: err } = await supabase
        .from(T.posts)
        .update({ body: clean })
        .eq('id', postId)
        .eq('author_id', user.id)
      if (err) {
        console.warn('[Feed] Erreur modification post:', err)
        return { error: err.message }
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, body: clean } : p)),
      )
      return { success: true }
    },
    [user],
  )

  return { posts, loading, error, refresh, toggleLike, deletePost, editPost }
}

export function usePostComments(postId?: string | null) {
  const { user } = useAuth()
  const [comments, setComments] = useState<PostComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !postId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from(T.postComments)
        .select(
          `id, post_id, author_id, content, created_at,
           author:futto_profiles!author_id ( id, full_name, first_name, pseudo, avatar_url )`,
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (err) {
        if (!/relation.*does not exist/i.test(err.message)) {
          setError(err.message)
        }
        setComments([])
      } else {
        const list = ((data as unknown as PostComment[]) ?? []).map((c) => {
          const author = Array.isArray(c.author) ? c.author[0] ?? null : c.author
          return { ...c, author }
        })
        setComments(list)
      }
    } catch (e) {
      console.warn('[Comments] Error fetching comments:', e)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addComment = useCallback(
    async (content: string) => {
      if (!supabase || !user || !postId) return { error: 'Non connecté' }
      const text = content.trim()
      if (!text) return { error: 'Commentaire vide' }

      const tempId = `temp-${Date.now()}`
      const optimistic: PostComment = {
        id: tempId,
        post_id: postId,
        author_id: user.id,
        content: text,
        created_at: new Date().toISOString(),
        author: {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? null,
          first_name: null,
          pseudo: user.user_metadata?.pseudo ?? null,
          avatar_url: null,
        },
      }
      setComments((prev) => [...prev, optimistic])

      try {
        const { data, error: err } = await supabase
          .from(T.postComments)
          .insert({
            post_id: postId,
            author_id: user.id,
            content: text,
          })
          .select(
            `id, post_id, author_id, content, created_at,
             author:futto_profiles!author_id ( id, full_name, first_name, pseudo, avatar_url )`,
          )
          .maybeSingle()

        if (err) {
          setComments((prev) => prev.filter((c) => c.id !== tempId))
          return { error: err.message }
        }

        if (data) {
          const real = data as unknown as PostComment
          const author = Array.isArray(real.author) ? real.author[0] ?? null : real.author
          setComments((prev) =>
            prev.map((c) => (c.id === tempId ? { ...real, author } : c)),
          )
        }
        return { success: true }
      } catch (e) {
        setComments((prev) => prev.filter((c) => c.id !== tempId))
        return { error: e instanceof Error ? e.message : 'Erreur réseau' }
      }
    },
    [postId, user],
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!supabase || !user) return { error: 'Non connecté' }
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      try {
        const { error: err } = await supabase
          .from(T.postComments)
          .delete()
          .eq('id', commentId)
          .eq('author_id', user.id)
        if (err) {
          await refresh()
          return { error: err.message }
        }
        return { success: true }
      } catch (e) {
        await refresh()
        return { error: e instanceof Error ? e.message : 'Erreur réseau' }
      }
    },
    [user, refresh],
  )

  return { comments, loading, error, refresh, addComment, deleteComment }
}
