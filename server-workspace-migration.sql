ALTER TABLE attempts ADD COLUMN IF NOT EXISTS manual_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
