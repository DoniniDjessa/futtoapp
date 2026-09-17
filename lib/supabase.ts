import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { env, isSupabaseConfigured } from './env'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return Promise.resolve(localStorage.getItem(key))
      } catch {
        return Promise.resolve(null)
      }
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value)
      } catch {
        /* ignore */
      }
      return Promise.resolve()
    }
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
      return Promise.resolve()
    }
    return SecureStore.deleteItemAsync(key)
  },
}

export const supabase = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null
