const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const build = require('../scripts/build-client');
const root=path.join(__dirname,'..','public');
function client(fetch) {
  const files=build();
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://vinh.test',runScripts:'outside-only',pretendToBeVisual:true});
  dom.window.fetch=fetch;dom.window.EventSource=class {close(){this.closed=true}};
  dom.window.eval(fs.readFileSync(path.join(root,'dist',files.js),'utf8'));
  return dom;
}
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const tick=()=>new Promise(r=>setImmediate(r));
test('login submits once; all core scripts are installed before boot; exam filtering uses existing data',async()=>{
  let logins=0,lists=0;
  const dom=client(async(url,opt)=>{
    if(url==='/api/auth/me')return response({},401);
    if(url==='/api/auth/login'){logins++;await tick();return response({user:{id:'t',role:'teacher',name:'Giáo viên thử'}});}
    if(url==='/api/teacher/dashboard')return response({stats:{classes:1,exams:2,active:0,pending:0},recent:[]});
    if(url==='/api/teacher/exams'){lists++;return response({exams:[{id:'one',title:'Dao động',subject:'Vật lí',status:'draft',question_count:5,duration:45,max_score:10},{id:'two',title:'Hàm số',subject:'Toán',status:'published',question_count:10,duration:30,max_score:10}]});}
    throw Error('Unexpected request '+url);
  });
  try{
    await tick();const w=dom.window,d=w.document;
    d.querySelector('#loginName').value='teacher';d.querySelector('#password').value='testing123';
    d.querySelector('#loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
    d.querySelector('#loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
    await tick();await tick();assert.equal(logins,1);assert.equal(d.querySelector('#app').classList.contains('hidden'),false);
    assert.match(d.querySelector('#page').textContent,/Việc cần xử lý hôm nay/);assert.equal(d.querySelectorAll('.nav-btn').length,8);
    await w.route('exams');assert.equal(d.querySelectorAll('.exam-card').length,2);
    const search=d.querySelector('#examSearch');search.value='dao';search.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.exam-card').length,1);assert.match(d.querySelector('.exam-card').textContent,/Dao động/);assert.equal(lists,1);
    await w.route('tools');assert.match(d.querySelector('#page').textContent,/Phiên bản đề/);
  }finally{dom.window.close();}
});
test('failed answer save prevents manual submission and leaving the exam; successful retry submits',async()=>{
  let fail=true,submissions=0;
  const dom=client(async(url,opt)=>{
    if(url==='/api/auth/me')return response({},401);
    if(url.endsWith('/proctor'))return response({config:{mode:'off'}});
    if(url==='/api/student/attempt/a')return response({attempt:{id:'a',status:'in_progress',deadlineAt:new Date(Date.now()+600000).toISOString(),serverNow:new Date().toISOString(),rowVersion:0,answers:{},questions:[{id:'q',type:'single',text:'2 + 2 = ?',options:['3','4'],points:10}],title:'Kiểm tra',examTitle:'Toán'}});
    if(url.endsWith('/save'))return fail?response({message:'Mất kết nối'},503):response({rowVersion:1,savedAt:new Date().toISOString()});
    if(url.endsWith('/submit')){submissions++;return response({ok:true,status:'graded'});}
    if(url.includes('/result'))return response({result:{id:'a',title:'Kiểm tra',exam_title:'Toán',status:'graded',score:10,max_score:10,questions:[],policy:{showScore:true}}});
    throw Error('Unexpected '+url);
  });
  try{
    await tick();const w=dom.window,d=w.document;w.eval("ME={id:'s',role:'student',name:'Học sinh thử'}");
    await w.openAttempt('a');const answer=d.querySelector('input[value="1"]');answer.checked=true;answer.dispatchEvent(new w.Event('change'));
    await w.submitExam();await d.querySelector('#confirmYes').onclick();assert.equal(submissions,0);assert.match(d.querySelector('#saveState').textContent,/Chưa lưu/);
    await w.route('home');assert.ok(d.querySelector('#questions'));assert.equal(w.__attempt.saver.dirty,true);
    fail=false;await w.submitExam();await d.querySelector('#confirmYes').onclick();assert.equal(submissions,1);assert.equal(w.__attempt,null);
  }finally{dom.window.close();}
});
test('navigation closes monitor stream and reports rejected async routes',async()=>{
  const dom=client(async url=>url==='/api/auth/me'?response({user:{role:'teacher',name:'Thử'}}):url==='/api/teacher/dashboard'?response({stats:{classes:0,exams:0,active:0,pending:0},recent:[]}):response({message:'Thử lỗi máy chủ'},500));
  try{await tick();await tick();const w=dom.window;let closed=false;w.__vinhExamMonitorES={close(){closed=true}};await w.route('classes');assert.equal(closed,true);assert.match(w.document.querySelector('#page').textContent,/Thử lỗi máy chủ/);}
  finally{dom.window.close();}
});
