import Constants from 'expo-constants'

type Extra = {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

const DEFAULT_SUPABASE_URL = 'https://tfcnforazrpfnrwtlisc.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmY25mb3JhenJwZm5yd3RsaXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0OTA3ODIsImV4cCI6MjEwNDA2Njc4Mn0.lXYnK0fkrKdnAN8Ugvf4pY9X5rUH0FDClehm33o8tHk'

export const env = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    DEFAULT_SUPABASE_URL,
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    DEFAULT_SUPABASE_ANON_KEY,
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}
