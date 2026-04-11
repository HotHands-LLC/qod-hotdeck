# QOD Spec Addendum — v2 (from Chad, 2026-04-11 ~12:15am)

## 1. On-Domain Persona: "Que"
- The AI persona on qod.hotdeck.com is named **Que** (not Bo — Bo is reserved for BoBozly)
- "Ask Que" is the product tagline
- Que is the narrator/guide — she introduces the personas, holds the conversation, and does the progressive identity capture
- Que's voice: warm, curious, slightly mysterious. She asks good questions. She's the reason you stay.

## 2. Progressive Identity Capture (frog-in-warm-water)
After the user gets their 3 short responses, Que speaks:

**Step 1 — Nickname (immediate, after first response set):**
> "Before I go deeper — what can I call you?"

- Store nickname in localStorage + Supabase if they have a session
- No email required. Just a name.
- This is the rapport hook.

**Step 2 — Email (offer tied to real value, later in session or on return):**
> "Want to know if your question wins today? I'll send you one email."

- Only ask after rapport is established (they've read at least one deep dive)
- Email unlocks: voting, winner notifications, leaderboard visibility

**Step 3 — Mobile (future, only after email established):**
> "Want a nudge when tomorrow's winner drops?"

- SMS/push for winner announcements
- Never ask for mobile until email is confirmed

**Implementation:** 
- Track `rapport_score` in localStorage: +1 for each persona click, +1 for deep dive read, +1 for return visit
- Show nickname ask at rapport_score >= 1
- Show email ask at rapport_score >= 3
- Never show both asks in same session

## 3. Post-Response Conversation with Que
After user reads responses, they can continue the conversation:

- Small prompt below responses: *"Want to go deeper with one of them?"*
- User picks a persona (Grandparent / Friend / Child)
- Opens a chat thread — same persona's system prompt, ongoing conversation
- Que introduces: *"I'll step back. Grandparent has more to say."*
- Chat history stored per session (Supabase: qod_chats table)
- Free for now (future paywall candidate)

**New table needed:**
```sql
CREATE TABLE qod_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES qod_questions(id),
  persona TEXT NOT NULL,
  nickname TEXT,
  user_email TEXT,
  messages JSONB DEFAULT '[]', -- [{role, content, timestamp}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. Category Browsing — Today's Pool
Below or alongside today's featured question, show today's questions filtered by AI-assigned tags:

**Categories (tabs or chips):**
- 🔥 Most Voted
- 😂 Funniest
- 🙏 Most Spiritual  
- 💡 Most Thought-Provoking
- 😬 Most Uncomfortable
- 🌍 Most Culturally Relevant

**Implementation:**
- When question is submitted → AI tags it with up to 3 categories (fast Haiku call)
- Tags stored in `qod_questions.tags TEXT[]`
- Category tabs on main page filter today's questions
- Only shows today's pool (not all-time — that comes later)
- Categories grow as content grows

**New column on qod_questions:**
```sql
ALTER TABLE qod_questions ADD COLUMN tags TEXT[] DEFAULT '{}';
```

**Tagging prompt (Haiku, fires after question submitted):**
```
You are a question tagger. Given this question, assign up to 3 tags from this list ONLY:
funny, spiritual, thought-provoking, uncomfortable, cultural, personal, philosophical, practical

Question: [question text]

Respond with ONLY a JSON array: ["tag1", "tag2"]
```

## 5. Summary of New DB Changes Needed
Add to schema.sql:
- `qod_questions.tags TEXT[]`
- `qod_questions.nickname TEXT` (submitter's nickname if captured)
- `qod_chats` table (full schema above)

## 6. Update to Admin Panel
Add to /admin:
- **Category management:** toggle which category tabs are visible
- **Today's questions by category:** filter by tag
- **Chat log viewer:** read conversation transcripts (moderation)

## FUTURE VISION (logged 2026-04-11, not for Phase 2 build)

### Mood-Adaptive Que
- Tag question emotional weight: heavy / light / funny / urgent
- Que's post-response tone adapts to match
- Infer blunt-vs-gentle preference from which persona user clicks (no asking)
- Grandparent clicks → serve more direct follow-ups
- Child clicks → lighter, more playful
- rapport_score feeds mood weighting over time

### Persona-as-a-Service (hotdeck.com/[persona])
- Each subdirectory = a knowledge-base persona built from public record
- Examples: /joe (Rogan-style reasoning), /maya (Angelou wisdom), /mark (Marcus Aurelius stoic)
- Legal frame: "in the style of" + documented positions only, never impersonation
- If asked "are you X?" → Que deflects: "I'm just Joe. Make of that what you will."
- QOD = the daily game. /persona = the rabbit hole product
- Long-term: hotdeck.com as a persona platform, QOD as the entry drug
