import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Plus, Shield, Trash2, Users, MessageCircle, Share2, Sparkles } from 'lucide-react-native'
import { Text, YStack, XStack, Button, Input } from 'tamagui'
import { BackHeader } from '@/components/BackHeader'
import { useAppDialog } from '@/components/AppDialog'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { openWhatsAppInvite } from '@/lib/share'
import { notifyUser } from '@/lib/push'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { type Team, type TeamMember, useMyTeam } from '@/lib/data'

export default function MonEquipeScreen() {
  const router = useRouter()
  const dialog = useAppDialog()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { user } = useAuth()
  const { team, members, loading, refresh } = useMyTeam()

  const [teamName, setTeamName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberPhone, setMemberPhone] = useState('')
  const [busy, setBusy] = useState(false)

  async function createTeam() {
    if (!supabase || !user || !teamName.trim()) return
    setBusy(true)
    const { error } = await supabase.from(T.teams).insert({
      owner_id: user.id,
      name: teamName.trim(),
    })
    setBusy(false)
    if (error) {
      dialog.showDialog({
        title: 'Erreur',
        message: error.message,
        confirmText: 'OK',
      })
    } else {
      void notifyUser({
        profileId: user.id,
        title: 'Équipe créée ⚽',
        body: `Ton équipe « ${teamName.trim()} » a été créée avec succès.`,
        kind: 'system',
      })
      setTeamName('')
      await refresh()
    }
  }

  async function addMember() {
    if (!supabase || !team || !memberName.trim()) return
    if (members.length >= 12) {
      dialog.showDialog({
        title: 'Limite atteinte',
        message: 'Tu as atteint le maximum de 12 coéquipiers enregistrés.',
        confirmText: 'Compris',
      })
      return
    }
    setBusy(true)
    const phoneClean = memberPhone.trim() || null
    const { error } = await supabase.from(T.teamMembers).insert({
      team_id: team.id,
      display_name: memberName.trim(),
      phone: phoneClean,
    })
    setBusy(false)
    if (error) {
      dialog.showDialog({
        title: 'Erreur',
        message: error.message,
        confirmText: 'OK',
      })
    } else {
      if (phoneClean && user) {
        void supabase
          .from(T.profiles)
          .select('id')
          .eq('phone', phoneClean)
          .maybeSingle()
          .then(({ data: matched }) => {
            if (matched?.id && matched.id !== user.id) {
              void notifyUser({
                profileId: matched.id,
                title: 'Ajouté à une équipe ⚽',
                body: `Tu as été ajouté à l’équipe « ${team.name} » par ton capitaine.`,
                kind: 'invite',
                data: { teamId: team.id },
              })
            }
          })
      }
      setMemberName('')
      setMemberPhone('')
      await refresh()
    }
  }

  async function deleteMember(m: TeamMember) {
    const ok = await dialog.confirm({
      title: 'Retirer ce coéquipier ?',
      message: `Es-tu sûr de vouloir retirer ${m.display_name} de ton équipe ?`,
      confirmLabel: 'Retirer',
      destructive: true,
    })
    if (!ok || !supabase) return

    setBusy(true)
    const { error } = await supabase.from(T.teamMembers).delete().eq('id', m.id)
    setBusy(false)
    if (error) {
      dialog.showDialog({
        title: 'Erreur',
        message: error.message,
        confirmText: 'OK',
      })
    } else {
      await refresh()
    }
  }

  function inviteAllWhatsApp() {
    if (!team) return
    const message = `Salut les gars ! C'est ${user?.email?.split('@')[0] ?? 'le capitaine'} de l'équipe « ${team.name} ». Prêts pour notre prochain match sur FUTTO ? ⚽🔥 Rejoins l'app pour confirmer ta place !`
    void openWhatsAppInvite(message)
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />

      <BackHeader title="Mon équipe" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={palette.primary}
          />
        }
      >
        {/* Bannière explication */}
        <XStack
          backgroundColor={`${palette.primary}12`}
          borderWidth={1}
          borderColor={`${palette.primary}30`}
          borderRadius={16}
          padding={14}
          alignItems="center"
          gap={12}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: palette.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} color="#fff" />
          </View>
          <YStack flex={1} gap={2}>
            <Text color={palette.text} fontSize={14} style={{ ...fonts.bold }}>
              Ton effectif permanent
            </Text>
            <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
              Enregistre tes potes pour les inviter en 1 clic à tous tes matchs créés !
            </Text>
          </YStack>
        </XStack>

        {!team ? (
          /* Création d'équipe */
          <YStack
            backgroundColor={palette.card}
            borderRadius={20}
            borderWidth={1}
            borderColor={palette.border}
            padding={18}
            gap={14}
          >
            <YStack gap={4}>
              <Text color={palette.text} fontSize={16} style={{ ...fonts.bold }}>
                Nomme ton équipe
              </Text>
              <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
                Donne un nom officiel à ta formation (ex. Les Galactiques, Abidjan FC).
              </Text>
            </YStack>

            <Input
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Ex: FC Treichville"
              backgroundColor={palette.cardElevated}
              borderColor={palette.border}
              color={palette.text}
              borderRadius={14}
              height={50}
            />

            <Button
              backgroundColor={palette.primary}
              borderRadius={12}
              height={48}
              disabled={busy || !teamName.trim()}
              onPress={() => void createTeam()}
            >
              <Text color="#fff" style={{ ...fonts.bold }}>
                Créer mon équipe
              </Text>
            </Button>
          </YStack>
        ) : (
          /* Équipe existante */
          <>
            {/* Carte résumé équipe */}
            <YStack
              backgroundColor={palette.card}
              borderRadius={20}
              borderWidth={1}
              borderColor={palette.border}
              padding={16}
              gap={12}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1} gap={2}>
                  <Text fontFamily="$heading" fontSize={22} color={palette.text}>
                    {team.name}
                  </Text>
                  <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
                    {members.length} coéquipier{members.length > 1 ? 's' : ''} enregistré{members.length > 1 ? 's' : ''}
                  </Text>
                </YStack>

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: `${palette.primary}20`,
                  }}
                >
                  <Text color={palette.primary} fontSize={12} style={{ ...fonts.bold }}>
                    Actif
                  </Text>
                </View>
              </XStack>

              {members.length > 0 && (
                <Button
                  backgroundColor={palette.accent}
                  borderRadius={12}
                  height={44}
                  onPress={inviteAllWhatsApp}
                >
                  <XStack alignItems="center" gap={8}>
                    <MessageCircle size={18} color="#fff" />
                    <Text color="#fff" fontSize={13} style={{ ...fonts.bold }}>
                      Alerter l'équipe sur WhatsApp
                    </Text>
                  </XStack>
                </Button>
              )}
            </YStack>

            {/* Liste des membres */}
            <YStack gap={10}>
              <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
                Joueurs de l'équipe ({members.length})
              </Text>

              {members.length === 0 ? (
                <YStack
                  backgroundColor={palette.card}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor={palette.border}
                  padding={20}
                  alignItems="center"
                  gap={8}
                >
                  <Users size={32} color={palette.textMuted} />
                  <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.medium }}>
                    Aucun joueur ajouté pour le moment.
                  </Text>
                </YStack>
              ) : (
                members.map((m, idx) => (
                  <XStack
                    key={m.id}
                    justifyContent="space-between"
                    alignItems="center"
                    backgroundColor={palette.card}
                    borderRadius={14}
                    padding={14}
                    borderWidth={1}
                    borderColor={palette.border}
                  >
                    <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${palette.primary}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text color={palette.primary} fontSize={13} style={{ ...fonts.bold }}>
                          #{idx + 1}
                        </Text>
                      </View>
                      <YStack flex={1} minWidth={0} gap={2}>
                        <Text
                          color={palette.text}
                          fontSize={14}
                          numberOfLines={1}
                          style={{ ...fonts.semibold }}
                        >
                          {m.display_name}
                        </Text>
                        <Text color={palette.textMuted} fontSize={12} numberOfLines={1}>
                          {m.phone ? `WhatsApp : ${m.phone}` : 'Numéro non renseigné'}
                        </Text>
                      </YStack>
                    </XStack>

                    <XStack alignItems="center" gap={8}>
                      {m.phone && (
                        <Pressable
                          onPress={() =>
                            void openWhatsAppInvite(
                              `Salut ${m.display_name}, on joue bientôt sur FUTTO ⚽`,
                              m.phone || undefined,
                            )
                          }
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: `${palette.accent}20`,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MessageCircle size={16} color={palette.accent} />
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => void deleteMember(m)}
                        hitSlop={8}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </Pressable>
                    </XStack>
                  </XStack>
                ))
              )}
            </YStack>

            {/* Ajouter un membre */}
            <YStack
              backgroundColor={palette.card}
              borderRadius={18}
              borderWidth={1}
              borderColor={palette.border}
              padding={16}
              gap={12}
            >
              <Text color={palette.text} fontSize={15} style={{ ...fonts.bold }}>
                Ajouter un coéquipier
              </Text>

              <Input
                value={memberName}
                onChangeText={setMemberName}
                placeholder="Nom ou pseudo du joueur"
                backgroundColor={palette.cardElevated}
                borderColor={palette.border}
                color={palette.text}
                borderRadius={12}
                height={48}
              />

              <Input
                value={memberPhone}
                onChangeText={setMemberPhone}
                placeholder="Numéro WhatsApp (ex. 22507000000)"
                keyboardType="phone-pad"
                backgroundColor={palette.cardElevated}
                borderColor={palette.border}
                color={palette.text}
                borderRadius={12}
                height={48}
              />

              <Button
                backgroundColor={palette.primary}
                borderRadius={12}
                height={46}
                disabled={busy || !memberName.trim()}
                onPress={() => void addMember()}
              >
                <XStack alignItems="center" gap={6}>
                  <Plus size={18} color="#fff" />
                  <Text color="#fff" style={{ ...fonts.bold }}>
                    Ajouter à l'équipe
                  </Text>
                </XStack>
              </Button>
            </YStack>
          </>
        )}
      </ScrollView>
    </YStack>
  )
}
