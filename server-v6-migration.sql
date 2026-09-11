ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS analysis_version int NOT NULL DEFAULT 1;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS analysis_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS proctor_config jsonb NOT NULL DEFAULT '{"mode":"off","monitorTab":false,"requireFullscreen":false,"blockCopy":false,"blockPaste":false,"blockContextMenu":false}'::jsonb;

CREATE TABLE IF NOT EXISTS attempt_events(
  id bigserial PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempt_events_attempt_created ON attempt_events(attempt_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempt_events_type ON attempt_events(event_type);
