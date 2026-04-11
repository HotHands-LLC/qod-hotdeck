import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (!auth) return false
  const [type, token] = auth.split(' ')
  if (type !== 'Bearer') return false
  return token === process.env.ADMIN_PASSWORD
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, updates } = body as { id: string; updates: Record<string, boolean> }

    if (!id || !updates) {
      return NextResponse.json({ error: 'id and updates are required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('qod_questions')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/admin/questions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
