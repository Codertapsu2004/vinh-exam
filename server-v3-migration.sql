CREATE TABLE IF NOT EXISTS assets(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes int NOT NULL,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS import_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  extracted_text text NOT NULL DEFAULT '',
  extracted_html text NOT NULL DEFAULT '',
  draft_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS class_join_codes(
  class_id uuid PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS show_score boolean NOT NULL DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS show_answers boolean NOT NULL DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS show_explanations boolean NOT NULL DEFAULT true;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS parent_exam_id uuid REFERENCES exams(id) ON DELETE SET NULL;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS version_no int NOT NULL DEFAULT 1;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS flagged_questions jsonb NOT NULL DEFAULT '[]'::jsonb;
