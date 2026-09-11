const fs = require('fs');
const path = require('path');
const Module = require('module');

const target = path.join(__dirname, 'server-v2.js');
let code = fs.readFileSync(target, 'utf8');

const badMonitor = "jsonb_object_length(COALESCE(at.answers,'{}'::jsonb))";
const goodMonitor = "(SELECT count(*)::int FROM jsonb_object_keys(COALESCE(at.answers,'{}'::jsonb)))";
if (!code.includes(badMonitor)) throw new Error('VINH EXAM hotfix: monitor patch target not found');
code = code.replaceAll(badMonitor, goodMonitor);

const oldGrade = `app.post('/api/teacher/grade/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const row=(await q(\`SELECT at.id,at.score,e.questions FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND c.teacher_id=$2 AND at.status IN('pending_manual','graded')\`,[req.params.id,req.user.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy bài để chấm'});
    const maxEssay=(row.questions||[]).filter(x=>x.type==='essay').reduce((s,x)=>s+Number(x.points||0),0); const autoBase=gradeQuestions((row.questions||[]).filter(x=>x.type!=='essay'),{}).score; const manual=Math.max(0,Math.min(maxEssay,Number(req.body.points||0)));
    const objectiveScore=Math.max(0,Number(row.score||0)); const total=+Math.min(10,objectiveScore+manual).toFixed(2);
    await q(\`UPDATE attempts SET score=$1,status='graded',manual_comment=$2 WHERE id=$3\`,[total,String(req.body.comment||''),row.id]); await audit(req.user.id,'attempt.graded',{attemptId:row.id,score:total}); res.json({ok:true,score:total});
  } catch(e){next(e)}
});`;
const newGrade = `app.post('/api/teacher/grade/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    const row=(await q(\`SELECT at.id,at.answers,e.questions,e.max_score,at.student_id FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND c.teacher_id=$2 AND at.status IN('pending_manual','graded')\`,[req.params.id,req.user.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy bài để chấm'});
    const objectiveQuestions=(row.questions||[]).filter(x=>x.type!=='essay');
    const objectiveScore=gradeQuestions(objectiveQuestions,row.answers||{}).score;
    const maxEssay=(row.questions||[]).filter(x=>x.type==='essay').reduce((s,x)=>s+Number(x.points||0),0);
    const manual=Math.max(0,Math.min(maxEssay,Number(req.body.points||0)));
    const total=+Math.min(Number(row.max_score||10),objectiveScore+manual).toFixed(2);
    await q(\`UPDATE attempts SET score=$1,status='graded',manual_comment=$2 WHERE id=$3\`,[total,String(req.body.comment||''),row.id]);
    await audit(req.user.id,'attempt.graded',{attemptId:row.id,score:total,objectiveScore,manual});
    try{await notifyExtra(row.student_id,'Bài thi đã được chấm','Điểm hiện tại: '+total+'/'+row.max_score,'success',{attemptId:row.id})}catch{}
    res.json({ok:true,score:total,objectiveScore,manual});
  } catch(e){next(e)}
});`;
if (!code.includes(oldGrade)) throw new Error('VINH EXAM hotfix: grading patch target not found');
code = code.replace(oldGrade, newGrade);

// Replace bank create/update handlers so image references become first-class question data.
const bankStart = "app.post('/api/teacher/questions', auth, role('teacher'), async (req,res,next) => {";
const bankEnd = "app.delete('/api/teacher/questions/:id', auth, role('teacher'), async (req,res,next) => {";
const bankStartIndex = code.indexOf(bankStart);
const bankEndIndex = code.indexOf(bankEnd);
if (bankStartIndex < 0 || bankEndIndex < 0 || bankEndIndex <= bankStartIndex) throw new Error('VINH EXAM V5: question bank patch target not found');
const bankHandlersV5 = `async function normalizeBankImagesV5(raw,userId){
  const images=(Array.isArray(raw)?raw:[]).slice(0,4).filter(x=>x&&x.assetId).map(x=>({assetId:String(x.assetId),alt:String(x.alt||'').slice(0,180),caption:String(x.caption||'').slice(0,300)}));
  if(!images.length)return [];
  const ids=[...new Set(images.map(x=>x.assetId))];
  let rows;
  try{rows=(await q(\`SELECT id::text FROM assets WHERE owner_id=$1 AND id = ANY($2::uuid[]) AND mime_type IN ('image/png','image/jpeg','image/webp','image/gif')\`,[userId,ids])).rows}catch{throw new Error('Tham chiếu ảnh không hợp lệ')}
  const owned=new Set(rows.map(x=>x.id));
  if(ids.some(id=>!owned.has(id)))throw new Error('Có ảnh không thuộc tài khoản của bạn hoặc không còn tồn tại');
  return images;
}
app.post('/api/teacher/questions', auth, role('teacher'), async (req,res,next) => {
  try {
    const type=String(req.body.type||'single'); const prompt=String(req.body.prompt||'').trim(); if(!prompt)return res.status(400).json({message:'Nội dung câu hỏi không được để trống'});
    let images;try{images=await normalizeBankImagesV5(req.body.images,req.user.id)}catch(e){return res.status(400).json({message:e.message})}
    const row=(await q(\`INSERT INTO question_bank(owner_id,subject,grade,topic,type,prompt,options,answer,points,tolerance,explanation,images) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *\`,[req.user.id,String(req.body.subject||''),String(req.body.grade||''),String(req.body.topic||''),type,prompt,JSON.stringify(req.body.options||[]),req.body.answer===undefined?null:JSON.stringify(req.body.answer),Number(req.body.points||1),req.body.tolerance===undefined?null:Number(req.body.tolerance),String(req.body.explanation||''),JSON.stringify(images)])).rows[0];
    await audit(req.user.id,'question.created',{questionId:row.id,imageCount:images.length}); res.json({question:row});
  } catch(e){next(e)}
});
app.put('/api/teacher/questions/:id', auth, role('teacher'), async (req,res,next) => {
  try {
    let images;try{images=await normalizeBankImagesV5(req.body.images,req.user.id)}catch(e){return res.status(400).json({message:e.message})}
    const row=(await q(\`UPDATE question_bank SET subject=$1,grade=$2,topic=$3,type=$4,prompt=$5,options=$6,answer=$7,points=$8,tolerance=$9,explanation=$10,images=$11,updated_at=now() WHERE id=$12 AND owner_id=$13 RETURNING *\`,[String(req.body.subject||''),String(req.body.grade||''),String(req.body.topic||''),String(req.body.type||'single'),String(req.body.prompt||''),JSON.stringify(req.body.options||[]),req.body.answer===undefined?null:JSON.stringify(req.body.answer),Number(req.body.points||1),req.body.tolerance===undefined?null:Number(req.body.tolerance),String(req.body.explanation||''),JSON.stringify(images),req.params.id,req.user.id])).rows[0];
    if(!row)return res.status(404).json({message:'Không tìm thấy câu hỏi'}); await audit(req.user.id,'question.updated',{questionId:row.id,imageCount:images.length}); res.json({question:row});
  } catch(e){next(e)}
});
`;
code = code.slice(0,bankStartIndex) + bankHandlersV5 + code.slice(bankEndIndex);

const migrationSql = [
  'server-extra-migration.sql',
  'server-v3-migration.sql',
  'server-v5-migration.sql',
  'server-v6-migration.sql'
].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
const migrationMarker = "  if (process.env.SEED_ON_BOOT === 'true') await seed();";
if (!code.includes(migrationMarker)) throw new Error('VINH EXAM extras: migration marker not found');
const escapedMigration = migrationSql.replaceAll('`','\\`');
code = code.replace(migrationMarker, '  await q(`'+escapedMigration+'`);\n'+migrationMarker);

const extraRoutes = [
  'server-extra-routes.jsfrag',
  'server-v3-routes.jsfrag',
  'server-v4-routes.jsfrag',
  'server-v5-routes.jsfrag',
  'server-v6-routes.jsfrag'
].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
const routeMarker = "app.get('/api/health', (req,res) => res.json({ok:true,service:'vinh-exam-v2',time:new Date().toISOString()}));";
if (!code.includes(routeMarker)) throw new Error('VINH EXAM extras: route marker not found');
code = code.replace(routeMarker, extraRoutes+'\n'+routeMarker.replace("vinh-exam-v2","vinh-exam-v6"));

const m = new Module(target, module.parent);
m.filename = target;
m.paths = Module._nodeModulePaths(__dirname);
m._compile(code, target);
