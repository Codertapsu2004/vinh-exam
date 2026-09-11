CREATE TABLE IF NOT EXISTS notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL,
 message text NOT NULL,
 type text NOT NULL DEFAULT 'info',
 meta jsonb NOT NULL DEFAULT '{}'::jsonb,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS review_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid REFERENCES attempts(id) ON DELETE CASCADE,
 student_id uuid REFERENCES users(id) ON DELETE CASCADE,
 teacher_id uuid REFERENCES users(id) ON DELETE CASCADE,
 question_id text,
 message text NOT NULL,
 status text NOT NULL DEFAULT 'open',
 response text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_tickets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 subject text NOT NULL,
 message text NOT NULL,
 status text NOT NULL DEFAULT 'open',
 response text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
