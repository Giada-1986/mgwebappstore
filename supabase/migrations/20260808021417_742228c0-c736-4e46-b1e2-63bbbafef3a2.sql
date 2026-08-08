ALTER TABLE public.suggestions
  ALTER COLUMN solution_type DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS domain_other text,
  ADD COLUMN IF NOT EXISTS current_approach text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_approach_tool text,
  ADD COLUMN IF NOT EXISTS current_approach_other text;