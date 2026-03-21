import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  const missingEnvKeys = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean) as string[]
  throw new Error(
    `Missing Supabase environment variables: ${missingEnvKeys.join(', ')}. ` +
      'Create `.env.local` from `.env.example` and set both values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// 타입 정의는 나중에 추가 예정
export type Database = {
  public: {
    Tables: Record<string, never>
    // TODO: 타입 정의 추가
  }
}
