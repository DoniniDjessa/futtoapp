import { useState } from 'react'
import { Alert, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Text, YStack, Input, Button } from 'tamagui'
import { AuthFormShell, AuthPasswordField, authField } from '@/components/AuthFormShell'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await signIn(email, password)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    router.replace('/(tabs)')
  }

  return (
    <AuthFormShell
      title="Connexion"
      subtitle="Entre ton email et ton mot de passe pour retrouver tes matchs."
      oppositeLabel="S’inscrire"
      oppositeHref="/register"
    >
      {error ? (
        <YStack
          backgroundColor="rgba(220,38,38,0.1)"
          padding="$3"
          borderRadius={14}
        >
          <Text color="#b91c1c" style={{ ...fonts.medium }} textAlign="center">
            {error}
          </Text>
        </YStack>
      ) : null}

      <Input
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        {...authField}
      />
      <AuthPasswordField
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        autoComplete="password"
      />

      <Pressable
        onPress={async () => {
          if (!email.trim()) {
            Alert.alert('Email', 'Entre ton email d’abord.')
            return
          }
          const { supabase } = await import('@/lib/supabase')
          if (!supabase) return
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
          if (error) Alert.alert('Reset', error.message)
          else
            Alert.alert(
              'Email envoyé',
              'Si un compte existe pour cet email, tu recevras un lien de réinitialisation.',
            )
        }}
        style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
      >
        <Text color="#6b7280" style={{ ...fonts.medium }} fontSize={13}>
          Mot de passe oublié ?
        </Text>
      </Pressable>

      <Button
        marginTop={8}
        backgroundColor={colors.accent}
        color="#fff"
        borderRadius={999}
        height={54}
        disabled={busy}
        onPress={() => void onSubmit()}
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
      >
        <Text color="#fff" style={{ ...fonts.bold }} fontSize={16}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Text>
      </Button>
    </AuthFormShell>
  )
}
