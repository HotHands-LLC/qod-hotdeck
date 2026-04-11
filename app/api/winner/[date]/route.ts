import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    let { date } = params

    // If 'yesterday', compute it
    if (date === 'yesterday') {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      date = d.toISOString().split('T')[0]
    }

    // Get winner or featured question for this date
    const { data: question } = await supabaseAdmin
      .from('qod_questions')
      .select('*')
      .eq('date_key', date)
      .or('is_winner.eq.true,is_featured.eq.true')
      .order('vote_count', { ascending: false })
      .limit(1)
      .single()

    if (!question) {
      return NextResponse.json({ winner: null })
    }

    // Get all 3 responses
    const { data: responses } = await supabaseAdmin
      .from('qod_responses')
      .select('*')
      .eq('question_id', question.id)

    return NextResponse.json({ winner: question, responses: responses || [] })
  } catch (err) {
    console.error('GET /api/winner error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
