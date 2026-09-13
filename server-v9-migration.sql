ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_kind text NOT NULL DEFAULT 'test';
CREATE INDEX IF NOT EXISTS idx_assignments_class_kind_open ON assignments(class_id,assignment_kind,open_at DESC);
