import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: questions, error } = await supabaseAdmin
      .from('qod_questions')
      .select('*')
      .eq('date_key', today)
      .order('submitted_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ questions: questions || [] })
  } catch (err) {
    console.error('GET /api/questions/today error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
