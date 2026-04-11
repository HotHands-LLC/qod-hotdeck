import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const { data: chats, error, count } = await supabaseAdmin
      .from('qod_chats')
      .select(`
        id,
        persona,
        nickname,
        user_email,
        messages,
        created_at,
        updated_at,
        question_id,
        qod_questions!inner(question)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
    }

    return NextResponse.json({ chats: chats || [], total: count || 0 })
  } catch (err) {
    console.error('GET /api/admin/chats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
