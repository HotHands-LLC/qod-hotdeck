'use client'

import { useState, FormEvent } from 'react'

interface Question {
  id: string
  question: string
  vote_count: number
  is_winner: boolean
  is_featured: boolean
  is_moderated: boolean
  submitted_at: string
  user_email: string | null
  user_ip: string | null
}

interface Settings {
  rate_limit_mode: string
  submissions_open: string
  voting_open: string
  ai_judge_enabled: string
  ai_judge_criteria: string
  deep_dive_free: string
  questions_per_day_limit: string
  cutoff_time_ct: string
  [key: string]: string
}

const AI_CRITERIA_OPTIONS = [
  { value: 'novelty', label: 'Novelty' },
  { value: 'culturally_relevant', label: 'Culturally Relevant' },
  { value: 'funny', label: 'Funny' },
  { value: 'thought_provoking', label: 'Thought-Provoking' },
  { value: 'timely', label: 'Timely' },
]

const DEFAULT_SETTINGS: Settings = {
  rate_limit_mode: 'ip',
  submissions_open: 'true',
  voting_open: 'false',
  ai_judge_enabled: 'false',
  ai_judge_criteria: 'novelty,culturally_relevant,funny',
  deep_dive_free: 'true',
  questions_per_day_limit: '1',
  cutoff_time_ct: '22:00',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [questions, setQuestions] = useState<Question[]>([])
  const [seedQuestion, setSeedQuestion] = useState('')
  const [, setSaving] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  function showNotif(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  async function login(e: FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        setAuthed(true)
        loadQuestions(password)
      } else {
        setAuthError(true)
      }
    } catch {
      setAuthError(true)
    }
  }

  async function loadQuestions(pw: string) {
    try {
      const res = await fetch('/api/questions/today', {
        headers: { Authorization: `Bearer ${pw}` },
      })
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch {
      // ignore
    }
  }

  async function saveSetting(key: string, value: string) {
    setSaving(key)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ key, value }),
      })
      setSettings((prev) => ({ ...prev, [key]: value }))
      showNotif(`Saved: ${key}`)
    } catch {
      showNotif('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  async function toggleSetting(key: string) {
    const newVal = settings[key] === 'true' ? 'false' : 'true'
    await saveSetting(key, newVal)
  }

  async function updateQuestion(id: string, updates: Record<string, boolean>) {
    try {
      await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ id, updates }),
      })
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      )
      showNotif('Updated')
    } catch {
      showNotif('Failed to update')
    }
  }

  async function seedTomorrow() {
    if (!seedQuestion.trim()) return
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: seedQuestion.trim(), email: 'admin@seed' }),
      })
      if (res.ok) {
        const data = await res.json()
        // Feature it
        await fetch('/api/admin/questions', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${password}`,
          },
          body: JSON.stringify({ id: data.question_id, updates: { is_featured: true } }),
        })
        setSeedQuestion('')
        showNotif('Seeded tomorrow\'s QOD')
      }
    } catch {
      showNotif('Failed to seed')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-[#e8e4d9] text-xl mb-8 text-center">Admin</h1>
          <form onSubmit={login} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="bg-transparent border border-[#2a2826] rounded-xl px-4 py-3 text-[#e8e4d9] placeholder-[#3d3a35] focus:outline-none focus:border-[#4a4540]"
            />
            {authError && (
              <p className="text-red-400/70 text-sm text-center">Wrong password</p>
            )}
            <button
              type="submit"
              className="border border-[#2a2826] rounded-xl px-4 py-3 text-[#6b6458] hover:text-[#e8e4d9] hover:border-[#4a4540] transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-[#1a1a1a] border border-[#2a2826] rounded-xl px-4 py-2 text-[#6b6458] text-sm z-50">
          {notification}
        </div>
      )}

      <h1 className="text-[#e8e4d9] text-2xl mb-10">QOD Admin</h1>

      {/* Settings */}
      <section className="mb-10">
        <h2 className="text-[#6b6458] text-xs uppercase tracking-widest mb-5">Settings</h2>

        <div className="space-y-4">
          {/* Rate limit mode */}
          <div className="flex items-center justify-between py-3 border-b border-[#1a1a18]">
            <label className="text-[#c8c0b0] text-sm">Rate Limit Mode</label>
            <select
              value={settings.rate_limit_mode}
              onChange={(e) => saveSetting('rate_limit_mode', e.target.value)}
              className="bg-[#0f100e] border border-[#2a2826] rounded-lg px-3 py-1.5 text-[#e8e4d9] text-sm focus:outline-none"
            >
              <option value="ip">IP Address</option>
              <option value="account">Account</option>
              <option value="honor">Honor System</option>
            </select>
          </div>

          {/* Toggles */}
          {[
            { key: 'submissions_open', label: 'Submissions Open' },
            { key: 'voting_open', label: 'Voting Open' },
            { key: 'ai_judge_enabled', label: 'AI Judge Enabled' },
            { key: 'deep_dive_free', label: 'Deep Dive Free' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-[#1a1a18]">
              <label className="text-[#c8c0b0] text-sm">{label}</label>
              <button
                onClick={() => toggleSetting(key)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  settings[key] === 'true' ? 'bg-[#4ade80]' : 'bg-[#2a2826]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    settings[key] === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Questions per day */}
          <div className="flex items-center justify-between py-3 border-b border-[#1a1a18]">
            <label className="text-[#c8c0b0] text-sm">Questions Per Day</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.questions_per_day_limit}
              onChange={(e) => saveSetting('questions_per_day_limit', e.target.value)}
              className="bg-[#0f100e] border border-[#2a2826] rounded-lg px-3 py-1.5 text-[#e8e4d9] text-sm w-16 text-center focus:outline-none"
            />
          </div>

          {/* Cutoff time */}
          <div className="flex items-center justify-between py-3 border-b border-[#1a1a18]">
            <label className="text-[#c8c0b0] text-sm">Cutoff Time (CT)</label>
            <input
              type="time"
              value={settings.cutoff_time_ct}
              onChange={(e) => saveSetting('cutoff_time_ct', e.target.value)}
              className="bg-[#0f100e] border border-[#2a2826] rounded-lg px-3 py-1.5 text-[#e8e4d9] text-sm focus:outline-none"
            />
          </div>

          {/* AI Judge Criteria */}
          {settings.ai_judge_enabled === 'true' && (
            <div className="py-3 border-b border-[#1a1a18]">
              <p className="text-[#c8c0b0] text-sm mb-3">AI Judge Criteria</p>
              <div className="flex flex-wrap gap-2">
                {AI_CRITERIA_OPTIONS.map(({ value, label }) => {
                  const active = settings.ai_judge_criteria.split(',').includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => {
                        const current = settings.ai_judge_criteria.split(',').filter(Boolean)
                        const next = active
                          ? current.filter((c) => c !== value)
                          : [...current, value]
                        saveSetting('ai_judge_criteria', next.join(','))
                      }}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        active
                          ? 'border-[#60a5fa] text-[#60a5fa]'
                          : 'border-[#2a2826] text-[#3d3a35]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Seed tomorrow's QOD */}
      <section className="mb-10">
        <h2 className="text-[#6b6458] text-xs uppercase tracking-widest mb-5">Seed Tomorrow&apos;s QOD</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={seedQuestion}
            onChange={(e) => setSeedQuestion(e.target.value)}
            placeholder="Paste a question to pin it for tomorrow..."
            className="flex-1 bg-transparent border border-[#2a2826] rounded-xl px-4 py-3 text-[#e8e4d9] placeholder-[#3d3a35] text-sm focus:outline-none focus:border-[#4a4540]"
          />
          <button
            onClick={seedTomorrow}
            disabled={!seedQuestion.trim()}
            className="border border-[#2a2826] rounded-xl px-4 py-3 text-[#6b6458] hover:text-[#e8e4d9] hover:border-[#4a4540] transition-colors text-sm disabled:opacity-30"
          >
            Seed
          </button>
        </div>
      </section>

      {/* Today's questions */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#6b6458] text-xs uppercase tracking-widest">Today&apos;s Questions</h2>
          <button
            onClick={() => loadQuestions(password)}
            className="text-[#3d3a35] text-xs hover:text-[#6b6458] transition-colors"
          >
            Refresh
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="text-[#2a2826] text-sm text-center py-8">No questions yet today</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="border border-[#1a1a18] rounded-xl p-4">
                <p className="text-[#c8c0b0] text-sm mb-3 leading-relaxed">{q.question}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-[#3d3a35] text-xs">{q.vote_count} votes</span>
                  {q.user_email && (
                    <span className="text-[#3d3a35] text-xs">{q.user_email}</span>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => updateQuestion(q.id, { is_moderated: !q.is_moderated })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        q.is_moderated
                          ? 'border-red-400/40 text-red-400/70'
                          : 'border-[#2a2826] text-[#3d3a35] hover:border-red-400/40 hover:text-red-400/70'
                      }`}
                    >
                      {q.is_moderated ? 'Hidden' : 'Hide'}
                    </button>
                    <button
                      onClick={() => updateQuestion(q.id, { is_featured: !q.is_featured })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        q.is_featured
                          ? 'border-[#f59e0b] text-[#f59e0b]'
                          : 'border-[#2a2826] text-[#3d3a35] hover:border-[#f59e0b] hover:text-[#f59e0b]'
                      }`}
                    >
                      {q.is_featured ? 'Featured' : 'Feature'}
                    </button>
                    <button
                      onClick={() => updateQuestion(q.id, { is_winner: !q.is_winner })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        q.is_winner
                          ? 'border-[#4ade80] text-[#4ade80]'
                          : 'border-[#2a2826] text-[#3d3a35] hover:border-[#4ade80] hover:text-[#4ade80]'
                      }`}
                    >
                      {q.is_winner ? 'Winner ✓' : 'Mark Winner'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
