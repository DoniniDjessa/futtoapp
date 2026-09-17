import { useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Text, YStack, Input, Button } from 'tamagui'
import { Image } from 'expo-image'
import { BackHeader } from '@/components/BackHeader'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { uploadCompressedImage } from '@/lib/storage'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import { fonts } from '@/lib/fonts'
import { notifyUser } from '@/lib/push'

/** Créer un tournoi : affiche + commission 10 % avant ouverture. */
export default function CreerTournoiScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const [name, setName] = useState('')
  const [dateLabel, setDateLabel] = useState('')
  const [location, setLocation] = useState('Abidjan')
  const [commissionRate, setCommissionRate] = useState<number>(10)
  const [fee, setFee] = useState('50000')
  const [teamsMax, setTeamsMax] = useState('8')
  const [prize, setPrize] = useState('')
  const [posterUri, setPosterUri] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Charger le taux de commission défini dans le backoffice
  useEffect(() => {
    if (!supabase) return
    supabase
      .from(T.platformSettings)
      .select('value')
      .eq('key', 'tournament_commission')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value != null) {
          const val = Number(data.value)
          if (!isNaN(val) && val >= 0) {
            setCommissionRate(val)
          }
        }
      })
  }, [])

  const feeN = Number(fee) || 0
  const commission = Math.round(feeN * (commissionRate / 100))

  async function pickPoster() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (!res.canceled && res.assets[0]?.uri) setPosterUri(res.assets[0].uri)
  }

  async function submit() {
    if (!supabase || !user) return
    if (!name.trim()) {
      Alert.alert('Tournoi', 'Nom requis.')
      return
    }
    setBusy(true)
    try {
      let poster_url: string | null = null
      if (posterUri) {
        const up = await uploadCompressedImage({
          uri: posterUri,
          kind: 'tournaments',
          userId: user.id,
        })
        poster_url = up.publicUrl
      }

      if (commission > 0) {
        const { error: debitErr } = await supabase.rpc('futto_wallet_debit', {
          p_amount: commission,
          p_kind: 'participation',
          p_label: `Commission tournoi ${commissionRate} % — ${name.trim()}`,
          p_provider: 'cash',
        })
        if (debitErr) throw debitErr
      }

      const { data, error } = await supabase
        .from(T.tournaments)
        .insert({
          name: name.trim(),
          date_label: dateLabel.trim() || null,
          location: location.trim() || null,
          teams: 0,
          teams_max: Number(teamsMax) || 8,
          fee_fcfa: feeN,
          prize: prize.trim() || null,
          status: 'open',
          poster_url,
          organizer_id: user.id,
          commission_paid: true,
        })
        .select('id')
        .single()
      if (error) throw error

      void notifyUser({
        profileId: user.id,
        title: 'Tournoi créé avec succès ! 🏆',
        body: `Ton tournoi « ${name.trim()} » est désormais ouvert aux inscriptions.`,
        kind: 'tournament',
        data: { tournament_id: data.id },
      })

      Alert.alert('Tournoi ouvert', `Commission ${commissionRate} % payée — tournoi visible.`, [
        { text: 'OK', onPress: () => router.replace('/tournois' as any) },
      ])
      return data
    } catch (e) {
      Alert.alert('Tournoi', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Organiser un tournoi" backHref="/tournois" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text color={palette.textMuted} fontSize={13} style={{ ...fonts.regular }}>
          Tu paies une commission de {commissionRate} % sur les frais d’inscription avant d’ouvrir le tournoi.
        </Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Nom du tournoi"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />
        <Input
          value={dateLabel}
          onChangeText={setDateLabel}
          placeholder="Dates (ex. 12–14 avril)"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />
        <Input
          value={location}
          onChangeText={setLocation}
          placeholder="Lieu"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />
        <Input
          value={fee}
          onChangeText={setFee}
          placeholder="Frais / équipe (FCFA)"
          keyboardType="number-pad"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />
        <Input
          value={teamsMax}
          onChangeText={setTeamsMax}
          placeholder="Nb max équipes"
          keyboardType="number-pad"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />
        <Input
          value={prize}
          onChangeText={setPrize}
          placeholder="Dotation"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          placeholderTextColor={palette.textMuted}
          borderRadius={14}
          height={52}
        />

        <Button backgroundColor={palette.cardElevated} borderRadius={12} onPress={() => void pickPoster()}>
          <Text color={palette.text} style={{ ...fonts.semibold }}>
            {posterUri ? 'Changer l’affiche' : 'Importer une affiche'}
          </Text>
        </Button>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={{ width: '100%', height: 180, borderRadius: 14 }} contentFit="cover" />
        ) : null}

        <Text color={palette.gold} fontFamily="$heading" fontSize={18}>
          Commission {commissionRate} % : {commission.toLocaleString('fr-FR')} FCFA
        </Text>

        <Button
          backgroundColor={palette.primary}
          borderRadius={14}
          height={52}
          disabled={busy}
          onPress={() => void submit()}
        >
          <Text color="#fff" style={{ ...fonts.bold }}>
            {busy ? '…' : 'Payer la commission & ouvrir'}
          </Text>
        </Button>
      </ScrollView>
    </YStack>
  )
}
