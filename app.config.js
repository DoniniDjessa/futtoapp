const fs = require('fs')
const path = require('path')

function loadEnvLocal() {
  const file = path.join(__dirname, '.env.local')
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const DEFAULT_SUPABASE_URL = 'https://tfcnforazrpfnrwtlisc.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmY25mb3JhenJwZm5yd3RsaXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0OTA3ODIsImV4cCI6MjEwNDA2Njc4Mn0.lXYnK0fkrKdnAN8Ugvf4pY9X5rUH0FDClehm33o8tHk'

const file = loadEnvLocal()
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  file.EXPO_PUBLIC_SUPABASE_URL ||
  file.NEXT_PUBLIC_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  file.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  file.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY

if (supabaseUrl) process.env.EXPO_PUBLIC_SUPABASE_URL = supabaseUrl
if (supabaseAnonKey) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey

module.exports = ({ config }) => ({
  ...config,
  name: 'FUTTO',
  slug: 'futto',
  scheme: 'futto',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.rixxelstudio.futto',
  },
  android: {
    ...config.android,
    package: 'com.rixxelstudio.futto',
    googleServicesFile: './google-services.json',
  },
  extra: {
    ...config.extra,
    supabaseUrl: supabaseUrl || config.extra?.supabaseUrl || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: supabaseAnonKey || config.extra?.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY,
  },
})
