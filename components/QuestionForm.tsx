'use client'

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'
import PersonaCard from './PersonaCard'

type Persona = 'grandparent' | 'friend' | 'child'

interface PersonaResponse {
  persona: Persona
  short_response: string
}

interface QuestionResult {
  question_id: string
  question: string
  responses: PersonaResponse[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

const PERSONA_DISPLAY = {
  grandparent: { glyph: '🧓', name: 'Grandparent', color: '#f59e0b' },
  friend: { glyph: '🫂', name: 'Friend', color: '#60a5fa' },
  child: { glyph: '🧒', name: 'Child', color: '#4ade80' },
}

function getLocalStorage(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function setLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function getRapport(): number {
  try {
    return parseInt(localStorage.getItem('qod_rapport') || '0', 10)
  } catch {
    return 0
  }
}

function addRapport(delta: number) {
  try {
    const current = getRapport()
    localStorage.setItem('qod_rapport', String(current + delta))
  } catch {}
}

export default function QuestionForm() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuestionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Que identity state
  const [nickname, setNickname] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [rapportScore, setRapportScore] = useState(0)
  const [nicknameSaved, setNicknameSaved] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  // Chat state
  const [activeChatPersona, setActiveChatPersona] = useState<Persona | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedNickname = getLocalStorage('qod_nickname')
    const storedEmail = getLocalStorage('qod_email')
    const rapport = getRapport()

    setNickname(storedNickname)
    setEmail(storedEmail)
    setRapportScore(rapport)

    // Return visit bonus
    if (storedNickname) {
      addRapport(1)
      setRapportScore(rapport + 1)
    }
  }, [])

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setLoading(true)
    setError(null)
    setResult(null)
    setActiveChatPersona(null)
    setChatMessages([])
    setChatId(null)

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          nickname: nickname || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setResult(data)
      setQuestion('')
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setActiveChatPersona(null)
    setChatMessages([])
    setChatId(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleGoDeeper() {
    addRapport(1)
    setRapportScore((prev) => prev + 1)
  }

  function handleDeepDiveLoaded() {
    addRapport(1)
    setRapportScore((prev) => prev + 1)
  }

  function saveNickname() {
    const name = nicknameInput.trim()
    if (!name) return
    setNickname(name)
    setLocalStorage('qod_nickname', name)
    setNicknameInput('')
    setNicknameSaved(true)
    addRapport(1)
    setRapportScore((prev) => prev + 1)
  }

  function saveEmail() {
    const e = emailInput.trim()
    if (!e || !e.includes('@')) return
    setEmail(e)
    setLocalStorage('qod_email', e)
    setEmailInput('')
    setEmailSaved(true)
  }

  function openChat(persona: Persona) {
    if (activeChatPersona === persona) {
      setActiveChatPersona(null)
      return
    }
    setActiveChatPersona(persona)
    setChatMessages([])
    setChatId(null)
    setChatInput('')
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !result || !activeChatPersona || chatLoading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: result.question_id,
          persona: activeChatPersona,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          nickname: nickname || undefined,
          chat_id: chatId || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const aiMsg: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        }
        setChatMessages([...newMessages, aiMsg])
        setChatId(data.chat_id || null)
      } else {
        setChatMessages([
          ...newMessages,
          { role: 'assistant', content: 'Something went wrong. Try again.' },
        ])
      }
    } catch {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: 'Failed to connect. Try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  function handleChatKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  // Derived state for what Que should show
  const showNicknameAsk = result && !nickname && !nicknameSaved
  const showEmailAsk = result && nickname && !email && !emailSaved && rapportScore >= 3

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!result ? (
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's been on your mind?"
              rows={1}
              autoFocus
              disabled={loading}
              className="w-full bg-transparent border border-[#2a2826] rounded-2xl px-5 py-4 text-[#e8e4d9] placeholder-[#3d3a35] text-lg resize-none focus:outline-none focus:border-[#4a4540] transition-colors duration-200 leading-relaxed"
              style={{
                minHeight: '64px',
                maxHeight: '200px',
                overflow: 'hidden',
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 200) + 'px'
              }}
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 rounded-full border-2 border-[#3d3a35] border-t-[#e8e4d9] animate-spin" />
              </div>
            )}
          </div>

          {loading && (
            <p className="text-center text-[#3d3a35] text-sm mt-4 animate-pulse">
              Asking the Grandparent, the Friend, and the Child...
            </p>
          )}

          {error && (
            <p className="text-center text-red-400/70 text-sm mt-4">{error}</p>
          )}
        </form>
      ) : (
        <div className="w-full">
          {/* The question */}
          <div className="text-center mb-8">
            <p className="text-[#6b6458] text-xs uppercase tracking-widest mb-2">Your question</p>
            <p className="text-[#e8e4d9] text-xl leading-relaxed">{result.question}</p>
          </div>

          {/* 3 persona cards */}
          <div className="flex flex-col gap-4">
            {result.responses.map((r) => (
              <PersonaCard
                key={r.persona}
                persona={r.persona}
                shortResponse={r.short_response}
                questionId={result.question_id}
                animate={true}
                onGoDeeper={handleGoDeeper}
                onDeepDiveLoaded={handleDeepDiveLoaded}
              />
            ))}
          </div>

          {/* Que: Identity capture */}
          {showNicknameAsk && (
            <div className="mt-8 border border-[#2a2826] rounded-2xl p-5">
              <p className="text-[#a89f93] text-sm mb-3 italic">
                Before I go deeper — what can I call you?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveNickname() }}
                  placeholder="A name or nickname"
                  className="flex-1 bg-transparent border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#e8e4d9] placeholder-[#3d3a35] text-sm focus:outline-none focus:border-[#4a4540]"
                />
                <button
                  onClick={saveNickname}
                  disabled={!nicknameInput.trim()}
                  className="border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#6b6458] hover:text-[#e8e4d9] hover:border-[#4a4540] transition-colors text-sm disabled:opacity-30"
                >
                  Tell Que
                </button>
              </div>
              <p className="text-[#3d3a35] text-xs mt-2">No account needed. Just a name.</p>
            </div>
          )}

          {showEmailAsk && (
            <div className="mt-8 border border-[#2a2826] rounded-2xl p-5">
              <p className="text-[#a89f93] text-sm mb-1 italic">
                Want to know if your question wins today?
              </p>
              <p className="text-[#6b6458] text-xs mb-3">I&apos;ll send you one email. That&apos;s it.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEmail() }}
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#e8e4d9] placeholder-[#3d3a35] text-sm focus:outline-none focus:border-[#4a4540]"
                />
                <button
                  onClick={saveEmail}
                  disabled={!emailInput.trim() || !emailInput.includes('@')}
                  className="border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#6b6458] hover:text-[#e8e4d9] hover:border-[#4a4540] transition-colors text-sm disabled:opacity-30"
                >
                  Yes
                </button>
              </div>
              <button
                onClick={() => setEmailSaved(true)}
                className="text-[#3d3a35] text-xs mt-2 hover:text-[#6b6458] transition-colors"
              >
                No thanks
              </button>
            </div>
          )}

          {/* Que: greeting on return visits */}
          {result && nickname && !showEmailAsk && !emailSaved && (
            <div className="mt-6 text-center">
              <p className="text-[#3d3a35] text-sm italic">Welcome back, {nickname}.</p>
            </div>
          )}

          {/* Que: "Want to go deeper?" chat prompt */}
          <div className="mt-8 border border-[#1a1a18] rounded-2xl p-5">
            <p className="text-[#6b6458] text-sm mb-4">
              Want to go deeper with one of them?
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['grandparent', 'friend', 'child'] as Persona[]).map((p) => {
                const d = PERSONA_DISPLAY[p]
                const isActive = activeChatPersona === p
                return (
                  <button
                    key={p}
                    onClick={() => openChat(p)}
                    className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5 transition-all duration-200"
                    style={{
                      borderColor: isActive ? d.color : '#2a2826',
                      color: isActive ? d.color : '#6b6458',
                      background: isActive ? `${d.color}10` : 'transparent',
                    }}
                  >
                    <span>{d.glyph}</span>
                    <span>{d.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Chat thread */}
            {activeChatPersona && (
              <div className="mt-5">
                {/* Que intro */}
                <p className="text-[#3d3a35] text-xs italic mb-4">
                  I&apos;ll step back. {PERSONA_DISPLAY[activeChatPersona].name} has more to say.
                </p>

                {/* Messages */}
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-4 pr-1">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'text-[#e8e4d9] self-end text-right pl-8'
                          : 'text-[#a89f93] self-start pr-8'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-[#6b6458] text-xs">
                      <span
                        className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                        style={{ color: PERSONA_DISPLAY[activeChatPersona].color }}
                      />
                      <span style={{ color: PERSONA_DISPLAY[activeChatPersona].color }}>
                        {PERSONA_DISPLAY[activeChatPersona].name} is thinking...
                      </span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder={`Ask ${PERSONA_DISPLAY[activeChatPersona].name} something...`}
                    disabled={chatLoading}
                    className="flex-1 bg-transparent border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#e8e4d9] placeholder-[#3d3a35] text-sm focus:outline-none focus:border-[#4a4540] disabled:opacity-50"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="border border-[#2a2826] rounded-xl px-4 py-2.5 text-[#6b6458] hover:text-[#e8e4d9] hover:border-[#4a4540] transition-colors text-sm disabled:opacity-30"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ask another */}
          <div className="text-center mt-8">
            <button
              onClick={reset}
              className="text-[#3d3a35] text-sm hover:text-[#6b6458] transition-colors duration-200"
            >
              Ask another question
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
