'use client'

import { useEffect, useState } from 'react'

interface BrowseQuestion {
  id: string
  question: string
  vote_count: number
  tags: string[] | null
  nickname: string | null
  submitted_at: string
}

interface EnabledTabs {
  most_voted: boolean
  funny: boolean
  spiritual: boolean
  thought_provoking: boolean
  uncomfortable: boolean
}

type TabKey = 'most_voted' | 'funny' | 'spiritual' | 'thought_provoking' | 'uncomfortable'

const TABS: { key: TabKey; label: string; emoji: string; tag?: string }[] = [
  { key: 'most_voted', label: 'Most Voted', emoji: '🔥' },
  { key: 'funny', label: 'Funniest', emoji: '😂', tag: 'funny' },
  { key: 'spiritual', label: 'Most Spiritual', emoji: '🙏', tag: 'spiritual' },
  { key: 'thought_provoking', label: 'Most Thought-Provoking', emoji: '💡', tag: 'thought-provoking' },
  { key: 'uncomfortable', label: 'Most Uncomfortable', emoji: '😬', tag: 'uncomfortable' },
]

export default function CategoryBrowser() {
  const [questions, setQuestions] = useState<BrowseQuestion[]>([])
  const [enabledTabs, setEnabledTabs] = useState<EnabledTabs>({
    most_voted: true,
    funny: true,
    spiritual: true,
    thought_provoking: true,
    uncomfortable: true,
  })
  const [activeTab, setActiveTab] = useState<TabKey>('most_voted')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/questions/browse')
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || [])
        if (data.enabledTabs) setEnabledTabs(data.enabledTabs)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || questions.length === 0) return null

  const visibleTabs = TABS.filter((t) => enabledTabs[t.key])
  if (visibleTabs.length === 0) return null

  // Filter questions for the active tab
  const activeTabDef = TABS.find((t) => t.key === activeTab)
  let filtered: BrowseQuestion[]
  if (!activeTabDef?.tag) {
    // Most voted — already sorted by vote_count from API
    filtered = questions
  } else {
    filtered = questions.filter((q) => q.tags?.includes(activeTabDef.tag!))
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-16">
      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-5">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors duration-200 whitespace-nowrap"
              style={{
                borderColor: isActive ? '#4a4540' : '#1a1a18',
                color: isActive ? '#e8e4d9' : '#3d3a35',
                background: isActive ? '#1a1a18' : 'transparent',
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          )
        })}
      </div>

      {/* Questions list */}
      {filtered.length === 0 ? (
        <p className="text-[#2a2826] text-sm text-center py-6">
          No questions tagged here yet today.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, 8).map((q) => (
            <div
              key={q.id}
              className="border border-[#1a1a18] rounded-xl px-4 py-3 flex items-start justify-between gap-4"
            >
              <p className="text-[#6b6458] text-sm leading-relaxed flex-1">{q.question}</p>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {q.vote_count > 0 && (
                  <span className="text-[#3d3a35] text-xs">{q.vote_count} ▲</span>
                )}
                {q.tags && q.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {q.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-[#2a2826] border border-[#1a1a18] rounded-full px-1.5 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
