'use client'

import { useState, useRef, FormEvent } from 'react'
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

export default function QuestionForm() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuestionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

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
              />
            ))}
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
