import { ReactNode, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native'
import { Text, YStack, XStack, Input } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { colors, toTokenColor } from '@/lib/theme'

type Props = {
  title: string
  subtitle: string
  oppositeLabel: string
  oppositeHref: '/login' | '/register'
  children: ReactNode
}

/** Header brand + feuille blanche arrondie (layout type Sign In mock). */
export function AuthFormShell({
  title,
  subtitle,
  oppositeLabel,
  oppositeHref,
  children,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <YStack flex={1} backgroundColor={colors.authGreen}>
      <Stack.Screen options={{ headerShown: false }} />

      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal={22}
        paddingBottom={28}
      >
        <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <ChevronLeft size={22} color="#fff" strokeWidth={2.4} />
          </Pressable>
          <Pressable onPress={() => router.replace(oppositeHref)} hitSlop={8}>
            <Text color="#fff" style={{ ...fonts.semibold }} fontSize={15}>
              {oppositeLabel}
            </Text>
          </Pressable>
        </XStack>

        <Text fontFamily="$heading" fontSize={34} color="#fff" letterSpacing={0.5}>
          {title}
        </Text>
        <Text
          color="rgba(255,255,255,0.88)"
          marginTop={8}
          fontSize={14}
          lineHeight={20}
          style={{ ...fonts.regular }}
          maxWidth="92%"
        >
          {subtitle}
        </Text>
      </YStack>

      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          marginTop: -8,
          overflow: 'hidden',
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 32,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
              gap: 14,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </YStack>
  )
}

export const authField = {
  backgroundColor: '#f0f2f1',
  borderColor: 'transparent',
  color: '#0d0d0d',
  placeholderTextColor: toTokenColor('#9ca3af'),
  borderRadius: 18,
  height: 54,
  paddingHorizontal: 18,
  textAlign: 'left' as const,
} as const

type PasswordProps = {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  autoComplete?: 'password' | 'new-password'
}

/** Champ mot de passe avec bascule afficher / masquer. */
export function AuthPasswordField({
  value,
  onChangeText,
  placeholder = 'Mot de passe',
  autoComplete = 'password',
}: PasswordProps) {
  const [visible, setVisible] = useState(false)

  return (
    <View style={{ position: 'relative' }}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        {...authField}
        paddingRight={48}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        style={{
          position: 'absolute',
          right: 14,
          top: 0,
          bottom: 0,
          justifyContent: 'center',
        }}
      >
        {visible ? (
          <EyeOff size={20} color="#6b7280" strokeWidth={2} />
        ) : (
          <Eye size={20} color="#6b7280" strokeWidth={2} />
        )}
      </Pressable>
    </View>
  )
}
