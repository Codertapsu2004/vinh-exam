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
    const row=(await q(\`SELECT at.id,at.answers,e.questions,e.max_score FROM attempts at JOIN assignments a ON a.id=at.assignment_id JOIN classes c ON c.id=a.class_id JOIN exams e ON e.id=a.exam_id WHERE at.id=$1 AND c.teacher_id=$2 AND at.status IN('pending_manual','graded')\`,[req.params.id,req.user.id])).rows[0]; if(!row)return res.status(404).json({message:'Không tìm thấy bài để chấm'});
    const objectiveQuestions=(row.questions||[]).filter(x=>x.type!=='essay');
    const objectiveScore=gradeQuestions(objectiveQuestions,row.answers||{}).score;
    const maxEssay=(row.questions||[]).filter(x=>x.type==='essay').reduce((s,x)=>s+Number(x.points||0),0);
    const manual=Math.max(0,Math.min(maxEssay,Number(req.body.points||0)));
    const total=+Math.min(Number(row.max_score||10),objectiveScore+manual).toFixed(2);
    await q(\`UPDATE attempts SET score=$1,status='graded',manual_comment=$2 WHERE id=$3\`,[total,String(req.body.comment||''),row.id]);
    await audit(req.user.id,'attempt.graded',{attemptId:row.id,score:total,objectiveScore,manual});
    res.json({ok:true,score:total,objectiveScore,manual});
  } catch(e){next(e)}
});`;
if (!code.includes(oldGrade)) throw new Error('VINH EXAM hotfix: grading patch target not found');
code = code.replace(oldGrade, newGrade);

const m = new Module(target, module.parent);
m.filename = target;
m.paths = Module._nodeModulePaths(__dirname);
m._compile(code, target);
