import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getChatResponse, Persona } from '@/lib/anthropic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question_id, persona, messages, nickname, chat_id } = body as {
      question_id: string
      persona: Persona
      messages: ChatMessage[]
      nickname?: string
      chat_id?: string
    }

    if (!question_id || !persona || !messages || messages.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validPersonas: Persona[] = ['grandparent', 'friend', 'child']
    if (!validPersonas.includes(persona)) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    // Fetch the original question text
    const { data: questionRow } = await supabaseAdmin
      .from('qod_questions')
      .select('question')
      .eq('id', question_id)
      .single()

    if (!questionRow) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Call Claude with persona system prompt + message history
    const claudeMessages = messages.map((m) => ({ role: m.role, content: m.content }))
    const response = await getChatResponse(persona, questionRow.question, claudeMessages)

    // Append AI response to the full history for storage
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: response, timestamp: new Date().toISOString() },
    ]

    let chatId = chat_id
    if (chatId) {
      await supabaseAdmin
        .from('qod_chats')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', chatId)
    } else {
      const { data: newChat } = await supabaseAdmin
        .from('qod_chats')
        .insert({
          question_id,
          persona,
          nickname: nickname || null,
          messages: updatedMessages,
        })
        .select('id')
        .single()
      chatId = newChat?.id
    }

    return NextResponse.json({ response, chat_id: chatId })
  } catch (err) {
    console.error('POST /api/chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
