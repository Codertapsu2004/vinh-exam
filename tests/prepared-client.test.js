const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const build=require('../scripts/build-client');
const P=require('../lib/prepared-solutions');
const tick=()=>new Promise(r=>setImmediate(r));
function client(handler){const files=build(),root=path.join(__dirname,'..','public');const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://exam.test',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;w.fetch=async(url,opt)=>url==='/api/auth/me'?{ok:false,status:401,json:async()=>({})}:{ok:true,status:200,json:async()=>handler(url,opt)};w.matchMedia=()=>({matches:true,addEventListener(){}});w.EventSource=class{close(){}};w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});w.eval(fs.readFileSync(path.join(root,'dist',files.js),'utf8'));return dom;}
test('free teacher flow previews, requires review, invalidates edits and saves without enabling AI',async()=>{
 const assignment={id:'as',title:'Đề Toán 10',questions:[{id:'q',text:'Tính 2 + 2',type:'number',answer:4}]};
 const release={assignment:{id:'as',title:assignment.title,showScore:false,showAnswers:false,showExplanations:false,aiEnabled:true},context:{grade:10},counts:{graded:1,pending:0},aiAvailable:false,aiConfigured:false,prepared:null};
 const calls=[];let saved,policy;
 const dom=client(async(url,opt)=>{calls.push(url);if(url==='/api/teacher/assignments/as/release'){if(opt?.method==='POST'){policy=JSON.parse(opt.body);release.assignment.showExplanations=policy.explanations;release.assignment.aiEnabled=policy.ai;}return release;}
  if(url.endsWith('/solutions/preview'))return P.prepare(assignment,JSON.parse(opt.body).content);
  if(url.endsWith('/solutions')){saved=JSON.parse(opt.body);release.prepared={ready:1,total:1,visuals:0,items:P.prepare(assignment,saved.content).items};release.assignment.aiEnabled=false;return {ok:true};}throw Error(url);});
 try{await tick();const w=dom.window,d=w.document;await w.openResultRelease('as');assert.ok(d.querySelector('.prepared-panel'));assert.equal(d.querySelector('.ai-provider-options').hidden,true);assert.equal(d.querySelector('#releaseAI').checked,false);
  await w.openSolutionImport('as');const text=d.querySelector('#solutionImportText');text.value='Câu 1.\n<script>alert(1)</script>\nTa có 2 + 2 = 4.\nKết luận: 4.';text.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.querySelector('#previewPreparedButton').click();await tick();await tick();assert.match(d.querySelector('#solutionImportPreview').textContent,/1\/1/);assert.equal(d.querySelector('#solutionImportPreview script'),null);assert.equal(d.querySelector('#savePreparedButton').disabled,true);
  d.querySelector('#preparedReviewed').click();assert.equal(d.querySelector('#savePreparedButton').disabled,false);text.value+='\nĐã kiểm tra.';text.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#savePreparedButton').disabled,true);assert.equal(d.querySelector('#preparedReviewed'),null);
  d.querySelector('#previewPreparedButton').click();await tick();await tick();d.querySelector('#preparedReviewed').click();d.querySelector('#savePreparedButton').click();await tick();await tick();assert.equal(saved.reviewed,true);assert.equal(typeof saved.previewToken,'string');assert.match(d.querySelector('.prepared-panel').textContent,/1\/1/);assert.equal(d.querySelector('#releaseExisting').checked,false);
  d.querySelector('#releaseExisting').click();w.syncReleaseChoices(false,true);assert.equal(d.querySelector('#releaseAnswers').checked,true);await w.saveResultRelease('as');assert.equal(policy.ai,false);assert.equal(policy.explanations,true);assert.equal(calls.some(x=>x.includes('ai-retry')),false);
 }finally{dom.window.close();}
});
test('prepared visual is interactive and labelled as a saved solution, then disappears when publication is revoked',async()=>{
 const visual={kind:'harmonic',caption:'Li độ của vật',xLabel:'t (s)',yLabel:'x (cm)',xMin:0,xMax:4,yMin:-3,yMax:3,timeEnd:4,amplitude:2,period:2,phase:0};
 const s={status:'ready',source:'prepared',knowledge:['Dao động điều hòa'],steps:[{title:'Thay thời gian',text:'Thay t vào phương trình đã cho.',formula:'\\(x=2\\cos(\\pi t)\\)'}],conclusion:'Tại t = 0, x = 2 cm.',visual};
 let show=true;const dom=client(async()=>({result:{id:'a',title:'Bài kiểm tra',status:'graded',score:8,max_score:10},policy:{showScore:true,showAnswers:true,showExplanations:show},review:{answers:{q:0},questions:[{id:'q',type:'single',text:'Tính li độ',options:['2','0'],answer:0,aiSolution:s}],ai:{ready:1,total:1,pending:false,source:'prepared'}}}));
 try{await tick();const w=dom.window,d=w.document;w.eval("ME={role:'student',name:'HS kiểm thử'}");await w.showResult('a');assert.ok(!d.querySelector('.ai-solution summary').textContent.includes('AI'));assert.ok(!d.querySelector('.ai-student-status').textContent.includes('tự động'));assert.equal(d.querySelector('.ai-student-status button'),null);
  const root=d.querySelector('.ai-visual'),before=root.querySelector('circle').getAttribute('cy'),slider=root.querySelector('[data-ai-time]');slider.value='1';slider.dispatchEvent(new w.Event('input',{bubbles:true}));assert.notEqual(root.querySelector('circle').getAttribute('cy'),before);root.querySelector('[data-ai-reset]').click();assert.equal(slider.value,'0');
  show=false;await w.showResult('a');assert.equal(d.querySelector('.ai-solution'),null);assert.equal(d.querySelector('.ai-visual'),null);
 }finally{dom.window.close();}
});
