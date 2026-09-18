const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

function loadEnvLocal() {
  const file = './.env.local'
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

const env = loadEnvLocal()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('futto_tournaments').insert({
    name: 'TEST_COLUMNS',
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString()
  }).select('*').single()
  
  if (error) {
    console.error('Insert error:', error.message)
  } else {
    console.log('Inserted data:', data)
    await supabase.from('futto_tournaments').delete().eq('id', data.id)
  }
}
run()
