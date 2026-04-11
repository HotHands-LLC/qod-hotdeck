import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPersonaDeepResponse, Persona } from '@/lib/anthropic'

const VALID_PERSONAS: Persona[] = ['grandparent', 'friend', 'child']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; persona: string } }
) {
  try {
    const { id, persona } = params

    if (!VALID_PERSONAS.includes(persona as Persona)) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    // Check if deep response already cached
    const { data: existing } = await supabaseAdmin
      .from('qod_responses')
      .select('deep_response, short_response')
      .eq('question_id', id)
      .eq('persona', persona)
      .single()

    if (existing?.deep_response) {
      return NextResponse.json({ deep_response: existing.deep_response })
    }

    // Get the question
    const { data: questionData } = await supabaseAdmin
      .from('qod_questions')
      .select('question')
      .eq('id', id)
      .single()

    if (!questionData) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Generate deep response
    const deepResponse = await getPersonaDeepResponse(persona as Persona, questionData.question)

    // Cache it
    await supabaseAdmin
      .from('qod_responses')
      .update({ deep_response: deepResponse })
      .eq('question_id', id)
      .eq('persona', persona)

    return NextResponse.json({ deep_response: deepResponse })
  } catch (err) {
    console.error('GET deep-dive error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
