ALTER TABLE assignments ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS ai_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS ai_job_id uuid;
CREATE TABLE IF NOT EXISTS ai_solution_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id),
 content_hash text NOT NULL,
 context jsonb NOT NULL,
 status text NOT NULL DEFAULT 'queued',
 model text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(assignment_id,content_hash)
);
CREATE TABLE IF NOT EXISTS ai_solution_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES ai_solution_jobs(id) ON DELETE CASCADE,
 question_id text NOT NULL,
 position integer NOT NULL,
 question jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 solution jsonb,
 reason text NOT NULL DEFAULT '',
 tries integer NOT NULL DEFAULT 0,
 locked_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,question_id)
);
CREATE INDEX IF NOT EXISTS ai_solution_pending ON ai_solution_items(status,updated_at);
CREATE INDEX IF NOT EXISTS ai_jobs_owner_date ON ai_solution_jobs(owner_id,created_at);
