const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const T=require('../public/exam-tools');
const {parseExamStructureV6:parse,parseNumberV6}=require('../lib/exam-import');
const tick=()=>new Promise(r=>setImmediate(r));
const response=data=>({ok:true,status:200,json:async()=>data});
function client(handler){const files=require('../scripts/build-client')(),root=path.join(__dirname,'../public'),dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://exam.test',runScripts:'outside-only',pretendToBeVisual:true});dom.window.fetch=async(url,options)=>url==='/api/auth/me'?{ok:false,status:401,json:async()=>({})}:response(await handler(url,options));dom.window.scrollTo=()=>{};dom.window.eval(fs.readFileSync(path.join(root,'dist',files.js),'utf8'));return dom;}
const choice=(n,text)=>`Câu ${n}. ${text}\nA. Một\nB. Hai`;
test('answer keys are scoped to sections; conflicting/ambiguous keys stay unresolved; numeric fractions are exact',()=>{
 const out=parse('TOÁN 10\nThời gian: 90 phút\nPHẦN I. TRẮC NGHIỆM\n'+choice(1,'Chọn một')+'\nPHẦN II. TRẮC NGHIỆM\n'+choice(1,'Chọn hai')+'\nĐÁP ÁN\nPHẦN I\n1. A\nPHẦN II\n1. B');
 assert.equal(out.questions.length,2);assert.equal(out.sections.length,2);assert.deepEqual(out.questions.map(q=>q.answer),[0,1]);assert.ok(out.questions.every(q=>!q.text.includes('ĐÁP ÁN')));assert.equal(out.meta.duration,90);
 const ambiguous=parse('PHẦN I. TRẮC NGHIỆM\n'+choice(1,'Một')+'\nPHẦN II. TRẮC NGHIỆM\n'+choice(1,'Hai')+'\nĐÁP ÁN\n1. A');assert.ok(ambiguous.questions.every(q=>q.answer===null));
 const conflict=parse(choice(1,'Một')+'\nĐáp án: B\nĐÁP ÁN\n1. A');assert.equal(conflict.questions[0].answer,null);assert.equal(conflict.questions[0].answerSource,'conflict');
 assert.equal(parseNumberV6('1/2'),.5);assert.equal(parseNumberV6('-1,25'),-1.25);assert.equal(parseNumberV6('3/0'),null);assert.equal(parseNumberV6('x = 3 or 4'),null);
});
test('Word answer recognition only trusts explicit underlined labels and flags conflicting keys',async()=>{
 const JSZip=require('jszip'),base=await require('./import-fixtures').word(),zip=await JSZip.loadAsync(base),p='word/document.xml';let xml=await zip.file(p).async('string');xml=xml.replace('<w:r><w:t>B. 4</w:t></w:r>','<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>B.</w:t></w:r><w:r><w:t> 4</w:t></w:r>');zip.file(p,xml);
 const qs=parse('Câu 1. Tổng?\nA. 3\nB. 4\nC. 5\nD. 6').questions;await require('../lib/docx-answers')(await zip.generateAsync({type:'nodebuffer'}),qs);assert.equal(qs[0].answer,1);assert.equal(qs[0].answerSource,'underline');
 qs[0].answer=0;qs[0].answerSource='inline';await require('../lib/docx-answers')(await zip.generateAsync({type:'nodebuffer'}),qs);assert.equal(qs[0].answer,null);assert.equal(qs[0].answerSource,'conflict');
});
test('section scoring preserves exact 10 points, unrelated sections, and rejects duplicate membership',()=>{
 const qs=Array.from({length:7},(_,i)=>({id:'q'+i,points:1}));T.distributePoints(qs,qs.map(q=>q.id),10);assert.equal(Math.round(qs.reduce((s,q)=>s+q.points,0)*10000),100000);
 const sections=T.sections(qs,[{id:'s1',title:'Phần 1',questionIds:['q0','q1','q2']},{id:'s2',title:'Phần 2',questionIds:['q3','q4','q5','q6']}]);const before=qs[6].points;T.distributePoints(qs,sections[0].questionIds,3);assert.equal(qs[6].points,before);assert.equal(T.sections(qs,sections)[0].points,3);
 assert.throws(()=>T.sections(qs,[{id:'s1',questionIds:['q0']},{id:'s2',questionIds:['q0']}]),/một phần/);assert.throws(()=>T.distributePoints(qs,['q0'],NaN));
});
test('import wizard edits a key, preserves it through section allocation, saves metadata and creates a draft with the same points',async()=>{
 const qs=[{id:'q1',type:'single',text:'2 + 2 = ?',options:['3','4'],answer:null,points:1},{id:'q2',type:'number',text:'3/2 = ?',answer:1.5,points:1,tolerance:0}];let reviewed,created;
 const dom=client(async(url,opt)=>{if(url.endsWith('/analyze-v6'))return {item:{asset_id:'asset',original_name:'De-Toan.docx',warnings:[]},questions:qs,sections:[],meta:{title:'Đề Toán',subject:'Toán 10',duration:45}};if(url.endsWith('/review-v6')){reviewed=JSON.parse(opt.body);return {ok:true};}if(url.endsWith('/create-exam-v6')){created=JSON.parse(opt.body);return {exam:{id:'created'}};}if(url==='/api/teacher/exams/created')return {exam:{id:'created',status:'draft',title:created.title,duration:created.duration,questions:created.questions,sections:created.sections}};throw Error(url);});
 try{await tick();const w=dom.window,d=w.document;w.eval("ME={role:'teacher',name:'GV'}");await w.openImportV3('imp');assert.equal(d.querySelectorAll('[name=importCorrect]:checked').length,0);
  const correct=d.querySelector('[name=importCorrect][value="1"]');correct.checked=true;correct.dispatchEvent(new w.Event('change',{bubbles:true}));await w.importStep(3);assert.equal(reviewed.questions[0].answer,1);
  w.distributeImportTen();assert.equal(d.querySelector('#importTotal').textContent,'10');const individual=d.querySelector('[data-imp=points][data-at="0"]');individual.value='4';individual.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#sectionPoints0').value,'9');
  const title=d.querySelector('#importTitle');title.value='Kiểm tra Toán 10';title.dispatchEvent(new w.Event('input',{bubbles:true}));await w.createWorkspaceExam();assert.equal(created.title,'Kiểm tra Toán 10');assert.equal(created.questions[0].answer,1);assert.equal(created.sections[0].points,9);assert.equal(reviewed.metadata.title,'Kiểm tra Toán 10');assert.ok(d.querySelector('.pedagogy-editor'));assert.equal(created.questions.length,2);
 }finally{dom.window.close();}
});
test('grading requires each essay score and keeps publication controls separate, without AI requests or controls',async()=>{
 let saved;const dom=client(async(url,opt)=>{if(url.endsWith('/grading'))return {attempt:{student_name:'HS',exam_title:'Đề',status:'pending_manual',questions:[{id:'e1',type:'essay',text:'Giải thích',points:2},{id:'e2',type:'essay',text:'Lập luận',points:3}],answers:{e1:'Trình bày',e2:'Nội dung'}},objectiveScore:5,maxManual:5,maxScore:10,release:{assignment:{id:'a',showScore:false,showAnswers:false,showExplanations:false}}};if(url.endsWith('/grade-and-release')){saved=JSON.parse(opt.body);return {score:9,assignmentId:'a'};}if(url.endsWith('/pending'))return {attempts:[]};throw Error(url);});
 try{await tick();const w=dom.window,d=w.document;w.eval("ME={role:'teacher',name:'GV'}");await w.openGrade('a');assert.equal(d.querySelector('#releaseAI'),null);await w.saveGrade('a',false);assert.equal(saved,undefined);assert.equal(d.querySelector('#gradingError').hidden,false);
  d.querySelector('[data-manual-score=e1]').value='1';d.querySelector('[data-manual-score=e2]').value='3';w.updateGradeTotal();assert.equal(d.querySelector('#gradeTotal').textContent,'9');await w.saveGrade('a',false);assert.deepEqual(saved.scores,{e1:1,e2:3});assert.equal(saved.publication,undefined);
 }finally{dom.window.close();}
});
