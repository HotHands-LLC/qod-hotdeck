import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type Persona = 'grandparent' | 'friend' | 'child'

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

export const PERSONA_DISPLAY = {
  grandparent: { glyph: '🧓', name: 'Grandparent', tagline: 'Hard wisdom, no filter', color: '#f59e0b' },
  friend: { glyph: '🫂', name: 'Friend', tagline: 'Meets you where you are', color: '#60a5fa' },
  child: { glyph: '🧒', name: 'Child', tagline: 'Honest to a fault', color: '#4ade80' },
} as const
