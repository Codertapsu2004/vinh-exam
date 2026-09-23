const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { code } = require('../server-hotfix');

test('real API workflow on isolated PostgreSQL: register, publish, assign, save, submit, results and permissions', {timeout:120000}, async t => {
  const db = new PGlite();
  const query = async (sql, params=[]) => {
    // PGlite has gen_random_uuid built in; it does not ship the unused pgcrypto extension.
    sql=sql.replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;','');
    const result=params.length?await db.query(sql,params):(await db.exec(sql)).at(-1);
    // Match node-postgres bytea decoding for asset responses.
    if(result?.rows)result.rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Uint8Array?Buffer.from(value):value])));
    return {...result,rowCount:Math.max(result?.affectedRows || 0, result?.rows?.length || 0)};
  };
  const pool={query,connect:async()=>({query,release(){}})};
  const filename=path.join(__dirname,'..','server-v2.js');
  const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
  const normalRequire=mod.require.bind(mod);mod.require=name=>name==='pg'?{Pool:function(){return pool}}:normalRequire(name);
  mod._compile(code.slice(0,code.indexOf('const port = Number(process.env.PORT'))+'\nmodule.exports={app,migrate,finalizeExpiredAttempts,parseExamStructureV6};',filename);
  await mod.exports.migrate();
  const server=mod.exports.app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const request=async(endpoint,{body,cookie,status=200,method=body?'POST':'GET',raw=false}={})=>{
    const res=await fetch(base+'/api'+endpoint,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await res.json();assert.equal(res.status,status,`${method} ${endpoint}: ${JSON.stringify(data)}`);
    return raw?{data,cookie:res.headers.get('set-cookie')?.split(';')[0]}:data;
  };
  await request('/teacher/exams',{status:401});
  const teacher=await request('/auth/register',{body:{role:'teacher',name:'Giáo viên thử nghiệm',login:'teacher-test',password:'TestOnly123',subjects:['Vật lí']},status:201,raw:true});
  const student=await request('/auth/register',{body:{role:'student',name:'Học sinh thử nghiệm',login:'student-test',password:'TestOnly123',grade:'11'},status:201,raw:true});
  const tc=teacher.cookie,sc=student.cookie;
  await request('/teacher/exams',{cookie:sc,status:403});
  const cls=(await request('/teacher/classes',{cookie:tc,body:{name:'Lý 11 thử nghiệm',subject:'Vật lí'}})).class;
  await request('/teacher/classes/'+cls.id+'/students',{cookie:tc,body:{login:'student-test',name:'Học sinh thử nghiệm'}});
  const questions=[{id:'q1',type:'single',text:'2 + 2 = ?',options:['3','4'],answer:1,points:4},{id:'q2',type:'number',text:'10 / 2 = ?',answer:5,tolerance:0,points:6}];
  const exam=(await request('/teacher/exams',{cookie:tc,body:{title:'Đề kiểm tra thử nghiệm',subject:'Vật lí',duration:30,questions}})).exam;
  await request('/teacher/exams/'+exam.id+'/publish',{cookie:tc,body:{}});
  const assignment=(await request('/teacher/assignments-v9',{cookie:tc,body:{title:'Bài kiểm tra thử',classId:cls.id,examId:exam.id,openAt:new Date(Date.now()-60000).toISOString(),closeAt:new Date(Date.now()+3600000).toISOString(),duration:30,assignmentKind:'test'}})).assignment;
  const start=await request('/student/start-v9/'+assignment.id,{cookie:sc,body:{}}),id=start.attemptId;
  const opened=(await request('/student/attempt/'+id,{cookie:sc})).attempt;
  assert.ok(opened.serverNow);assert.equal(opened.rowVersion,0);assert.equal(opened.questions[0].answer,undefined);
  const first=await request('/student/attempt/'+id+'/save',{cookie:sc,body:{answers:{q1:1},rowVersion:0}});assert.equal(first.rowVersion,1);
  const conflict=await request('/student/attempt/'+id+'/save',{cookie:sc,body:{answers:{q1:0},rowVersion:0},status:409});assert.equal(conflict.code,'ANSWER_CONFLICT');
  assert.equal((await request('/student/attempt/'+id,{cookie:sc})).attempt.answers.q1,1);
  await request('/student/attempt/'+id+'/submit',{cookie:sc,body:{rowVersion:0},status:409});
  await request('/student/attempt/'+id+'/save',{cookie:sc,body:{answers:{q1:1,q2:5},rowVersion:1}});
  const submitted=await request('/student/attempt/'+id+'/submit',{cookie:sc,body:{rowVersion:2}});assert.equal(submitted.status,'graded');assert.equal(submitted.score,undefined);
  await request('/student/attempt/'+id+'/save',{cookie:sc,body:{answers:{q1:0},rowVersion:2},status:409});
  const duplicate=await request('/student/attempt/'+id+'/submit',{cookie:sc,body:{rowVersion:2}});assert.equal(duplicate.status,'graded');
  await request('/teacher/assignments/'+assignment.id+'/policy',{cookie:tc,body:{showScore:false,showAnswers:false,showExplanations:false}});
  assert.equal((await request('/student/result/'+id+'/published',{cookie:sc})).result.score,null);
  assert.equal((await request('/student/result/'+id,{cookie:sc})).result.score,null);
  assert.equal((await request('/student/attempt/'+id,{cookie:sc})).attempt.score,null);
  await request('/student/result/'+id+'/review',{cookie:sc,status:403});
  for(const endpoint of ['/student/dashboard','/student/dashboard-v9'])assert.equal((await request(endpoint,{cookie:sc})).assignments.find(a=>a.assignment_id===assignment.id).score,null);
  await request('/teacher/assignments/'+assignment.id+'/policy',{cookie:tc,body:{showScore:true,showAnswers:true,showExplanations:true}});
  assert.equal(Number((await request('/student/result/'+id+'/published',{cookie:sc})).result.score),10);
  for(const endpoint of ['/teacher/dashboard','/teacher/classes','/teacher/exams','/teacher/questions','/teacher/assignments','/teacher/pending','/teacher/imports'])await request(endpoint,{cookie:tc});
  for(const endpoint of ['/student/dashboard-v9','/student/classes-v9','/notifications','/auth/sessions'])await request(endpoint,{cookie:sc});
  // Deadline finalization grades only the last committed revision.
  const expiredAssignment=(await request('/teacher/assignments-v9',{cookie:tc,body:{classId:cls.id,examId:exam.id,openAt:new Date(Date.now()-60000).toISOString(),closeAt:new Date(Date.now()+3600000).toISOString(),duration:30,assignmentKind:'homework'}})).assignment;
  const exp=(await request('/student/start-v9/'+expiredAssignment.id,{cookie:sc,body:{}})).attemptId;
  await request('/student/attempt/'+exp+'/save',{cookie:sc,body:{answers:{q1:1,q2:5},rowVersion:0}});
  await query("UPDATE attempts SET deadline_at=now()-interval '1 second' WHERE id=$1",[exp]);
  await request('/student/attempt/'+exp+'/save',{cookie:sc,body:{answers:{q1:0},rowVersion:1},status:409});
  await mod.exports.finalizeExpiredAttempts();
  const finalized=(await query('SELECT status,score FROM attempts WHERE id=$1',[exp])).rows[0];assert.equal(finalized.status,'graded');assert.equal(Number(finalized.score),10);
  // Direct edits keep the exam identity and freeze all already-started activities.
  const editable=(await request('/teacher/exams/'+exam.id,{cookie:tc})).exam;
  const changedQuestions=questions.map(x=>({...x,text:'Nội dung mới '+x.text,answer:x.type==='single'?0:8}));
  const edited=await request('/teacher/exams/'+exam.id,{cookie:tc,method:'PUT',body:{title:'Đề đã sửa',subject:'Toán',duration:40,questions:changedQuestions,expectedRevision:editable.edit_revision}});
  assert.equal(edited.exam.id,exam.id);assert.equal(edited.exam.status,'published');assert.ok(edited.frozenAssignments>=2);
  await request('/teacher/exams/'+exam.id,{cookie:tc,method:'PUT',body:{title:'Xung đột',questions,expectedRevision:editable.edit_revision},status:409});
  const historical=(await request('/student/result/'+id+'/published',{cookie:sc}));
  assert.equal(historical.review.questions[0].answer,1);assert.equal(historical.review.questions[0].text,'2 + 2 = ?');assert.equal(Number(historical.result.score),10);
  const teacherHistorical=(await request('/teacher/attempt/'+id,{cookie:tc})).attempt;assert.equal(teacherHistorical.questions[0].answer,1);
  // Invalid keys cannot be published, and a pending key must not turn into answer A/zero.
  const missing=(await request('/teacher/exams',{cookie:tc,body:{title:'Thiếu đáp án',subject:'Toán',questions:[{...questions[0],answer:null}]}})).exam;
  await request('/teacher/exams/'+missing.id+'/publish',{cookie:tc,body:{},status:400});
  // Configured retakes, stable shuffle and simulation visibility are enforced by the server.
  const simQuestions=[
    {...questions[0],sectionId:'s1',simulation:{kind:'parabola',visibility:'review',params:{a:1,b:0,c:0}}},
    {...questions[1],sectionId:'s1',simulation:{kind:'harmonic',visibility:'exam',params:{amplitude:2,period:2,phase:0}}}
  ];
  const simExam=(await request('/teacher/exams',{cookie:tc,body:{title:'Đề mô phỏng',subject:'Vật lí',duration:30,questions:simQuestions}})).exam;
  await request('/teacher/exams/'+simExam.id+'/publish',{cookie:tc,body:{config:{duration:30,maxAttempts:2,scoreMode:'after_close',answerMode:'after_close',showExplanations:true,shuffleQuestions:true,instructions:'Đọc kỹ đơn vị.'}}});
  const configured=(await request('/teacher/assignments-v9',{cookie:tc,body:{classId:cls.id,examId:simExam.id,openAt:new Date(Date.now()-1000).toISOString(),closeAt:new Date(Date.now()+3600000).toISOString()}})).assignment;
  assert.equal(configured.max_attempts,2);assert.equal(configured.score_release,'after_close');assert.equal(configured.show_explanations,true);
  const info=await request('/student/assignments/'+configured.id+'/info',{cookie:sc});assert.equal(info.config.instructions,'Đọc kỹ đơn vị.');assert.equal(info.config.answerMode,'after_close');assert.equal(info.assignment.questions,undefined);
  const firstSim=(await request('/student/start-v9/'+configured.id,{cookie:sc,body:{}})).attemptId;
  assert.equal((await request('/student/start-v9/'+configured.id,{cookie:sc,body:{retry:true}})).attemptId,firstSim);
  const actual=(await request('/student/attempt/'+firstSim,{cookie:sc})).attempt;
  assert.equal(actual.questions.find(x=>x.id==='q1').simulation,undefined);assert.equal(actual.questions.find(x=>x.id==='q2').simulation.kind,'harmonic');
  assert.ok(actual.questions.every(x=>x.answer===undefined&&x.explanation===undefined));
  assert.deepEqual((await request('/student/attempt/'+firstSim,{cookie:sc})).attempt.questions.map(x=>x.id),actual.questions.map(x=>x.id));
  await request('/student/attempt/'+firstSim+'/save',{cookie:sc,body:{answers:{q1:1,q2:5},rowVersion:0}});
  await request('/student/attempt/'+firstSim+'/submit',{cookie:sc,body:{rowVersion:1}});
  for(const endpoint of ['/student/result/'+firstSim,'/student/result/'+firstSim+'/published']){const out=await request(endpoint,{cookie:sc});assert.equal(out.result.score,null);assert.equal(out.review,null);assert.equal(out.policy.showScore,false);}
  await request('/student/result/'+firstSim+'/review',{cookie:sc,status:403});
  for(const endpoint of ['/student/dashboard','/student/dashboard-v9'])assert.equal((await request(endpoint,{cookie:sc})).assignments.find(x=>x.assignment_id===configured.id).score,null);
  const secondSim=(await request('/student/start-v9/'+configured.id,{cookie:sc,body:{retry:true}})).attemptId;assert.notEqual(secondSim,firstSim);
  // Explicit null radio answer is unanswered, never a correct A.
  await request('/student/attempt/'+secondSim+'/save',{cookie:sc,body:{answers:{q1:null},rowVersion:0}});
  await request('/student/attempt/'+secondSim+'/submit',{cookie:sc,body:{rowVersion:1}});
  assert.equal(Number((await query('SELECT score FROM attempts WHERE id=$1',[secondSim])).rows[0].score),0);
  await request('/student/start-v9/'+configured.id,{cookie:sc,body:{retry:true},status:409});
  assert.equal((await request('/student/history',{cookie:sc})).items.filter(x=>[firstSim,secondSim].includes(x.attempt_id)).length,2);
  const dash=(await request('/student/dashboard-v9',{cookie:sc})).assignments.filter(x=>x.assignment_id===configured.id);assert.equal(dash.length,1);assert.equal(dash[0].attempt_id,secondSim);
  await query("UPDATE assignments SET close_at=now()-interval '1 second' WHERE id=$1",[configured.id]);
  const afterClose=await request('/student/result/'+firstSim+'/published',{cookie:sc});assert.equal(Number(afterClose.result.score),10);assert.equal(afterClose.review.questions.find(x=>x.id==='q1').simulation.kind,'parabola');
  await request('/teacher/assignments/'+configured.id+'/policy',{cookie:tc,body:{showScore:true,showAnswers:true,showExplanations:false}});
  assert.equal((await request('/student/result/'+firstSim+'/review',{cookie:sc})).questions.find(x=>x.id==='q1').simulation,undefined);
  // Header metadata stays separate; inline choices are separate options; sections may reset numbering.
  const parsed=mod.exports.parseExamStructureV6('TẬP HỢP - ĐỀ SỐ 02\nTOÁN 10 - BẢN CHUẨN HÓA ĐỂ NHẬP AZOTA\nCấu trúc: 2 câu trắc nghiệm\nThời gian: 90 phút\nPHẦN I. TRẮC NGHIỆM\nCâu 1. 2 + 2 bằng bao nhiêu?\nA. 3  B. 4  C. 5  D. 6\nĐáp án: B\nCâu 2. Chọn số chẵn\nA. 2\nB. 3\nĐáp án: A\nPHẦN II. TỰ LUẬN\nCâu 1. Giải thích.');
  assert.equal(parsed.questions.length,3);assert.equal(parsed.meta.duration,90);assert.match(parsed.meta.title,/TẬP HỢP - ĐỀ SỐ 02/);assert.equal(parsed.questions[0].answer,1);assert.equal(parsed.questions[0].options.length,4);assert.equal(parsed.sections.length,2);
  // Real parsers, upload storage and a retained embedded image in the Word preview.
  const fixtures=require('./import-fixtures');
  for(const [name,buffer,mime] of [['test.docx',await fixtures.word(),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['test.pdf',fixtures.pdf(),'application/pdf']]){
    const form=new FormData();form.append('file',new Blob([buffer],{type:mime}),name);
    const uploaded=await fetch(base+'/api/teacher/imports',{method:'POST',headers:{Cookie:tc},body:form});assert.equal(uploaded.status,200);
    const imported=await uploaded.json(), item=(await request('/teacher/imports/'+imported.importId,{cookie:tc})).item;
    assert.equal(item.status,'ready',JSON.stringify(item.warnings));
    if(name.endsWith('docx')){assert.match(item.extracted_html,/<img/);assert.match(item.extracted_html,/data:image\/png;base64/);assert.ok(item.draft_questions.length>0);assert.equal(item.draft_questions[0].images.length,1);const analyzed=await request('/teacher/imports/'+item.id+'/analyze-v6',{cookie:tc,body:{}});assert.equal(analyzed.questions[0].images.length,1);}
    else assert.match(item.extracted_text,/VINH EXAM/);
    const original=await fetch(base+'/api/assets/'+item.asset_id,{headers:{Cookie:tc}});assert.ok(Buffer.from(await original.arrayBuffer()).equals(buffer),'Original file bytes must be preserved');
  }
  const html=await (await fetch(base)).text();assert.equal((html.match(/<script /g)||[]).length,1);assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
  const bundle=html.match(/src="(\/dist\/play\.[a-f0-9]+\.js)"/)[1];const asset=await fetch(base+bundle,{headers:{'Accept-Encoding':'gzip'}});
  assert.equal(asset.headers.get('content-encoding'),'gzip');assert.match(asset.headers.get('content-type'),/javascript/);assert.match(asset.headers.get('cache-control'),/immutable/);assert.ok((await asset.text()).includes('createAnswerSaver'));
});
