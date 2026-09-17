import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter } from 'expo-router'
import { AlertCircle, Check } from 'lucide-react-native'
import { Text, YStack, XStack, Input, Button } from 'tamagui'
import { AuthFormShell, AuthPasswordField, authField } from '@/components/AuthFormShell'
import { fonts } from '@/lib/fonts'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/tables'
import { colors } from '@/lib/theme'

type PseudoStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function RegisterScreen() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [pseudoStatus, setPseudoStatus] = useState<PseudoStatus>('idle')
  const [pseudoMessage, setPseudoMessage] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Vérification d'unicité en temps réel (débouncée)
  useEffect(() => {
    const clean = pseudo.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    if (!clean) {
      setPseudoStatus('idle')
      setPseudoMessage(null)
      return
    }
    if (clean.length < 3) {
      setPseudoStatus('invalid')
      setPseudoMessage('3 caractères minimum (lettres, chiffres, . _ -)')
      return
    }

    setPseudoStatus('checking')
    setPseudoMessage('Vérification de la disponibilité…')

    const timer = setTimeout(async () => {
      try {
        if (!supabase) {
          setPseudoStatus('idle')
          setPseudoMessage(null)
          return
        }
        const { data: taken, error: checkErr } = await supabase
          .from(T.profiles)
          .select('id')
          .ilike('pseudo', clean)
          .maybeSingle()

        if (checkErr) {
          setPseudoStatus('idle')
          setPseudoMessage(null)
          return
        }

        if (taken) {
          setPseudoStatus('taken')
          setPseudoMessage('Ce pseudo est déjà pris.')
        } else {
          setPseudoStatus('available')
          setPseudoMessage('✓ Pseudo disponible !')
        }
      } catch {
        setPseudoStatus('idle')
        setPseudoMessage(null)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [pseudo])

  async function onSubmit() {
    if (pseudoStatus === 'taken') {
      setError('Ce pseudo est déjà pris. Choisis-en un autre.')
      return
    }
    if (pseudoStatus === 'invalid') {
      setError('Pseudo : 3 caractères minimum (lettres, chiffres, . _ -).')
      return
    }

    setBusy(true)
    setError(null)
    const cleanPseudo = pseudo.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    const res = await signUp({ email, password, fullName, pseudo: cleanPseudo })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    router.replace('/permissions')
  }

  return (
    <AuthFormShell
      title="Inscription"
      subtitle="Crée ton compte joueur pour coller des matchs sur de vrais terrains."
      oppositeLabel="Connexion"
      oppositeHref="/login"
    >
      {error ? (
        <YStack backgroundColor="rgba(220,38,38,0.1)" padding="$3" borderRadius={14}>
          <Text color="#b91c1c" style={{ ...fonts.medium }} textAlign="center">
            {error}
          </Text>
        </YStack>
      ) : null}

      <Input
        value={fullName}
        onChangeText={setFullName}
        placeholder="Nom complet"
        autoComplete="name"
        {...authField}
      />

      <YStack gap={6}>
        <Input
          value={pseudo}
          onChangeText={setPseudo}
          placeholder="Pseudo (ex. koffi_07)"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType="email-address"
          {...authField}
        />
        {pseudoMessage ? (
          <XStack alignItems="center" gap={6} paddingHorizontal={8}>
            {pseudoStatus === 'checking' ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : pseudoStatus === 'available' ? (
              <Check size={14} color="#00b14f" strokeWidth={2.5} />
            ) : (
              <AlertCircle size={14} color="#b91c1c" strokeWidth={2.5} />
            )}
            <Text
              fontSize={12}
              style={{ ...fonts.medium }}
              color={
                pseudoStatus === 'available'
                  ? '#00b14f'
                  : pseudoStatus === 'checking'
                    ? '#6b7280'
                    : '#b91c1c'
              }
            >
              {pseudoMessage}
            </Text>
          </XStack>
        ) : null}
      </YStack>

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
        placeholder="Mot de passe (6+)"
        autoComplete="new-password"
      />

      <Button
        marginTop={12}
        backgroundColor={colors.accent}
        color="#fff"
        borderRadius={999}
        height={54}
        disabled={busy || pseudoStatus === 'taken' || pseudoStatus === 'invalid'}
        onPress={() => void onSubmit()}
        opacity={busy || pseudoStatus === 'taken' ? 0.6 : 1}
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
      >
        <Text color="#fff" style={{ ...fonts.bold }} fontSize={16}>
          {busy ? 'Création…' : 'Créer mon compte'}
        </Text>
      </Button>
    </AuthFormShell>
  )
}
