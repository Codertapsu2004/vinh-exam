CREATE INDEX IF NOT EXISTS idx_play_exams_owner_created ON exams(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_play_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_play_attempts_expiry ON attempts(deadline_at) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS idx_play_question_bank_owner ON question_bank(owner_id);
