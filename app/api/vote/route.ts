import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question_id, email } = body as { question_id: string; email?: string }

    if (!question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }

    // Check voting is open
    const { data: votingSetting } = await supabaseAdmin
      .from('qod_settings')
      .select('value')
      .eq('key', 'voting_open')
      .single()

    if (votingSetting?.value !== 'true') {
      return NextResponse.json({ error: 'Voting is not open' }, { status: 403 })
    }

    const voterIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown'

    // Insert vote
    const { error: vErr } = await supabaseAdmin
      .from('qod_votes')
      .insert({ question_id, voter_email: email || null, voter_ip: voterIp })

    if (vErr) {
      console.error('Vote insert error:', vErr)
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
    }

    // Increment vote_count
    await supabaseAdmin.rpc('increment_vote_count', { question_id })

    // Fallback manual increment if RPC doesn't exist
    const { data: q } = await supabaseAdmin
      .from('qod_questions')
      .select('vote_count')
      .eq('id', question_id)
      .single()

    if (q) {
      await supabaseAdmin
        .from('qod_questions')
        .update({ vote_count: (q.vote_count || 0) + 1 })
        .eq('id', question_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/vote error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
