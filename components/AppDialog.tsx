import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { Text, YStack } from 'tamagui'
import { colors, lightColors } from '@/lib/theme'
import { useThemeMode } from '@/lib/theme-mode'
import { fonts } from '@/lib/fonts'

export type DialogAction = {
  label: string
  tone?: 'cancel' | 'primary' | 'danger'
  onPress?: () => void
}

type DialogState = {
  title: string
  message?: string
  actions: DialogAction[]
}

type AppDialogValue = {
  show: (state: DialogState) => void
  confirm: (options: {
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
  }) => Promise<boolean>
  showDialog: (options: {
    title: string
    message?: string
    confirmText?: string
    onConfirm?: () => void
    cancelText?: string
    onCancel?: () => void
    destructive?: boolean
  }) => void
}

const AppDialogContext = createContext<AppDialogValue | null>(null)

export function useAppDialog() {
  const ctx = useContext(AppDialogContext)
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider')
  }
  return ctx
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors

  const close = useCallback((accepted = false) => {
    resolver.current?.(accepted)
    resolver.current = null
    setState(null)
  }, [])

  const show = useCallback((next: DialogState) => {
    resolver.current?.(false)
    resolver.current = null
    setState(next)
  }, [])

  const confirm = useCallback(
    ({
      title,
      message,
      confirmLabel = 'Confirmer',
      cancelLabel = 'Annuler',
      destructive,
    }: {
      title: string
      message?: string
      confirmLabel?: string
      cancelLabel?: string
      destructive?: boolean
    }) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setState({
          title,
          message,
          actions: [
            {
              label: cancelLabel,
              tone: 'cancel',
              onPress: () => resolve(false),
            },
            {
              label: confirmLabel,
              tone: destructive ? 'danger' : 'primary',
              onPress: () => resolve(true),
            },
          ],
        })
      }),
    [],
  )

  const showDialog = useCallback(
    ({
      title,
      message,
      confirmText = 'OK',
      onConfirm,
      cancelText,
      onCancel,
      destructive,
    }: {
      title: string
      message?: string
      confirmText?: string
      onConfirm?: () => void
      cancelText?: string
      onCancel?: () => void
      destructive?: boolean
    }) => {
      const actions: DialogAction[] = []
      if (cancelText) {
        actions.push({
          label: cancelText,
          tone: 'cancel',
          onPress: () => {
            close(false)
            onCancel?.()
          },
        })
      }
      actions.push({
        label: confirmText,
        tone: destructive ? 'danger' : 'primary',
        onPress: () => {
          close(true)
          onConfirm?.()
        },
      })
      show({ title, message, actions })
    },
    [show, close],
  )

  const value = useMemo(() => ({ show, confirm, showDialog }), [show, confirm, showDialog])

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(state)}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable
          onPress={() => close(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360 }}
          >
            <YStack
              backgroundColor={palette.card}
              borderRadius={24}
              borderWidth={1}
              borderColor={palette.border}
              padding={22}
              gap={12}
              elevation={12}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 8 }}
              shadowOpacity={0.3}
              shadowRadius={16}
            >
              <Text
                style={{
                  ...fonts.bold,
                  fontSize: 18,
                  color: palette.text,
                  textAlign: 'center',
                }}
              >
                {state?.title}
              </Text>

              {state?.message ? (
                <Text
                  style={{
                    ...fonts.regular,
                    fontSize: 14,
                    color: palette.textMuted,
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  {state.message}
                </Text>
              ) : null}

              <YStack gap={8} marginTop={8}>
                {state?.actions.map((action) => {
                  const isDanger = action.tone === 'danger'
                  const isPrimary = action.tone === 'primary'

                  let btnBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#F1F5F9'
                  let btnColor: string = palette.text
                  let btnBorder = 'transparent'

                  if (isPrimary) {
                    btnBg = palette.primary
                    btnColor = '#FFFFFF'
                  } else if (isDanger) {
                    btnBg = mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'
                    btnColor = '#EF4444'
                    btnBorder = mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'transparent'
                  }

                  return (
                    <Pressable
                      key={action.label}
                      onPress={() => {
                        action.onPress?.()
                        resolver.current = null
                        setState(null)
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <View
                        style={{
                          height: 46,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: btnBg,
                          borderWidth: isDanger && mode === 'dark' ? 1 : 0,
                          borderColor: btnBorder,
                        }}
                      >
                        <Text
                          style={{
                            ...fonts.semibold,
                            fontSize: 14,
                            color: btnColor,
                          }}
                        >
                          {action.label}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </YStack>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </AppDialogContext.Provider>
  )
}
