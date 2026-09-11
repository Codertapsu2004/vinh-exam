const express = require('express');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
const q = (text, params = []) => pool.query(text, params);
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const uuid = () => crypto.randomUUID();

async function migrate() {
  await q(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE TABLE IF NOT EXISTS users(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    login text UNIQUE NOT NULL,
    name text NOT NULL,
    role text NOT NULL CHECK(role IN('student','teacher','admin')),
    password_hash text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS sessions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    token_hash text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS classes(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    subject text NOT NULL,
    teacher_id uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS enrollments(
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    student_id uuid REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(class_id,student_id)
  );
  CREATE TABLE IF NOT EXISTS question_bank(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    subject text NOT NULL DEFAULT '',
    grade text NOT NULL DEFAULT '',
    topic text NOT NULL DEFAULT '',
    type text NOT NULL CHECK(type IN('single','tf','number','essay')),
    prompt text NOT NULL,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    answer jsonb,
    points numeric(8,4) NOT NULL DEFAULT 1,
    tolerance numeric(12,6),
    explanation text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS exams(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subject text NOT NULL,
    duration int NOT NULL DEFAULT 45,
    max_score numeric NOT NULL DEFAULT 10,
    questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    owner_id uuid REFERENCES users(id),
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS assignments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid REFERENCES exams(id),
    class_id uuid REFERENCES classes(id),
    title text NOT NULL,
    open_at timestamptz NOT NULL,
    close_at timestamptz NOT NULL,
    duration int NOT NULL,
    max_attempts int NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS attempts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES assignments(id),
    student_id uuid REFERENCES users(id),
    started_at timestamptz DEFAULT now(),
    deadline_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'in_progress',
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    score numeric,
    submitted_at timestamptz,
    manual_comment text,
    last_saved_at timestamptz,
    row_version int NOT NULL DEFAULT 0,
    UNIQUE(assignment_id,student_id)
  );
  CREATE TABLE IF NOT EXISTS audit(
    id bigserial PRIMARY KEY,
    user_id uuid,
    action text NOT NULL,
    meta jsonb,
    created_at timestamptz DEFAULT now()
  );`);

  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();`);
  await q(`ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();`);
  await q(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`);
  await q(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS last_saved_at timestamptz;`);
  await q(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS row_version int NOT NULL DEFAULT 0;`);
  if (process.env.SEED_ON_BOOT === 'true') await seed();
}

async function upsertUser(login, name, role, password) {
  const hash = await bcrypt.hash(password, 12);
  return (await q(`INSERT INTO users(login,name,role,password_hash)
    VALUES($1,$2,$3,$4)
    ON CONFLICT(login) DO UPDATE SET name=excluded.name,role=excluded.role,password_hash=excluded.password_hash
    RETURNING id,login,name,role,status`, [login, name, role, hash])).rows[0];
}

async function seed() {
  const password = process.env.SEED_TEACHER_PASSWORD || 'ChangeMe!';
  const teacher = await upsertUser('gv', 'Giáo viên Vinh', 'teacher', password);
  const student = await upsertUser('hs', 'Học sinh VINH EXAM', 'student', password);
  await upsertUser('qt', 'Quản trị VINH EXAM', 'admin', password);
  let cls = (await q(`SELECT * FROM classes WHERE name='11A1 – Vật lí' AND teacher_id=$1 LIMIT 1`, [teacher.id])).rows[0];
  if (!cls) cls = (await q(`INSERT INTO classes(name,subject,teacher_id) VALUES('11A1 – Vật lí','Vật lí 11',$1) RETURNING *`, [teacher.id])).rows[0];
  await q(`INSERT INTO enrollments(class_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [cls.id, student.id]);
  let exam = (await q(`SELECT * FROM exams WHERE title='Đề mẫu Vật lí 11 – Dao động' AND owner_id=$1 LIMIT 1`, [teacher.id])).rows[0];
  if (!exam) {
    const questions = [
      { id:'q1', type:'single', text:'Trong dao động điều hòa, khi vật đi qua vị trí cân bằng thì đại lượng nào đạt độ lớn cực đại?', options:['Li độ','Vận tốc','Gia tốc','Thế năng'], answer:1, points:2, explanation:'Tại vị trí cân bằng, vận tốc đạt độ lớn cực đại.' },
      { id:'q2', type:'tf', text:'Xác định Đúng/Sai', statements:['Gia tốc luôn hướng về vị trí cân bằng.','Vận tốc luôn cùng chiều với gia tốc.','Ở biên, vận tốc bằng 0.','Ở vị trí cân bằng, gia tốc bằng 0.'], answer:[true,false,true,true], points:3 },
      { id:'q3', type:'number', text:'Một vật có chu kì T = 0,50 s. Tần số f bằng bao nhiêu Hz?', answer:2, tolerance:0.01, points:2 },
      { id:'q4', type:'essay', text:'Giải thích vì sao khi lực cản tăng thì dao động tắt dần nhanh hơn.', points:3 }
    ];
    exam = (await q(`INSERT INTO exams(title,subject,duration,max_score,questions,owner_id,status)
      VALUES($1,$2,45,10,$3,$4,'published') RETURNING *`, ['Đề mẫu Vật lí 11 – Dao động','Vật lí 11',JSON.stringify(questions),teacher.id])).rows[0];
  }
  const exists = (await q(`SELECT 1 FROM assignments WHERE title='Bài thi demo — Dao động' AND class_id=$1 LIMIT 1`, [cls.id])).rowCount;
  if (!exists) await q(`INSERT INTO assignments(exam_id,class_id,title,open_at,close_at,duration) VALUES($1,$2,$3,now()-interval '1 hour',now()+interval '30 days',45)`, [exam.id,cls.id,'Bài thi demo — Dao động']);
  console.log('Seeded VINH EXAM');
}

async function auth(req, res, next) {
  try {
    const raw = req.cookies.vx_session;
    if (!raw) return res.status(401).json({ message:'Chưa đăng nhập' });
    const r = await q(`SELECT u.*,s.id session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'`, [tokenHash(raw)]);
    if (!r.rowCount) return res.status(401).json({ message:'Phiên đăng nhập đã hết hạn' });
    req.user = r.rows[0];
    next();
  } catch (e) { next(e); }
}
const role = (...roles) => (req,res,next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message:'Không có quyền' });
async function audit(userId, action, meta = {}) { try { await q(`INSERT INTO audit(user_id,action,meta) VALUES($1,$2,$3)`, [userId, action, meta]); } catch {} }
const ownedClass = async (classId, teacherId) => (await q(`SELECT * FROM classes WHERE id=$1 AND teacher_id=$2`, [classId, teacherId])).rows[0];
const ownedExam = async (examId, teacherId) => (await q(`SELECT * FROM exams WHERE id=$1 AND owner_id=$2`, [examId, teacherId])).rows[0];

app.post('/api/auth/login', async (req,res,next) => {
  try {
    const login = String(req.body.login || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const r = await q(`SELECT * FROM users WHERE login=$1 AND status='active'`, [login]);
    if (!r.rowCount || !await bcrypt.compare(password, r.rows[0].password_hash)) return res.status(401).json({ message:'Tên đăng nhập hoặc mật khẩu không đúng' });
    const raw = crypto.randomBytes(32).toString('base64url');
    const exp = new Date(Date.now() + 7*864e5);
    await q(`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)`, [r.rows[0].id, tokenHash(raw), exp]);
    res.cookie('vx_session', raw, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', expires:exp, path:'/' });
    await audit(r.rows[0].id,'auth.login');
    res.json({ user:{ id:r.rows[0].id,name:r.rows[0].name,login:r.rows[0].login,role:r.rows[0].role } });
  } catch (e) { next(e); }
});
app.get('/api/auth/me', auth, (req,res) => res.json({ user:{ id:req.user.id,name:req.user.name,login:req.user.login,role:req.user.role } }));
app.post('/api/auth/logout', auth, async (req,res) => { await q(`DELETE FROM sessions WHERE id=$1`, [req.user.session_id]); res.clearCookie('vx_session',{path:'/'}); res.json({ok:true}); });

function gradeQuestions(questions, answers) {
  let score = 0, pending = false;
  for (const item of questions || []) {
    const ans = answers?.[item.id];
    if (item.type === 'single' && Number(ans) === Number(item.answer)) score += Number(item.points || 0);
    else if (item.type === 'tf' && Array.isArray(ans)) {
      const correct = (item.answer || []).filter((v,i) => ans[i] === v).length;
      const total = (item.answer || []).length || 1;
      score += Number(item.points || 0) * (correct / total);
    } else if (item.type === 'number' && ans !== null && ans !== undefined && ans !== '' && Math.abs(Number(ans)-Number(item.answer)) <= Number(item.tolerance || 0)) score += Number(item.points || 0);
    else if (item.type === 'essay') pending = true;
  }
  return { score:+score.toFixed(2), pending };
}

async function finalizeExpiredAttempts() {
  const rows = (await q(`SELECT at.id,at.answers,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN exams e ON e.id=a.exam_id WHERE at.status='in_progress' AND at.deadline_at<=now() LIMIT 100`)).rows;
  for (const at of rows) {
    const g = gradeQuestions(at.questions, at.answers || {});
    await q(`UPDATE attempts SET status=$1,score=$2,submitted_at=COALESCE(submitted_at,now()) WHERE id=$3 AND status='in_progress'`, [g.pending?'pending_manual':'graded',g.score,at.id]);
  }
}

app.get('/api/student/dashboard', auth, role('student'), async (req,res,next) => {
  try {
    await finalizeExpiredAttempts();
    const rows = (await q(`SELECT a.id assignment_id,a.title,a.open_at,a.close_at,a.duration,e.title exam_title,c.name class_name,at.id attempt_id,at.status,at.score,at.submitted_at
      FROM enrollments en JOIN classes c ON c.id=en.class_id JOIN assignments a ON a.class_id=c.id JOIN exams e ON e.id=a.exam_id
      LEFT JOIN attempts at ON at.assignment_id=a.id AND at.student_id=$1 WHERE en.student_id=$1 ORDER BY a.open_at DESC`, [req.user.id])).rows;
    res.json({ assignments:rows, now:new Date().toISOString() });
  } catch (e) { next(e); }
});
app.post('/api/student/start/:id', auth, role('student'), async (req,res,next) => {
  try {
    const assignment = (await q(`SELECT a.* FROM assignments a JOIN enrollments en ON en.class_id=a.class_id WHERE a.id=$1 AND en.student_id=$2 AND now() BETWEEN a.open_at AND a.close_at`, [req.params.id,req.user.id])).rows[0];
    if (!assignment) return res.status(400).json({ message:'Bài thi chưa mở, đã đóng hoặc không thuộc lớp của bạn' });
    let attempt = (await q(`SELECT * FROM attempts WHERE assignment_id=$1 AND student_id=$2`, [assignment.id,req.user.id])).rows[0];
    if (!attempt) {
      attempt = (await q(`INSERT INTO attempts(assignment_id,student_id,deadline_at,last_saved_at) VALUES($1,$2,LEAST(now()+($3||' minutes')::interval,$4),now()) RETURNING *`, [assignment.id,req.user.id,assignment.duration,assignment.close_at])).rows[0];
      await audit(req.user.id,'attempt.started',{attemptId:attempt.id,assignmentId:assignment.id});
    }
    res.json({ attemptId:attempt.id });
  } catch (e) { next(e); }
});
app.get('/api/student/attempt/:id', auth, role('student'), async (req,res,next) => {
  try {
    await finalizeExpiredAttempts();
    const r = await q(`SELECT at.*,a.title,a.duration,e.title exam_title,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND at.student_id=$2`, [req.params.id,req.user.id]);
    if (!r.rowCount) return res.status(404).json({ message:'Không tìm thấy lượt thi' });
    const x = r.rows[0];
    const questions = (x.questions || []).map(({answer,explanation,tolerance,...safe}) => safe);
    res.json({ attempt:{ id:x.id,status:x.status,deadlineAt:x.deadline_at,lastSavedAt:x.last_saved_at,answers:x.answers||{},score:x.score,title:x.title,examTitle:x.exam_title,questions } });
  } catch (e) { next(e); }
});
app.post('/api/student/attempt/:id/save', auth, role('student'), async (req,res,next) => {
  try {
    const r = await q(`UPDATE attempts SET answers=$1,last_saved_at=now(),row_version=row_version+1 WHERE id=$2 AND student_id=$3 AND status='in_progress' AND deadline_at>now() RETURNING last_saved_at,row_version`, [JSON.stringify(req.body.answers||{}),req.params.id,req.user.id]);
    if (!r.rowCount) return res.status(409).json({ message:'Không thể lưu: bài đã nộp hoặc hết giờ' });
    res.json({ savedAt:r.rows[0].last_saved_at,rowVersion:r.rows[0].row_version });
  } catch (e) { next(e); }
});
app.post('/api/student/attempt/:id/submit', auth, role('student'), async (req,res,next) => {
  try {
    const r = await q(`SELECT at.*,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND at.student_id=$2`, [req.params.id,req.user.id]);
    if (!r.rowCount) return res.status(404).json({ message:'Không tìm thấy lượt thi' });
    const at = r.rows[0];
    if (at.status !== 'in_progress') return res.json({ ok:true,status:at.status,score:at.score });
    const g = gradeQuestions(at.questions, at.answers||{});
    await q(`UPDATE attempts SET status=$1,score=$2,submitted_at=now(),last_saved_at=now() WHERE id=$3`, [g.pending?'pending_manual':'graded',g.score,at.id]);
    await audit(req.user.id,'attempt.submitted',{attemptId:at.id,score:g.score,pending:g.pending});
    res.json({ ok:true,status:g.pending?'pending_manual':'graded',score:g.pending?null:g.score });
  } catch (e) { next(e); }
});
app.get('/api/student/result/:id', auth, role('student'), async (req,res,next) => {
  try {
    await finalizeExpiredAttempts();
    const r = await q(`SELECT at.id,at.status,at.score,at.submitted_at,at.manual_comment,a.title,e.title exam_title,e.max_score FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND at.student_id=$2`, [req.params.id,req.user.id]);
    if (!r.rowCount) return res.status(404).json({ message:'Không tìm thấy kết quả' });
    res.json({ result:r.rows[0] });
  } catch (e) { next(e); }
});
app.get('/api/student/result/:id/review', auth, role('student'), async (req,res,next) => {
  try {
    const r = await q(`SELECT at.status,at.answers,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND at.student_id=$2`, [req.params.id,req.user.id]);
    if (!r.rowCount) return res.status(404).json({message:'Không tìm thấy bài làm'});
    if (r.rows[0].status !== 'graded') return res.status(409).json({message:'Bài chưa chấm xong'});
    res.json({ answers:r.rows[0].answers,questions:r.rows[0].questions });
  } catch (e) { next(e); }
});

app.get('/api/teacher/dashboard', auth, role('teacher'), async (req,res,next) => {
  try {
    await finalizeExpiredAttempts();
    const [classes,exams,pending,active,unsubmitted] = await Promise.all([
      q(`SELECT count(*)::int n FROM classes WHERE teacher_id=$1`,[req.user.id]),
      q(`SELECT count(*)::int n FROM exams WHERE owner_id=$1`,[req.user.id]),
      q(`SELECT count(*)::int n FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=$1 AND at.status='pending_manual'`,[req.user.id]),
      q(`SELECT count(*)::int n FROM assignments a JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=$1 AND now() BETWEEN a.open_at AND a.close_at`,[req.user.id]),
      q(`SELECT count(*)::int n FROM assignments a JOIN classes c ON c.id=a.class_id JOIN enrollments en ON en.class_id=c.id LEFT JOIN attempts at ON at.assignment_id=a.id AND at.student_id=en.student_id WHERE c.teacher_id=$1 AND a.close_at>now() AND at.id IS NULL`,[req.user.id])
    ]);
    const recent = (await q(`SELECT a.id,a.title,a.open_at,a.close_at,c.name class_name,e.title exam_title,(SELECT count(*) FROM attempts at WHERE at.assignment_id=a.id)::int attempts,(SELECT count(*) FROM enrollments en WHERE en.class_id=a.class_id)::int students FROM assignments a JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE c.teacher_id=$1 ORDER BY a.created_at DESC LIMIT 6`,[req.user.id])).rows;
    res.json({ stats:{classes:classes.rows[0].n,exams:exams.rows[0].n,pending:pending.rows[0].n,active:active.rows[0].n,unsubmitted:unsubmitted.rows[0].n},recent });
  } catch (e) { next(e); }
});
app.get('/api/teacher/classes', auth, role('teacher'), async (req,res,next) => {
  try { res.json({ classes:(await q(`SELECT c.*,count(en.student_id)::int students FROM classes c LEFT JOIN enrollments en ON en.class_id=c.id WHERE c.teacher_id=$1 GROUP BY c.id ORDER BY c.created_at DESC`,[req.user.id])).rows }); }
  catch (e) { next(e); }
});
app.post('/api/teacher/classes', auth, role('teacher'), async (req,res,next) => {
  try {
    if (!String(req.body.name||'').trim()) return res.status(400).json({message:'Tên lớp không được để trống'});
    const row=(await q(`INSERT INTO classes(name,subject,teacher_id) VALUES($1,$2,$3) RETURNING *`,[String(req.body.name).trim(),String(req.body.subject||'').trim(),req.user.id])).rows[0];
    await audit(req.user.id,'class.created',{classId:row.id}); res.json({class:row});
  } catch(e){next(e)}
});
app.get('/api/teacher/classes/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const cls = await ownedClass(req.params.id,req.user.id); if(!cls) return res.status(404).json({message:'Không tìm thấy lớp'});
    const students=(await q(`SELECT u.id,u.login,u.name,u.status,en.joined_at FROM enrollments en JOIN users u ON u.id=en.student_id WHERE en.class_id=$1 ORDER BY u.name`,[cls.id])).rows;
    const assignments=(await q(`SELECT a.id,a.title,a.open_at,a.close_at,e.title exam_title,(SELECT count(*) FROM attempts at WHERE at.assignment_id=a.id)::int attempts FROM assignments a JOIN exams e ON e.id=a.exam_id WHERE a.class_id=$1 ORDER BY a.created_at DESC`,[cls.id])).rows;
    res.json({class:cls,students,assignments});
  } catch(e){next(e)}
});
app.post('/api/teacher/classes/:id/students', auth, role('teacher'), async (req,res,next) => {
  try {
    const cls=await ownedClass(req.params.id,req.user.id); if(!cls) return res.status(404).json({message:'Không tìm thấy lớp'});
    const login=String(req.body.login||'').trim().toLowerCase(); const name=String(req.body.name||'').trim(); const password=String(req.body.password||'');
    if(!login||!name) return res.status(400).json({message:'Cần tên đăng nhập và họ tên'});
    let student=(await q(`SELECT * FROM users WHERE login=$1`,[login])).rows[0];
    if(student && student.role!=='student') return res.status(409).json({message:'Tên đăng nhập đã thuộc tài khoản không phải học sinh'});
    if(!student){ if(password.length<6) return res.status(400).json({message:'Mật khẩu tối thiểu 6 ký tự'}); const hash=await bcrypt.hash(password,12); student=(await q(`INSERT INTO users(login,name,role,password_hash) VALUES($1,$2,'student',$3) RETURNING *`,[login,name,hash])).rows[0]; }
    await q(`INSERT INTO enrollments(class_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[cls.id,student.id]);
    await audit(req.user.id,'class.student_added',{classId:cls.id,studentId:student.id});
    res.json({student:{id:student.id,login:student.login,name:student.name,status:student.status}});
  } catch(e){next(e)}
});
app.delete('/api/teacher/classes/:classId/students/:studentId', auth, role('teacher'), async (req,res,next) => {
  try { const cls=await ownedClass(req.params.classId,req.user.id); if(!cls)return res.status(404).json({message:'Không tìm thấy lớp'}); await q(`DELETE FROM enrollments WHERE class_id=$1 AND student_id=$2`,[cls.id,req.params.studentId]); await audit(req.user.id,'class.student_removed',{classId:cls.id,studentId:req.params.studentId}); res.json({ok:true}); } catch(e){next(e)}
});

app.get('/api/teacher/questions', auth, role('teacher'), async (req,res,next) => {
  try {
    const search=String(req.query.search||'').trim();
    const params=[req.user.id]; let where=`owner_id=$1 AND status='active'`;
    if(search){params.push(`%${search}%`);where+=` AND (prompt ILIKE $2 OR topic ILIKE $2 OR subject ILIKE $2)`;}
    const rows=(await q(`SELECT * FROM question_bank WHERE ${where} ORDER BY updated_at DESC LIMIT 300`,params)).rows;
    res.json({questions:rows});
  } catch(e){next(e)}
});
app.post('/api/teacher/questions', auth, role('teacher'), async (req,res,next) => {
  try {
    const type=String(req.body.type||'single'); const prompt=String(req.body.prompt||'').trim(); if(!prompt)return res.status(400).json({message:'Nội dung câu hỏi không được để trống'});
    const row=(await q(`INSERT INTO question_bank(owner_id,subject,grade,topic,type,prompt,options,answer,points,tolerance,explanation) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.user.id,String(req.body.subject||''),String(req.body.grade||''),String(req.body.topic||''),type,prompt,JSON.stringify(req.body.options||[]),req.body.answer===undefined?null:JSON.stringify(req.body.answer),Number(req.body.points||1),req.body.tolerance===undefined?null:Number(req.body.tolerance),String(req.body.explanation||'')])).rows[0];
    await audit(req.user.id,'question.created',{questionId:row.id}); res.json({question:row});
  } catch(e){next(e)}
});
app.put('/api/teacher/questions/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const row=(await q(`UPDATE question_bank SET subject=$1,grade=$2,topic=$3,type=$4,prompt=$5,options=$6,answer=$7,points=$8,tolerance=$9,explanation=$10,updated_at=now() WHERE id=$11 AND owner_id=$12 RETURNING *`,[String(req.body.subject||''),String(req.body.grade||''),String(req.body.topic||''),String(req.body.type||'single'),String(req.body.prompt||''),JSON.stringify(req.body.options||[]),req.body.answer===undefined?null:JSON.stringify(req.body.answer),Number(req.body.points||1),req.body.tolerance===undefined?null:Number(req.body.tolerance),String(req.body.explanation||''),req.params.id,req.user.id])).rows[0];
    if(!row)return res.status(404).json({message:'Không tìm thấy câu hỏi'}); await audit(req.user.id,'question.updated',{questionId:row.id}); res.json({question:row});
  } catch(e){next(e)}
});
app.delete('/api/teacher/questions/:id', auth, role('teacher'), async (req,res,next) => {
  try { const r=await q(`UPDATE question_bank SET status='archived',updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING id`,[req.params.id,req.user.id]); if(!r.rowCount)return res.status(404).json({message:'Không tìm thấy câu hỏi'}); await audit(req.user.id,'question.archived',{questionId:req.params.id}); res.json({ok:true}); } catch(e){next(e)}
});

app.get('/api/teacher/exams', auth, role('teacher'), async (req,res,next) => { try { res.json({exams:(await q(`SELECT id,title,subject,duration,max_score,status,created_at,updated_at,jsonb_array_length(questions)::int question_count FROM exams WHERE owner_id=$1 ORDER BY updated_at DESC`,[req.user.id])).rows}); } catch(e){next(e)} });
app.get('/api/teacher/exams/:id', auth, role('teacher'), async (req,res,next) => { try { const exam=await ownedExam(req.params.id,req.user.id); if(!exam)return res.status(404).json({message:'Không tìm thấy đề'}); res.json({exam}); } catch(e){next(e)} });
app.post('/api/teacher/exams', auth, role('teacher'), async (req,res,next) => {
  try {
    if(!String(req.body.title||'').trim())return res.status(400).json({message:'Tên đề không được để trống'});
    const questions=Array.isArray(req.body.questions)?req.body.questions:[]; const max=questions.reduce((s,x)=>s+Number(x.points||0),0) || Number(req.body.maxScore||10);
    const row=(await q(`INSERT INTO exams(title,subject,duration,max_score,questions,owner_id,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,'draft',now()) RETURNING *`,[String(req.body.title).trim(),String(req.body.subject||''),Number(req.body.duration||45),max,JSON.stringify(questions),req.user.id])).rows[0];
    await audit(req.user.id,'exam.created',{examId:row.id}); res.json({exam:row});
  } catch(e){next(e)}
});
app.put('/api/teacher/exams/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const exam=await ownedExam(req.params.id,req.user.id); if(!exam)return res.status(404).json({message:'Không tìm thấy đề'}); if(exam.status==='published')return res.status(409).json({message:'Đề đã xuất bản không thể sửa trực tiếp. Hãy tạo bản nháp mới.'});
    const questions=Array.isArray(req.body.questions)?req.body.questions:[]; const max=questions.reduce((s,x)=>s+Number(x.points||0),0) || Number(req.body.maxScore||10);
    const row=(await q(`UPDATE exams SET title=$1,subject=$2,duration=$3,max_score=$4,questions=$5,updated_at=now() WHERE id=$6 AND owner_id=$7 RETURNING *`,[String(req.body.title||exam.title),String(req.body.subject||''),Number(req.body.duration||45),max,JSON.stringify(questions),exam.id,req.user.id])).rows[0];
    await audit(req.user.id,'exam.updated',{examId:row.id}); res.json({exam:row});
  } catch(e){next(e)}
});
app.post('/api/teacher/exams/:id/publish', auth, role('teacher'), async (req,res,next) => {
  try {
    const exam=await ownedExam(req.params.id,req.user.id); if(!exam)return res.status(404).json({message:'Không tìm thấy đề'}); const questions=exam.questions||[]; if(!questions.length)return res.status(400).json({message:'Đề chưa có câu hỏi'});
    const invalid=questions.find(x=>!x.text||!['single','tf','number','essay'].includes(x.type)||Number(x.points||0)<=0); if(invalid)return res.status(400).json({message:'Đề còn câu hỏi chưa hợp lệ'});
    const row=(await q(`UPDATE exams SET status='published',updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING *`,[exam.id,req.user.id])).rows[0]; await audit(req.user.id,'exam.published',{examId:row.id}); res.json({exam:row});
  } catch(e){next(e)}
});
app.post('/api/teacher/exams/:id/clone', auth, role('teacher'), async (req,res,next) => {
  try { const exam=await ownedExam(req.params.id,req.user.id); if(!exam)return res.status(404).json({message:'Không tìm thấy đề'}); const row=(await q(`INSERT INTO exams(title,subject,duration,max_score,questions,owner_id,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,'draft',now()) RETURNING *`,[`${exam.title} — Bản sao`,exam.subject,exam.duration,exam.max_score,JSON.stringify(exam.questions||[]),req.user.id])).rows[0]; res.json({exam:row}); } catch(e){next(e)}
});

app.get('/api/teacher/assignments', auth, role('teacher'), async (req,res,next) => { try { res.json({assignments:(await q(`SELECT a.*,e.title exam_title,c.name class_name,(SELECT count(*) FROM attempts at WHERE at.assignment_id=a.id)::int attempts,(SELECT count(*) FROM enrollments en WHERE en.class_id=a.class_id)::int students FROM assignments a JOIN exams e ON e.id=a.exam_id JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=$1 ORDER BY a.created_at DESC`,[req.user.id])).rows}); } catch(e){next(e)} });
app.post('/api/teacher/assignments', auth, role('teacher'), async (req,res,next) => {
  try {
    const cls=await ownedClass(req.body.classId,req.user.id); const exam=await ownedExam(req.body.examId,req.user.id); if(!cls||!exam)return res.status(403).json({message:'Không có quyền với lớp hoặc đề'}); if(exam.status!=='published')return res.status(409).json({message:'Cần xuất bản đề trước khi giao'});
    const open=new Date(req.body.openAt||Date.now()); const close=new Date(req.body.closeAt||Date.now()+7*864e5); if(!(close>open))return res.status(400).json({message:'Thời gian đóng phải sau thời gian mở'});
    const row=(await q(`INSERT INTO assignments(exam_id,class_id,title,open_at,close_at,duration,max_attempts) VALUES($1,$2,$3,$4,$5,$6,1) RETURNING *`,[exam.id,cls.id,String(req.body.title||exam.title),open,close,Number(req.body.duration||exam.duration)])).rows[0]; await audit(req.user.id,'assignment.created',{assignmentId:row.id,classId:cls.id,examId:exam.id}); res.json({assignment:row});
  } catch(e){next(e)}
});
app.get('/api/teacher/monitor/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const own=(await q(`SELECT a.*,c.name class_name,e.title exam_title,jsonb_array_length(e.questions)::int total_questions FROM assignments a JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE a.id=$1 AND c.teacher_id=$2`,[req.params.id,req.user.id])).rows[0]; if(!own)return res.status(403).json({message:'Không có quyền'});
    await finalizeExpiredAttempts();
    const rows=(await q(`SELECT u.id student_id,u.name,u.login,at.id attempt_id,COALESCE(at.status,'not_started') status,at.started_at,at.deadline_at,at.last_saved_at,at.score,CASE WHEN at.id IS NULL THEN 0 ELSE jsonb_object_length(COALESCE(at.answers,'{}'::jsonb)) END answered FROM enrollments en JOIN users u ON u.id=en.student_id LEFT JOIN attempts at ON at.assignment_id=$1 AND at.student_id=u.id WHERE en.class_id=$2 ORDER BY u.name`,[own.id,own.class_id])).rows;
    res.json({assignment:own,attempts:rows});
  } catch(e){next(e)}
});
app.get('/api/teacher/pending', auth, role('teacher'), async (req,res,next) => { try { await finalizeExpiredAttempts(); res.json({attempts:(await q(`SELECT at.id,u.name,u.login,a.title,at.score,at.submitted_at FROM attempts at JOIN users u ON u.id=at.student_id JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=$1 AND at.status='pending_manual' ORDER BY at.submitted_at`,[req.user.id])).rows}); } catch(e){next(e)} });
app.get('/api/teacher/attempt/:id', auth, role('teacher'), async (req,res,next) => { try { const row=(await q(`SELECT at.*,u.name student_name,u.login,a.title,e.title exam_title,e.questions FROM attempts at JOIN users u ON u.id=at.student_id JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND c.teacher_id=$2`,[req.params.id,req.user.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy bài làm'}); res.json({attempt:row}); } catch(e){next(e)} });
app.post('/api/teacher/grade/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const row=(await q(`SELECT at.id,at.score,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND c.teacher_id=$2 AND at.status IN('pending_manual','graded')`,[req.params.id,req.user.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy bài để chấm'});
    const maxEssay=(row.questions||[]).filter(x=>x.type==='essay').reduce((s,x)=>s+Number(x.points||0),0); const autoBase=gradeQuestions((row.questions||[]).filter(x=>x.type!=='essay'),{}).score; const manual=Math.max(0,Math.min(maxEssay,Number(req.body.points||0)));
    const objectiveScore=Math.max(0,Number(row.score||0)); const total=+Math.min(10,objectiveScore+manual).toFixed(2);
    await q(`UPDATE attempts SET score=$1,status='graded',manual_comment=$2 WHERE id=$3`,[total,String(req.body.comment||''),row.id]); await audit(req.user.id,'attempt.graded',{attemptId:row.id,score:total}); res.json({ok:true,score:total});
  } catch(e){next(e)}
});
app.get('/api/teacher/gradebook', auth, role('teacher'), async (req,res,next) => {
  try {
    const params=[req.user.id]; let extra=''; if(req.query.assignmentId){params.push(req.query.assignmentId);extra=' AND a.id=$2';}
    const rows=(await q(`SELECT a.id assignment_id,a.title,c.name class_name,e.title exam_title,u.id student_id,u.name,u.login,at.id attempt_id,COALESCE(at.status,'not_started') status,at.score,at.submitted_at FROM assignments a JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id JOIN enrollments en ON en.class_id=c.id JOIN users u ON u.id=en.student_id LEFT JOIN attempts at ON at.assignment_id=a.id AND at.student_id=u.id WHERE c.teacher_id=$1 ${extra} ORDER BY a.created_at DESC,u.name`,params)).rows; res.json({rows});
  } catch(e){next(e)}
});

app.get('/api/admin/dashboard', auth, role('admin'), async (req,res,next) => {
  try { const users=(await q(`SELECT role,count(*)::int n FROM users GROUP BY role`)).rows; const [classes,exams,attempts,active]=await Promise.all([q(`SELECT count(*)::int n FROM classes`),q(`SELECT count(*)::int n FROM exams`),q(`SELECT count(*)::int n FROM attempts`),q(`SELECT count(*)::int n FROM sessions WHERE expires_at>now()`)]); res.json({users,classes:classes.rows[0].n,exams:exams.rows[0].n,attempts:attempts.rows[0].n,activeSessions:active.rows[0].n}); } catch(e){next(e)}
});
app.get('/api/admin/users', auth, role('admin'), async (req,res,next) => { try { res.json({users:(await q(`SELECT id,login,name,role,status,created_at FROM users ORDER BY role,name`)).rows}); } catch(e){next(e)} });
app.post('/api/admin/users', auth, role('admin'), async (req,res,next) => {
  try { const login=String(req.body.login||'').trim().toLowerCase(),name=String(req.body.name||'').trim(),roleName=String(req.body.role||'student'),password=String(req.body.password||''); if(!login||!name||password.length<6)return res.status(400).json({message:'Cần tên đăng nhập, họ tên và mật khẩu tối thiểu 6 ký tự'}); if(!['student','teacher','admin'].includes(roleName))return res.status(400).json({message:'Vai trò không hợp lệ'}); const hash=await bcrypt.hash(password,12); const row=(await q(`INSERT INTO users(login,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,login,name,role,status,created_at`,[login,name,roleName,hash])).rows[0]; await audit(req.user.id,'user.created',{userId:row.id,role:roleName}); res.json({user:row}); } catch(e){ if(e.code==='23505')return res.status(409).json({message:'Tên đăng nhập đã tồn tại'}); next(e); }
});
app.patch('/api/admin/users/:id/status', auth, role('admin'), async (req,res,next) => {
  try { const status=req.body.status==='locked'?'locked':'active'; if(req.params.id===req.user.id && status==='locked')return res.status(400).json({message:'Không thể tự khóa tài khoản đang đăng nhập'}); const row=(await q(`UPDATE users SET status=$1 WHERE id=$2 RETURNING id,login,name,role,status`,[status,req.params.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy tài khoản'}); if(status==='locked')await q(`DELETE FROM sessions WHERE user_id=$1`,[row.id]); await audit(req.user.id,'user.status_changed',{userId:row.id,status}); res.json({user:row}); } catch(e){next(e)}
});
app.get('/api/admin/audit', auth, role('admin'), async (req,res,next) => { try { res.json({logs:(await q(`SELECT a.id,a.action,a.meta,a.created_at,u.name,u.login FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 200`)).rows}); } catch(e){next(e)} });

app.get('/api/health', (req,res) => res.json({ok:true,service:'vinh-exam-v2',time:new Date().toISOString()}));
app.use(express.static(path.join(__dirname,'public')));
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next) => { console.error(err); res.status(500).json({message:'Lỗi máy chủ'}); });

const port = Number(process.env.PORT || 3000);
migrate().then(() => {
  app.listen(port,'0.0.0.0',() => console.log(`VINH EXAM V2 running on ${port}`));
  setInterval(() => finalizeExpiredAttempts().catch(console.error), 30000).unref();
}).catch(err => { console.error(err); process.exit(1); });
