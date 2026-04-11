-- Questions submitted by users
CREATE TABLE qod_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  user_email TEXT, -- optional
  user_ip TEXT,
  nickname TEXT, -- submitter's display name if captured
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  date_key DATE DEFAULT CURRENT_DATE, -- which day's pool this belongs to
  vote_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE, -- admin can feature any day
  is_moderated BOOLEAN DEFAULT FALSE, -- admin approval flag
  tags TEXT[] DEFAULT '{}' -- AI-assigned category tags
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

-- Chat sessions (ongoing conversations with a persona)
CREATE TABLE qod_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES qod_questions(id),
  persona TEXT NOT NULL, -- 'grandparent' | 'friend' | 'child'
  nickname TEXT,
  user_email TEXT,
  messages JSONB DEFAULT '[]', -- [{role, content, timestamp}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
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
  ('cutoff_time_ct', '22:00'),
  ('category_tab_most_voted', 'true'),
  ('category_tab_funny', 'true'),
  ('category_tab_spiritual', 'true'),
  ('category_tab_thought_provoking', 'true'),
  ('category_tab_uncomfortable', 'true');
