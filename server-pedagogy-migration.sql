ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS edit_revision integer NOT NULL DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS exam_snapshot jsonb;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS score_release text NOT NULL DEFAULT 'immediate';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS answer_release text NOT NULL DEFAULT 'immediate';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT '';
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS attempt_no integer NOT NULL DEFAULT 1;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS question_order jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_assignment_id_student_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS attempts_assignment_student_number ON attempts(assignment_id,student_id,attempt_no);
UPDATE assignments a SET exam_snapshot=jsonb_build_object('title',e.title,'subject',e.subject,'questions',e.questions,'max_score',e.max_score,'sections',e.sections,'revision',e.edit_revision)
FROM exams e WHERE e.id=a.exam_id AND a.exam_snapshot IS NULL AND EXISTS(SELECT 1 FROM attempts t WHERE t.assignment_id=a.id);
CREATE OR REPLACE VIEW assignment_exam_versions AS
SELECT a.id assignment_id,e.id,COALESCE(a.exam_snapshot->>'title',e.title) title,
COALESCE(a.exam_snapshot->>'subject',e.subject) subject,e.duration,
COALESCE((a.exam_snapshot->>'max_score')::numeric,e.max_score) max_score,
COALESCE(a.exam_snapshot->'questions',e.questions) questions,
COALESCE(a.exam_snapshot->'sections',e.sections) sections,
e.status,e.owner_id,e.updated_at,e.exam_config,e.edit_revision
FROM assignments a JOIN exams e ON e.id=a.exam_id;
CREATE OR REPLACE VIEW latest_attempts AS
SELECT DISTINCT ON (assignment_id,student_id) * FROM attempts ORDER BY assignment_id,student_id,attempt_no DESC;
