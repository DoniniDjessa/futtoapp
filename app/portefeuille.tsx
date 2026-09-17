import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { Stack } from 'expo-router'
import { Text, YStack, XStack, Button, Input } from 'tamagui'
import { useAuth } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors, formatFCFA } from '@/lib/theme'
import { fonts } from '@/lib/fonts'

type Tx = {
  id: string
  amount_fcfa: number
  kind: string
  label: string | null
  provider: string | null
  created_at: string
}

export default function PortefeuilleScreen() {
  const { user } = useAuth()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const [balance, setBalance] = useState(0)
  const [txs, setTxs] = useState<Tx[]>([])
  const [amount, setAmount] = useState('2000')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user) return
    const [{ data: acc }, { data: list }] = await Promise.all([
      supabase.from(T.walletAccounts).select('balance_fcfa').eq('profile_id', user.id).maybeSingle(),
      supabase
        .from(T.walletTransactions)
        .select('id, amount_fcfa, kind, label, provider, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])
    setBalance(acc?.balance_fcfa ?? 0)
    setTxs((list as Tx[]) ?? [])
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function recharge(provider: string) {
    if (!supabase) return
    const n = Number(amount)
    if (!(n >= 100)) {
      Alert.alert('Montant', 'Minimum 100 FCFA.')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('futto_wallet_recharge', {
      p_amount: n,
      p_provider: provider,
      p_label: `Recharge ${provider}`,
    })
    setBusy(false)
    if (error) Alert.alert('Recharge', error.message)
    else {
      if (user) {
        void notifyUser({
          profileId: user.id,
          title: 'Portefeuille rechargé 💰',
          body: `Votre recharge de ${formatFCFA(n)} via ${provider.toUpperCase()} a été créditée avec succès.`,
          kind: 'wallet',
          data: { amount: n, provider },
        })
      }
      Alert.alert('OK', 'Recharge enregistrée (manuel V1).')
      await load()
    }
  }

  return (
    <YStack flex={1} backgroundColor={palette.bg}>
      <Stack.Screen
        options={{
          title: 'Portefeuille',
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <YStack
          backgroundColor={palette.card}
          borderRadius={16}
          padding={20}
          borderWidth={1}
          borderColor={palette.border}
          alignItems="center"
          gap={6}
        >
          <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.medium }}>
            Solde réel
          </Text>
          <Text color={palette.gold} fontFamily="$heading" fontSize={36}>
            {formatFCFA(balance)}
          </Text>
        </YStack>

        <Text color={palette.textMuted} fontSize={12} style={{ ...fonts.regular }}>
          V1 : recharge manuelle tracée (pas encore d’API OM/MTN/Wave). Requis pour rejoindre un
          match en adhésion.
        </Text>

        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Montant"
          backgroundColor={palette.card}
          borderColor={palette.border}
          color={palette.text}
          borderRadius={14}
          height={52}
        />

        <XStack gap={8} flexWrap="wrap">
          {(['wave', 'orange', 'mtn', 'cash'] as const).map((p) => (
            <Button
              key={p}
              flex={1}
              minWidth="40%"
              backgroundColor={palette.primary}
              borderRadius={12}
              disabled={busy}
              onPress={() => void recharge(p)}
            >
              <Text color="#fff" style={{ ...fonts.bold }}>
                {p.toUpperCase()}
              </Text>
            </Button>
          ))}
        </XStack>

        <Text color={palette.text} marginTop={8} style={{ ...fonts.semibold }}>
          Historique
        </Text>
        {txs.length === 0 ? (
          <Text color={palette.textMuted} style={{ ...fonts.regular }}>
            Aucune transaction.
          </Text>
        ) : (
          txs.map((t) => (
            <XStack
              key={t.id}
              justifyContent="space-between"
              paddingVertical={10}
              borderBottomWidth={1}
              borderBottomColor={palette.border}
            >
              <YStack flex={1}>
                <Text color={palette.text} style={{ ...fonts.medium }}>
                  {t.label || t.kind}
                </Text>
                <Text color={palette.textMuted} fontSize={11}>
                  {new Date(t.created_at).toLocaleString('fr-FR')}
                  {t.provider ? ` · ${t.provider}` : ''}
                </Text>
              </YStack>
              <Text
                color={t.amount_fcfa >= 0 ? palette.primary : palette.accent}
                style={{ ...fonts.bold }}
              >
                {t.amount_fcfa >= 0 ? '+' : ''}
                {formatFCFA(t.amount_fcfa)}
              </Text>
            </XStack>
          ))
        )}
      </ScrollView>
    </YStack>
  )
}
