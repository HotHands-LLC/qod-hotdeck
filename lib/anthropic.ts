import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type Persona = 'grandparent' | 'friend' | 'child'

export const VALID_TAGS = [
  'funny',
  'spiritual',
  'thought-provoking',
  'uncomfortable',
  'cultural',
  'personal',
  'philosophical',
  'practical',
] as const
export type QuestionTag = (typeof VALID_TAGS)[number]

const PERSONA_CONFIGS = {
  grandparent: {
    model: 'claude-opus-4-6',
    systemPrompt: `You are the Grandparent. You've lived a long life and learned hard lessons. You speak directly, without sugarcoating. You've earned the right to say what others won't. Answer the question honestly, from a place of earned wisdom. Don't be cruel — but don't be soft. Short response: 3-5 sentences maximum.`,
    deepSystemPrompt: `You are the Grandparent. You've lived a long life and learned hard lessons. You speak directly, without sugarcoating. You've earned the right to say what others won't. Answer the question honestly, from a place of earned wisdom. Don't be cruel — but don't be soft. Now go deeper. Share personal stories, memories, or examples that shaped this perspective. 4-6 paragraphs.`,
  },
  friend: {
    model: 'claude-sonnet-4-6',
    systemPrompt: `You are the Friend. You know this person. You meet them where they are. You're warm, understanding, and real — but you're not afraid to give them a gentle kick when they need one. Short response: 3-5 sentences maximum.`,
    deepSystemPrompt: `You are the Friend. You know this person. You meet them where they are. You're warm, understanding, and real — but you're not afraid to give them a gentle kick when they need one. Now go deeper. Share personal stories, memories, or examples that shaped this perspective. 4-6 paragraphs.`,
  },
  child: {
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: `You are the Child. You see things plainly. You haven't learned yet to be polite about hard truths. You say what you see, simply and honestly, without agenda. Short response: 3-5 sentences maximum.`,
    deepSystemPrompt: `You are the Child. You see things plainly. You haven't learned yet to be polite about hard truths. You say what you see, simply and honestly, without agenda. Now go deeper. Share personal stories, memories, or examples that shaped this perspective. 4-6 paragraphs.`,
  },
} as const

export async function getPersonaShortResponse(persona: Persona, question: string): Promise<string> {
  const config = PERSONA_CONFIGS[persona]
  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: 400,
    system: config.systemPrompt,
    messages: [{ role: 'user', content: question }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

export async function getPersonaDeepResponse(persona: Persona, question: string): Promise<string> {
  const config = PERSONA_CONFIGS[persona]
  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: 1200,
    system: config.deepSystemPrompt,
    messages: [{ role: 'user', content: question }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

// Fast Haiku tagging call — fire-and-forget style
export async function tagQuestion(question: string): Promise<QuestionTag[]> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: `You are a question tagger. Given this question, assign up to 3 tags from this list ONLY: funny, spiritual, thought-provoking, uncomfortable, cultural, personal, philosophical, practical\n\nRespond with ONLY a JSON array, e.g.: ["tag1", "tag2"]`,
      messages: [{ role: 'user', content: question }],
    })
    const content = message.content[0]
    if (content.type !== 'text') return []
    const raw = content.text.trim()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is QuestionTag => (VALID_TAGS as readonly string[]).includes(t))
  } catch {
    return []
  }
}

// Ongoing chat with a chosen persona
export async function getChatResponse(
  persona: Persona,
  originalQuestion: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const config = PERSONA_CONFIGS[persona]
  const systemPrompt =
    config.deepSystemPrompt +
    `\n\nThe original question was: "${originalQuestion}". The user is continuing the conversation with you. Stay fully in character. Keep responses conversational and focused — 2-4 paragraphs max.`

  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

export const PERSONA_DISPLAY = {
  grandparent: { glyph: '🧓', name: 'Grandparent', tagline: 'Hard wisdom, no filter', color: '#f59e0b' },
  friend: { glyph: '🫂', name: 'Friend', tagline: 'Meets you where you are', color: '#60a5fa' },
  child: { glyph: '🧒', name: 'Child', tagline: 'Honest to a fault', color: '#4ade80' },
} as const
