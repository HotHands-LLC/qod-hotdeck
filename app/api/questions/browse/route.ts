import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Fetch public-safe columns only — exclude user_ip, moderated questions
    const [{ data: questions }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from('qod_questions')
        .select('id, question, vote_count, tags, nickname, submitted_at')
        .eq('date_key', today)
        .eq('is_moderated', false)
        .order('vote_count', { ascending: false }),
      supabaseAdmin
        .from('qod_settings')
        .select('key, value')
        .in('key', [
          'category_tab_most_voted',
          'category_tab_funny',
          'category_tab_spiritual',
          'category_tab_thought_provoking',
          'category_tab_uncomfortable',
        ]),
    ])

    const settingsMap: Record<string, boolean> = {}
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value === 'true'
    })

    const enabledTabs = {
      most_voted: settingsMap['category_tab_most_voted'] ?? true,
      funny: settingsMap['category_tab_funny'] ?? true,
      spiritual: settingsMap['category_tab_spiritual'] ?? true,
      thought_provoking: settingsMap['category_tab_thought_provoking'] ?? true,
      uncomfortable: settingsMap['category_tab_uncomfortable'] ?? true,
    }

    return NextResponse.json({
      questions: questions || [],
      enabledTabs,
    })
  } catch (err) {
    console.error('GET /api/questions/browse error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
