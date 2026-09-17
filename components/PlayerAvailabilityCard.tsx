import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { CheckCircle2, PauseCircle, UserCheck, UserX } from 'lucide-react-native'
import { Text, YStack, XStack } from 'tamagui'
import { fonts } from '@/lib/fonts'
import { colors, lightColors } from '@/lib/theme'

type Props = {
  isAvailable: boolean
  palette: typeof colors | typeof lightColors
  onToggle: (val: boolean) => Promise<void>
}

export function PlayerAvailabilityCard({ isAvailable, palette, onToggle }: Props) {
  const [toggling, setToggling] = useState(false)

  async function handlePress() {
    if (toggling) return
    setToggling(true)
    try {
      await onToggle(!isAvailable)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Pressable onPress={() => void handlePress()}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        borderRadius={20}
        borderWidth={1.5}
        borderColor={isAvailable ? palette.primary : palette.border}
        backgroundColor={isAvailable ? `${palette.primary}12` : palette.card}
        padding={14}
        gap={12}
      >
        <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
          {/* Icône 2D plate avec cercle d'accentuation */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isAvailable ? `${palette.primary}22` : `${palette.textMuted}18`,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: isAvailable ? palette.primary : palette.border,
            }}
          >
            {isAvailable ? (
              <UserCheck size={22} color={palette.primary} strokeWidth={2.2} />
            ) : (
              <UserX size={20} color={palette.textMuted} strokeWidth={2} />
            )}
          </View>

          <YStack flex={1} minWidth={0} gap={2}>
            <XStack alignItems="center" gap={6}>
              <Text
                color={isAvailable ? palette.primary : palette.text}
                fontSize={15}
                numberOfLines={1}
                style={{ ...fonts.bold }}
              >
                {isAvailable ? 'Disponible pour jouer' : 'Non disponible'}
              </Text>
              {isAvailable && (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: palette.primary,
                  }}
                />
              )}
            </XStack>
            <Text
              color={palette.textMuted}
              fontSize={12}
              numberOfLines={2}
              style={{ ...fonts.regular }}
            >
              {isAvailable
                ? 'Tu apparais dans la liste des joueurs prêts pour un match !'
                : 'Active ton statut pour signaler aux capitaines que tu es chaud.'}
            </Text>
          </YStack>
        </XStack>

        {/* Switch toggle 2D épuré */}
        <View
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            backgroundColor: isAvailable ? palette.primary : palette.border,
            padding: 2,
            justifyContent: 'center',
            alignItems: isAvailable ? 'flex-end' : 'flex-start',
            opacity: toggling ? 0.6 : 1,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#fff',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 1.5,
            }}
          />
        </View>
      </XStack>
    </Pressable>
  )
}
