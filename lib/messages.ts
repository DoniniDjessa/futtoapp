import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import type { Profile } from '@/lib/types'

export type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: {
    id: string
    full_name?: string | null
    first_name?: string | null
    pseudo?: string | null
    avatar_url?: string | null
  } | null
}

export type ChatConversation = {
  id: string
  name: string
  avatarUrl?: string | null
  initials: string
  color: string
  lastMessage: string
  time: string
  unread: number
  otherParticipantId?: string
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMinutes < 1) return 'maintenant'
  if (diffMinutes < 60) return `${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffHours < 48) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getInitials(name?: string | null) {
  if (!name) return 'FU'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'FU'
}

/**
 * Hook pour lister les conversations réelles de l'utilisateur
 */
export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setConversations([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Récupérer les participations aux conversations de l'utilisateur
      const { data: myParticipations, error: pErr } = await supabase
        .from(T.conversationParticipants)
        .select('conversation_id, unread_count')
        .eq('profile_id', user.id)

      if (pErr || !myParticipations || myParticipations.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      const convIds = myParticipations.map((p) => p.conversation_id)

      // Récupérer les conversations
      const { data: convData } = await supabase
        .from(T.conversations)
        .select('*')
        .in('id', convIds)
        .order('last_message_at', { ascending: false })

      // Récupérer tous les autres participants
      const { data: otherParts } = await supabase
        .from(T.conversationParticipants)
        .select(`conversation_id, profile_id, profile:futto_profiles(id, full_name, first_name, pseudo, avatar_url)`)
        .in('conversation_id', convIds)
        .neq('profile_id', user.id)

      const otherMap = new Map<string, any>()
      for (const op of otherParts || []) {
        if (op.profile) otherMap.set(op.conversation_id, op.profile)
      }

      const myPartMap = new Map<string, number>()
      for (const p of myParticipations) {
        myPartMap.set(p.conversation_id, p.unread_count || 0)
      }

      const list: ChatConversation[] = (convData || []).map((c) => {
        const other = otherMap.get(c.id)
        const name = other?.pseudo ? `@${other.pseudo}` : other?.full_name || other?.first_name || 'Conversation'
        return {
          id: c.id,
          name,
          avatarUrl: other?.avatar_url,
          initials: getInitials(name),
          color: '#00b14f',
          lastMessage: c.last_message_text || 'Aucun message pour le moment',
          time: formatRelativeTime(c.last_message_at || c.updated_at),
          unread: myPartMap.get(c.id) || 0,
          otherParticipantId: other?.id,
        }
      })

      setConversations(list)
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { conversations, loading, refresh }
}

/**
 * Hook pour charger les messages et envoyer des messages dans un fil de discussion
 */
export function useChatThread(targetId: string) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [partner, setPartner] = useState<{ id: string; name: string; avatarUrl?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  // Résoudre si targetId est un ID de conversation ou un ID de joueur
  const initThread = useCallback(async () => {
    if (!targetId) return
    setLoading(true)

    if (!supabase || !user) {
      setLoading(false)
      return
    }

    try {
      // Vérifier d'abord si targetId est un joueur (dans futto_profiles)
      const { data: playerProfile } = await supabase
        .from(T.profiles)
        .select('id, full_name, first_name, pseudo, avatar_url')
        .eq('id', targetId)
        .maybeSingle()

      if (playerProfile) {
        // C'est un profil joueur !
        const pName = playerProfile.pseudo ? `@${playerProfile.pseudo}` : playerProfile.full_name || 'Joueur'
        setPartner({ id: playerProfile.id, name: pName, avatarUrl: playerProfile.avatar_url })

        // Chercher s'il existe déjà une conversation entre user.id et playerProfile.id
        const { data: myParts } = await supabase
          .from(T.conversationParticipants)
          .select('conversation_id')
          .eq('profile_id', user.id)

        let foundConvId: string | null = null
        if (myParts && myParts.length > 0) {
          const convIds = myParts.map((p) => p.conversation_id)
          const { data: matchParts } = await supabase
            .from(T.conversationParticipants)
            .select('conversation_id')
            .in('conversation_id', convIds)
            .eq('profile_id', playerProfile.id)
            .limit(1)

          if (matchParts && matchParts[0]) {
            foundConvId = matchParts[0].conversation_id
          }
        }

        if (foundConvId) {
          setConversationId(foundConvId)
          await loadMessages(foundConvId)
        } else {
          // Nouvelle conversation qui sera créée au premier message
          setConversationId(null)
          setMessages([])
        }
      } else {
        // targetId est un id de conversation direct
        setConversationId(targetId)

        // Trouver l'autre participant
        const { data: op } = await supabase
          .from(T.conversationParticipants)
          .select(`profile:futto_profiles(id, full_name, first_name, pseudo, avatar_url)`)
          .eq('conversation_id', targetId)
          .neq('profile_id', user.id)
          .maybeSingle()

        const pr = (op as any)?.profile
        if (pr) {
          const name = pr.pseudo ? `@${pr.pseudo}` : pr.full_name || pr.first_name || 'Contact'
          setPartner({ id: pr.id, name, avatarUrl: pr.avatar_url })
        }

        await loadMessages(targetId)
      }
    } finally {
      setLoading(false)
    }
  }, [targetId, user])

  async function loadMessages(convId: string) {
    if (!supabase) return
    const { data } = await supabase
      .from(T.messages)
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data as ChatMessage[])
    }
  }

  useEffect(() => {
    void initThread()
  }, [initThread])

  // Realtime subscription pour recevoir les messages instantanément
  useEffect(() => {
    if (!supabase || !conversationId) return

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: T.messages,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        },
      )
      .subscribe()

    return () => {
      if (supabase) void supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || !user || !supabase) return false

    let activeConvId = conversationId

    // Si la conversation n'existe pas encore entre les deux joueurs, on la crée
    if (!activeConvId && partner?.id) {
      const { data: newConv, error: cErr } = await supabase
        .from(T.conversations)
        .insert({ last_message_text: text })
        .select('id')
        .single()

      if (cErr || !newConv) return false
      activeConvId = newConv.id
      setConversationId(activeConvId)

      // Ajouter les deux participants
      await supabase.from(T.conversationParticipants).insert([
        { conversation_id: activeConvId, profile_id: user.id },
        { conversation_id: activeConvId, profile_id: partner.id },
      ])
    }

    if (!activeConvId) return false

    // Optimistic UI
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const { data: inserted, error: sendErr } = await supabase
        .from(T.messages)
        .insert({
          conversation_id: activeConvId,
          sender_id: user.id,
          content: text,
        })
        .select()
        .single()

      if (sendErr) throw sendErr

      // Remplacer l'optimiste par le réel
      if (inserted) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? (inserted as ChatMessage) : m)))
      }

      // Notifier le partenaire
      if (partner?.id) {
        const senderName = profile?.pseudo ? `@${profile.pseudo}` : profile?.full_name || 'Un joueur'
        void notifyUser({
          profileId: partner.id,
          title: `Message de ${senderName}`,
          body: text,
          kind: 'match',
          data: { conversationId: activeConvId },
        })
      }

      return true
    } catch (e) {
      console.warn('Erreur envoi message:', e)
      return false
    }
  }

  return { messages, loading, partner, sendMessage, formatRelativeTime }
}
