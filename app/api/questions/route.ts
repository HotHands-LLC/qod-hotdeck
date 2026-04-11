import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPersonaShortResponse, Persona } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, email } = body as { question: string; email?: string }

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from('qod_settings')
      .select('key, value')

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s) => { settingsMap[s.key] = s.value })

    if (settingsMap['submissions_open'] === 'false') {
      return NextResponse.json({ error: 'Submissions are closed for today' }, { status: 403 })
    }

    // Rate limiting
    const userIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
    const rateMode = settingsMap['rate_limit_mode'] || 'ip'
    const dailyLimit = parseInt(settingsMap['questions_per_day_limit'] || '1')
    const today = new Date().toISOString().split('T')[0]

    if (rateMode !== 'honor') {
      let query = supabaseAdmin
        .from('qod_questions')
        .select('id', { count: 'exact' })
        .eq('date_key', today)

      if (rateMode === 'ip') {
        query = query.eq('user_ip', userIp)
      } else if (rateMode === 'account' && email) {
        query = query.eq('user_email', email)
      }

      const { count } = await query
      if ((count || 0) >= dailyLimit) {
        return NextResponse.json(
          { error: 'You have already submitted your question for today' },
          { status: 429 }
        )
      }
    }

    // Insert question
    const { data: qData, error: qErr } = await supabaseAdmin
      .from('qod_questions')
      .insert({ question: question.trim(), user_email: email || null, user_ip: userIp })
      .select()
      .single()

    if (qErr || !qData) {
      console.error('Insert error:', qErr)
      return NextResponse.json({ error: 'Failed to save question' }, { status: 500 })
    }

    // Fire 3 parallel Anthropic calls
    const personas: Persona[] = ['grandparent', 'friend', 'child']
    const responses = await Promise.all(
      personas.map((persona) => getPersonaShortResponse(persona, question.trim()))
    )

    // Store all 3 responses
    const responseInserts = personas.map((persona, i) => ({
      question_id: qData.id,
      persona,
      short_response: responses[i],
    }))

    const { error: rErr } = await supabaseAdmin
      .from('qod_responses')
      .insert(responseInserts)

    if (rErr) {
      console.error('Response insert error:', rErr)
    }

    return NextResponse.json({
      question_id: qData.id,
      question: qData.question,
      responses: personas.map((persona, i) => ({
        persona,
        short_response: responses[i],
      })),
    })
  } catch (err) {
    console.error('POST /api/questions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
