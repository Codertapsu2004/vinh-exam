const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const build=require('../scripts/build-client');
const T=require('../public/exam-tools');
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const tick=()=>new Promise(r=>setImmediate(r));
function client(fetch,reduced=false){
 const dir=path.join(__dirname,'..','public'),files=build();
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{url:'https://vinh.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.fetch=async(url,opt)=>url==='/api/auth/me'?response({},401):fetch(url,opt);w.EventSource=class{close(){}};w.matchMedia=()=>({matches:reduced,addEventListener(){}});w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
 w.eval(fs.readFileSync(path.join(dir,'dist',files.js),'utf8'));return dom;
}
test('published exam edits retain input when changing questions; failed save cannot publish; settings are explicit',async()=>{
 let exam={id:'exam',status:'published',title:'Đề Toán',subject:'Toán 10',duration:45,edit_revision:2,questions:[{id:'q1',type:'single',text:'2+2=?',points:1,options:['3','4'],answer:1},{id:'q2',type:'number',text:'2x=6',points:1,answer:3,tolerance:0}]},saved,publishes=0,fail=false;
 const dom=client(async(url,opt)=>{
  if(url==='/api/teacher/exams/exam'&&opt?.method==='PUT'){saved=JSON.parse(opt.body);if(fail)return response({message:'Không lưu được'},503);exam={...exam,...saved,edit_revision:exam.edit_revision+1};return response({exam});}
  if(url==='/api/teacher/exams/exam')return response({exam:JSON.parse(JSON.stringify(exam))});
  if(url.endsWith('/publish')){publishes++;return response({exam});}
  throw Error('Unexpected '+url);
 });
 try{await tick();const w=dom.window,d=w.document;w.eval("ME={role:'teacher',name:'GV'}");await w.examEditor('exam');assert.equal(d.querySelector('#eqText').disabled,false);assert.equal(d.querySelectorAll('.preview-card-v4').length,0);assert.equal(d.querySelectorAll('.outline-question').length,2);
  d.querySelector('#eqText').value='Nội dung được sửa';d.querySelector('#eqText').dispatchEvent(new w.Event('input',{bubbles:true}));
  w.editExamQuestion(1);d.querySelector('#eqAnswerNum').value='3,5';w.editExamQuestion(0);assert.equal(d.querySelector('#eqText').value,'Nội dung được sửa');assert.equal(w.__exam.questions[1].answer,3.5);
  await w.saveExam();assert.equal(saved.expectedRevision,2);assert.equal(saved.questions[0].text,'Nội dung được sửa');assert.equal(saved.questions[1].answer,3.5);assert.equal(exam.id,'exam');assert.equal(d.querySelector('#editorSaveState').textContent,'Đã lưu');
  await w.publishExam();assert.equal(d.querySelector('#cfgScore').value,'manual');assert.equal(d.querySelector('#cfgAnswer').value,'manual');assert.ok(d.querySelector('#cfgAttempts'));fail=true;await w.confirmConfiguredPublish();assert.equal(publishes,0);assert.match(d.querySelector('#toast').textContent,/Không lưu được/);assert.equal(d.querySelector('#confirmPublishButton').disabled,false);
 }finally{dom.window.close()}
});
test('teacher attaches model to real question; student interaction changes drawing without changing or saving answers',async()=>{
 let saves=0;
 const questions=[{id:'q1',type:'single',text:'Quan sát đồ thị',points:1,options:['A','B'],answer:0,simulation:{kind:'parabola',visibility:'exam',params:{a:1,b:0,c:0}}}];
 const dom=client(async(url,opt)=>{
  if(url.endsWith('/proctor'))return response({config:{mode:'off'}});
  if(url==='/api/teacher/exams/e')return response({exam:{id:'e',title:'Đề',subject:'Toán',status:'draft',duration:45,questions:JSON.parse(JSON.stringify(questions)),edit_revision:0}});
  if(url==='/api/student/attempt/a')return response({attempt:{id:'a',status:'in_progress',title:'Bài',examTitle:'Toán',instructions:'Làm tròn đến hàng phần trăm.',questions,answers:{},rowVersion:0,deadlineAt:new Date(Date.now()+600000).toISOString()}});
  if(url.endsWith('/save')){saves++;return response({rowVersion:1,savedAt:new Date().toISOString()});}
  throw Error('Unexpected '+url);
 },true);
 try{await tick();const w=dom.window,d=w.document;w.eval("ME={role:'teacher',name:'GV'}");await w.examEditor('e');d.querySelector('#simKind').value='harmonic';w.changeEditorSimulation();assert.equal(d.querySelector('#simVisibility').value,'review');assert.equal(d.querySelector('#simParam-period').value,'2');
  w.previewEditorQuestion(true);assert.ok(d.querySelector('.question-simulation'));assert.match(d.querySelector('.sim-caption').textContent,/cos/);w.closeModal();
  w.eval("ME={role:'student',name:'HS'}");await w.openAttempt('a');assert.match(d.querySelector('.exam-instructions').textContent,/Làm tròn/);const sim=d.querySelector('#questions .question-simulation');assert.ok(sim);const curve=sim.querySelector('.sim-curve').getAttribute('points'),slider=sim.querySelector('[data-model-param=a]');slider.value='2';slider.dispatchEvent(new w.Event('input',{bubbles:true}));assert.notEqual(sim.querySelector('.sim-curve').getAttribute('points'),curve);assert.equal(saves,0);assert.deepEqual(JSON.parse(JSON.stringify(w.__attempt.answers)),{});
 }finally{dom.window.close()}
});
test('header repair is explicit and detected import title/duration populate real fields',async()=>{
 const text='TẬP HỢP - ĐỀ SỐ 02\nTOÁN 10 - BẢN CHUẨN HÓA ĐỂ NHẬP AZOTA\nCấu trúc: 12 câu trắc nghiệm\nThời gian: 90 phút';
 assert.equal(T.headerQuestion({type:'essay',text}),true);assert.equal(T.headerQuestion({type:'essay',text:'Một chuyển động có thời gian: 5 giây. Tính vận tốc?'}),false);
 const dom=client(async()=>{throw Error('No request expected')});
 try{await tick();const w=dom.window,d=w.document;w.__importV6={id:'i',item:{original_name:'file.docx',extracted_text:text+'\nCâu 1. Chọn đáp án'},questions:[{id:'q'}],sections:[{}]};w.createExamFromImportV3('i');assert.match(d.querySelector('#impTitle').value,/TẬP HỢP - ĐỀ SỐ 02/);assert.equal(d.querySelector('#impSubject').value,'TOÁN 10');assert.equal(d.querySelector('#impDuration').value,'90');
 }finally{dom.window.close()}
});
