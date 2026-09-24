CREATE TABLE IF NOT EXISTS prepared_solution_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id),
 fingerprint text NOT NULL,
 items jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prepared_sets_assignment ON prepared_solution_sets(assignment_id,created_at);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS prepared_solution_id uuid REFERENCES prepared_solution_sets(id) ON DELETE SET NULL;
