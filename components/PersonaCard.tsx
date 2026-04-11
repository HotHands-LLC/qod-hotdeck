'use client'

import { useState } from 'react'
import TypewriterText from './TypewriterText'

type Persona = 'grandparent' | 'friend' | 'child'

const PERSONA_DISPLAY = {
  grandparent: { glyph: '🧓', name: 'Grandparent', tagline: 'Hard wisdom, no filter', color: '#f59e0b' },
  friend: { glyph: '🫂', name: 'Friend', tagline: 'Meets you where you are', color: '#60a5fa' },
  child: { glyph: '🧒', name: 'Child', tagline: 'Honest to a fault', color: '#4ade80' },
}

interface PersonaCardProps {
  persona: Persona
  shortResponse: string
  questionId: string
  animate?: boolean
}

export default function PersonaCard({
  persona,
  shortResponse,
  questionId,
  animate = false,
}: PersonaCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deepResponse, setDeepResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shortDone, setShortDone] = useState(!animate)

  const display = PERSONA_DISPLAY[persona]

  async function loadDeepDive() {
    if (deepResponse) {
      setExpanded(!expanded)
      return
    }
    setExpanded(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/questions/${questionId}/deep-dive/${persona}`)
      const data = await res.json()
      setDeepResponse(data.deep_response)
    } catch {
      setDeepResponse('Something went wrong loading the deep dive.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl border transition-all duration-300"
      style={{
        borderColor: `${display.color}33`,
        background: `${display.color}08`,
      }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl leading-none">{display.glyph}</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: display.color }}>
              {display.name}
            </div>
            <div className="text-xs text-[#6b6458] mt-0.5">{display.tagline}</div>
          </div>
        </div>

        {/* Short response with typewriter */}
        <p className="text-[#c8c0b0] leading-relaxed text-sm">
          {animate ? (
            <TypewriterText
              text={shortResponse}
              speed={12}
              onComplete={() => setShortDone(true)}
            />
          ) : (
            shortResponse
          )}
        </p>

        {/* Deep dive button */}
        {shortDone && (
          <button
            onClick={loadDeepDive}
            className="mt-4 text-xs border rounded-full px-3 py-1.5 transition-all duration-200 hover:opacity-80"
            style={{ borderColor: `${display.color}55`, color: display.color }}
          >
            {expanded ? 'Close' : 'Go deeper →'}
          </button>
        )}
      </div>

      {/* Deep dive panel */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: `${display.color}22` }}>
          {loading ? (
            <div className="flex items-center gap-2 text-[#6b6458] text-sm">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Thinking deeper...
            </div>
          ) : deepResponse ? (
            <div className="text-[#a89f93] text-sm leading-relaxed whitespace-pre-wrap">
              <TypewriterText text={deepResponse} speed={6} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
