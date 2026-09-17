import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ThemeMode } from './theme'

type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const KEY = 'futto-theme-mode'
const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Dark by default (flow.md + FORMULATION) */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setModeState(v)
      })
      .finally(() => setReady(true))
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    AsyncStorage.setItem(KEY, next).catch(() => undefined)
  }, [])

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const value = useMemo(
    () => ({ mode, setMode, toggle }),
    [mode, setMode, toggle],
  )

  if (!ready) return null

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { mode: 'dark' as const, setMode: () => {}, toggle: () => {} }
  }
  return ctx
}
