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
  mod._compile(code.slice(0,code.indexOf('const port = Number(process.env.PORT'))+'\nmodule.exports={app,migrate,finalizeExpiredAttempts};',filename);
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
  // Real parsers, upload storage and a retained embedded image in the Word preview.
  const fixtures=require('./import-fixtures');
  for(const [name,buffer,mime] of [['test.docx',await fixtures.word(),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['test.pdf',fixtures.pdf(),'application/pdf']]){
    const form=new FormData();form.append('file',new Blob([buffer],{type:mime}),name);
    const uploaded=await fetch(base+'/api/teacher/imports',{method:'POST',headers:{Cookie:tc},body:form});assert.equal(uploaded.status,200);
    const imported=await uploaded.json(), item=(await request('/teacher/imports/'+imported.importId,{cookie:tc})).item;
    assert.equal(item.status,'ready',JSON.stringify(item.warnings));
    if(name.endsWith('docx')){assert.match(item.extracted_html,/<img/);assert.match(item.extracted_html,/data:image\/png;base64/);assert.ok(item.draft_questions.length>0);}
    else assert.match(item.extracted_text,/VINH EXAM/);
    const original=await fetch(base+'/api/assets/'+item.asset_id,{headers:{Cookie:tc}});assert.ok(Buffer.from(await original.arrayBuffer()).equals(buffer),'Original file bytes must be preserved');
  }
  const html=await (await fetch(base)).text();assert.equal((html.match(/<script /g)||[]).length,1);assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
  const bundle=html.match(/src="(\/dist\/play\.[a-f0-9]+\.js)"/)[1];const asset=await fetch(base+bundle,{headers:{'Accept-Encoding':'gzip'}});
  assert.equal(asset.headers.get('content-encoding'),'gzip');assert.match(asset.headers.get('content-type'),/javascript/);assert.match(asset.headers.get('cache-control'),/immutable/);assert.ok((await asset.text()).includes('createAnswerSaver'));
});
