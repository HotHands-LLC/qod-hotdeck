import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client (server-side only — never expose to browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Persona = 'grandparent' | 'friend' | 'child'

export interface Question {
  id: string
  question: string
  user_email: string | null
  user_ip: string | null
  submitted_at: string
  date_key: string
  vote_count: number
  is_winner: boolean
  is_featured: boolean
  is_moderated: boolean
}

export interface Response {
  id: string
  question_id: string
  persona: Persona
  short_response: string
  deep_response: string | null
  created_at: string
}

export interface Settings {
  [key: string]: string
}
