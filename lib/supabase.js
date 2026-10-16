import { createClient } from '@supabase/supabase-js'

// Os valores padrão só evitam erro durante o build; em produção use as variáveis de ambiente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exemplo.supabase.co'
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'chave-ausente'

export const supabase = createClient(url, chave)
