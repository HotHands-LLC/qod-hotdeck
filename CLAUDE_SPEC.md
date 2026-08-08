# SECURITY NOTE (2026-08-08): All credentials are now `<set in env>` placeholders in this public spec. Do NOT commit actual keys.

# QOD.hotdeck.com — Build Spec for Claude Code

## What You're Building
**Question of the Day** — A Wordle-style daily app. Users ask one question. Three AI personas (Grandparent, Friend, Child) respond. Community votes on the best question. Yesterday's winner is featured the next morning.

**Domain:** qod.hotdeck.com  
**Stack:** Next.js 14 (App Router) + Supabase + Tailwind CSS + Vercel  
**New repo:** hotdeck-mcp/qod-hotdeck (you're in it)

---

## Personas (the heart of the product)

These are CLAUDE models with different system prompts — NOT labeled by model name in the UI:

### 🧓 Grandparent
- **Model:** claude-opus-4-6
- **Tone:** Hard, direct, earned wisdom. No filter. Has lived enough not to sugarcoat.
- **Short response:** ~200 words, direct answer
- **Deep dive:** ~600 words, personal stories that shaped the wisdom, introspective

### 🫂 Friend  
- **Model:** claude-sonnet-4-6
- **Tone:** Meets you where you are. Gentle, understanding — until the moment you need a kick in the butt.
- **Short response:** ~200 words, warm and practical
- **Deep dive:** ~600 words, relatable, honest, pushes gently when needed

### 🧒 Child
- **Model:** claude-haiku-4-5-20251001
- **Tone:** Honest to a fault. Sees what nobody else dared to see. Says it plainly.
- **Short response:** ~200 words, simple and surprisingly sharp
- **Deep dive:** ~600 words, disarmingly honest, cuts through the noise

---

## Landing Page (critical)

**Google-bar minimal.** Dark background (#08090d or similar). One centered text input. Empty. Waiting. Hungry.

The user intuitively knows: type your question here.

No marketing copy. No explanation. Maybe a one-line ephemeral placeholder like:
> "What's been on your mind?"

Below the bar, very subtle: yesterday's QOD winner (title only, linked to full view).

Nothing else on the landing page. White space is the design.

---

## Core User Flow

1. User lands → sees empty search bar
2. Types their question → hits Enter (or Submit)
3. **Immediately** get 3 short responses (typewriter effect, all 3 load in parallel)
4. Each response has a persona card: name, glyph, 1-line description
5. User clicks a persona card → deep dive loads (longer response, same persona)
6. Optional: user can 👍 a persona response
7. Optional email capture: "Get notified when today's winning question is revealed" → unlocks voting + leaderboard

### Daily Rhythm
- **10pm CT:** Submissions close. Voting opens.
- **Midnight CT:** Votes tallied. Winner selected (or AI judge if admin toggled)
- **Next morning:** Yesterday's winner featured on landing page with all 3 responses

---

## Supabase Schema (build this)

```sql
-- Questions submitted by users
CREATE TABLE qod_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  user_email TEXT, -- optional
  user_ip TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  date_key DATE DEFAULT CURRENT_DATE, -- which day's pool this belongs to
  vote_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE, -- admin can feature any day
  is_moderated BOOLEAN DEFAULT FALSE -- admin approval flag
);

-- AI responses for each question
CREATE TABLE qod_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES qod_questions(id),
  persona TEXT NOT NULL, -- 'grandparent' | 'friend' | 'child'
  short_response TEXT NOT NULL,
  deep_response TEXT, -- loaded on demand
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes on questions (to determine QOD winner)
CREATE TABLE qod_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES qod_questions(id),
  voter_email TEXT,
  voter_ip TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings (admin-controlled)
CREATE TABLE qod_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO qod_settings (key, value) VALUES
  ('rate_limit_mode', 'ip'), -- 'ip' | 'account' | 'honor'
  ('submissions_open', 'true'),
  ('voting_open', 'false'),
  ('ai_judge_enabled', 'false'),
  ('ai_judge_criteria', 'novelty,culturally_relevant,funny'),
  ('deep_dive_free', 'true'),
  ('questions_per_day_limit', '1'),
  ('cutoff_time_ct', '22:00');
```

---

## API Routes (Next.js App Router)

### POST /api/questions
- Accept: `{ question: string, email?: string }`
- Check rate limit (based on `rate_limit_mode` setting)
- Insert into `qod_questions`
- Fire 3 parallel Anthropic calls (Grandparent/Friend/Child — short responses)
- Store all 3 in `qod_responses`
- Return: question_id + all 3 short responses

### GET /api/questions/[id]/deep-dive/[persona]
- If deep_response already exists in DB → return cached
- Else call Anthropic with deep dive prompt → store → return

### GET /api/winner/[date]
- Return winning question + all 3 responses for that date
- Default: yesterday's date

### POST /api/vote
- Accept: `{ question_id, email? }`
- Check voting is open
- Insert vote, increment vote_count

### GET /api/questions/today
- Return all questions submitted today (for admin)

---

## Admin Panel (/admin)

Simple password-protected page (env var ADMIN_PASSWORD).

### Controls:
- **Rate limit mode:** dropdown (IP / Account / Honor system)
- **Submissions open:** toggle
- **Voting open:** toggle  
- **Deep dive free:** toggle
- **Questions per day:** number input
- **AI judge enabled:** toggle
- **AI judge criteria:** multi-select checkboxes (novelty, culturally relevant, funny, thought-provoking, timely)
- **Seed tomorrow's QOD:** text input — paste a question to pin it as tomorrow's featured question
- **Today's questions table:** list all submitted questions with vote counts, moderation toggle, manual feature button

All saves update `qod_settings` table immediately. No deploy needed.

---

## Anthropic API

**Key is served via local proxy OR direct server-side.** Use server-side API routes (never expose key to browser).

```
ANTHROPIC_API_KEY=<set in env>
```

### System prompts per persona:

**Grandparent:**
```
You are the Grandparent. You've lived a long life and learned hard lessons. You speak directly, without sugarcoating. You've earned the right to say what others won't. Answer the question honestly, from a place of earned wisdom. Don't be cruel — but don't be soft. Short response: 3-5 sentences maximum.
```

**Friend:**
```
You are the Friend. You know this person. You meet them where they are. You're warm, understanding, and real — but you're not afraid to give them a gentle kick when they need one. Short response: 3-5 sentences maximum.
```

**Child:**
```
You are the Child. You see things plainly. You haven't learned yet to be polite about hard truths. You say what you see, simply and honestly, without agenda. Short response: 3-5 sentences maximum.
```

Deep dive versions: same persona, extend with "Now go deeper. Share personal stories, memories, or examples that shaped this perspective. 4-6 paragraphs."

---

## Supabase Connection

```
NEXT_PUBLIC_SUPABASE_URL=https://prtqzvcvcdppnuuzfrmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set in env>
SUPABASE_SERVICE_ROLE_KEY=<set in env>
```

---

## Visual Design

- **Background:** #08090d (near-black)
- **Font:** Georgia serif (like the Agent Mirror experiment)
- **Colors:** warm cream text (#e8e4d9), subtle borders
- **Persona colors:**
  - Grandparent: amber/gold (#f59e0b)
  - Friend: blue (#60a5fa)  
  - Child: green (#4ade80)
- **Animations:** typewriter effect on responses, fade-in on cards
- **Mobile first** — most users will be on phone

---

## .env.local to create

```
NEXT_PUBLIC_SUPABASE_URL=https://prtqzvcvcdppnuuzfrmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set in env>
SUPABASE_SERVICE_ROLE_KEY=<set in env>
ANTHROPIC_API_KEY=<set in env>
ADMIN_PASSWORD=<set in env>
```

---

## Deliverables for Phase 1

1. ✅ `npx create-next-app` scaffolded with TypeScript + Tailwind
2. ✅ `.env.local` created with all keys
3. ✅ Supabase schema SQL in `/supabase/schema.sql`
4. ✅ Landing page (`/`) — Google-bar UI, dark, minimal
5. ✅ Question submission flow — 3 parallel API calls, typewriter responses
6. ✅ Persona cards + deep dive click-to-expand
7. ✅ `/admin` — settings dashboard with all toggles
8. ✅ Git commit + push to hotdeck-mcp/qod-hotdeck

## When done, notify BoClaw:
```
openclaw system event --text "Done: QOD Phase 1 complete — landing page, 3 personas, Supabase schema, admin panel all built and pushed to hotdeck-mcp/qod-hotdeck" --mode now
```
