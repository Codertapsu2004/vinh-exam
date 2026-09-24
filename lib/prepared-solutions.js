'use strict';
const crypto=require('node:crypto');
const {normalizeSolution,context,solutionSchema}=require('./ai-provider');
const FORMAT='vinh-exam-solutions/v1';
const MAX_BYTES=1024*1024;
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function questionData(q){return {id:q.id,type:q.type,text:q.text,options:q.options||[],statements:q.statements||[],answer:q.answer??null,tolerance:q.tolerance??null,images:q.images||[]};}
function fingerprint(a){return digest((a.questions||[]).map(questionData));}
function template(a,existing){
 const map=new Map((existing?.fingerprint===fingerprint(a)?existing.items:[]).map(x=>[x.questionId,x.solution]));
 return {format:FORMAT,assignmentId:a.id,examFingerprint:fingerprint(a),title:a.title||a.exam_title,context:context(a.ai_context,a),
  instructions:'Soạn lời giải tiếng Việt cho từng câu theo đúng lớp và chủ đề. Giữ nguyên assignmentId, examFingerprint, questionId và number. Điền solution, không sửa question. Tự giải và kiểm tra đáp án; nếu thiếu ảnh/dữ kiện hoặc đáp án sai, để solution=null và ghi reviewNote, không bịa. Công thức LaTeX đặt trong \\( \\) hoặc \\[ \\]. Phải escape dấu gạch chéo trong chuỗi JSON. Trả lại một file JSON theo cấu trúc này, không chỉ trả bảng văn bản. Không đưa dữ liệu học sinh vào file.',
  visualInstructions:'Tự chọn hình cần thiết và điền solution.visual theo solutionSchema; không cần hình thì null. Chỉ dùng dữ liệu JSON, không HTML/SVG/JavaScript. diagram: cùng tỉ lệ hai trục; plot: y=a*x^2+b*x+c; motion: x=x0+v0*t+acceleration*t^2/2; harmonic: x=A*cos(2*pi*t/period+phase); wave: u=A*cos(2*pi*t/period-direction*2*pi*x/wavelength+phase). Phase tính bằng radian. Miền vẽ phải đủ bao quát dữ kiện. Hình gốc không nằm trong file này: xem file đề gốc được gửi kèm, không suy đoán từ tên ảnh.',
  solutionSchema,
  items:(a.questions||[]).map((q,i)=>({questionId:q.id,number:i+1,question:questionData(q),reviewNote:'',solution:map.get(q.id)||null}))};
}
function parseText(text){
 const lines=text.replace(/\r\n?/g,'\n').split('\n'),items=[];let current=null;
 for(const line of lines){
  const match=line.match(/^\s*(?:#{1,4}\s*)?(?:\*\*)?Câu\s+(\d+)\s*[.:)\-–]\s*(?:\*\*)?(.*)$/iu);
  if(match){current={number:Number(match[1]),lines:[match[2]]};items.push(current);}
  else if(current)current.lines.push(line);
  else if(line.trim())fail('Văn bản cần bắt đầu bằng “Câu 1.”. Đánh số liên tục theo thứ tự trong đề, không đánh lại từ 1 ở mỗi phần.');
 }
 if(!items.length)fail('Chưa nhận diện được câu. Dùng “Câu 1.”, “Câu 2.” hoặc nhập file JSON theo mẫu.');
 return {items:items.map(x=>({number:x.number,explanation:x.lines.join('\n').trim()}))};
}
function parse(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES)fail('Nội dung lời giải phải là văn bản và không quá 1 MB.');
 let text=raw.replace(/^\uFEFF/,'').trim();if(!text)fail('Bạn chưa nhập lời giải.');
 const fence=text.match(/^```(?:json|txt|text|markdown)?\s*\n([\s\S]*?)\n```$/i);if(fence)text=fence[1].trim();
 if(/^[\[{]/.test(text)){
  let data;try{data=JSON.parse(text);}catch{fail('File JSON chưa đúng định dạng. Kiểm tra dấu phẩy, dấu ngoặc và công thức LaTeX; có thể dùng văn bản “Câu 1.” nếu chỉ nhập lời giải chữ.');}
  if(Array.isArray(data))data={items:data};
  if(!data||typeof data!=='object'||!Array.isArray(data.items))fail('File JSON cần có danh sách items như mẫu của đề.');
  if(data.format&&data.format!==FORMAT)fail('Phiên bản file lời giải chưa được hỗ trợ. Hãy tải mẫu mới.');
  return data;
 }
 return parseText(text);
}
function prepare(a,raw,existing=null){
 const data=parse(raw),questions=a.questions||[],fp=fingerprint(a);
 if(data.assignmentId&&data.assignmentId!==a.id)fail('File này thuộc bài giao khác. Hãy tải mẫu đúng bài giao.');
 if(data.examFingerprint&&data.examFingerprint!==fp)fail('Nội dung đề đã thay đổi so với file lời giải. Hãy tải mẫu mới và kiểm tra lại.',409);
 if(!data.items.length||data.items.length>500)fail('File cần có từ 1 đến 500 câu.');
 const byId=new Map(questions.map((q,i)=>[q.id,{q,i}])),seen=new Set(),incoming=[],warnings=[],skipped=[];
 if(!data.examFingerprint)warnings.push('File không có dấu kiểm tra phiên bản đề. Hãy đối chiếu nội dung từng câu trong bản xem trước.');
 let unchecked=0;
 for(const item of data.items){
  if(!item||typeof item!=='object')fail('Có câu sai cấu trúc trong file.');
  let match;
  if(item.questionId!==undefined){match=byId.get(item.questionId);if(!match)fail('Có mã câu không thuộc đề này. Hãy dùng mẫu tải từ đúng bài giao.');}
  else if(Number.isInteger(item.number)&&item.number>=1&&item.number<=questions.length)match={q:questions[item.number-1],i:item.number-1};
  if(!match)fail('Mỗi lời giải cần questionId hoặc số câu hợp lệ trong đề.');
  const {q,i}=match,n=i+1;
  if(item.number!==undefined&&item.number!==n)fail(`Mã câu và số thứ tự không khớp ở câu ${n}.`);
  if(seen.has(q.id))fail(`Câu ${n} bị lặp. Dùng số thứ tự liên tục cho cả đề.`);seen.add(q.id);
  if(item.question&&digest(questionData(item.question))!==digest(questionData(q)))fail(`Nội dung câu ${n} trong file không khớp đề hiện tại.`,409);
  let rawSolution=item.solution;
  if(rawSolution===null){skipped.push(n);continue;}
  if(typeof item.explanation==='string'){
   const text=item.explanation.trim();if(!text)fail(`Câu ${n} chưa có lời giải.`);
   const conclusion=text.match(/(?:^|\n)\s*(?:Kết luận|Đáp số|Kết quả)\s*:\s*([^\n]+)\s*$/iu)?.[1]||'Xem kết quả và lập luận ở phần lời giải trên.';
   rawSolution={knowledge:[],steps:[{title:'Lời giải chi tiết',text,formula:''}],conclusion,commonMistake:'',visual:null};
  }
  if(!rawSolution||typeof rawSolution!=='object'||Array.isArray(rawSolution))fail(`Câu ${n} cần có solution hoặc explanation.`);
  if(rawSolution.status&&rawSolution.status!=='ready')fail(`Câu ${n} đang được đánh dấu cần kiểm tra. Hãy sửa lời giải hoặc để solution=null để nhập sau.`);
  const checked=Object.hasOwn(rawSolution,'answer')&&q.type!=='essay';
  if(!checked&&q.type!=='essay')unchecked++;
  let solution;try{
   solution=normalizeSolution({...rawSolution,status:'ready',reason:'',knowledge:rawSolution.knowledge||[],commonMistake:rawSolution.commonMistake||'',answer:checked?rawSolution.answer:(q.answer??null),visual:rawSolution.visual??null,steps:Array.isArray(rawSolution.steps)?rawSolution.steps.map(s=>({...s,formula:s.formula||''})):rawSolution.steps},q);
  }catch(error){fail(`Câu ${n}: ${error.message.replaceAll(' AI','')}`);}
  if(solution.status!=='ready')fail(`Câu ${n}: kết quả trong lời giải không khớp đáp án chấm. Hãy kiểm tra đề và lời giải; hệ thống không tự sửa đáp án.`);
  if(solution.steps.some(s=>!s.text.trim()&&!s.formula.trim()))fail(`Câu ${n} có bước giải còn trống.`);
  if(JSON.stringify(solution).length>100000)fail(`Lời giải câu ${n} quá dài.`);
  incoming.push({questionId:q.id,number:n,solution:{...solution,source:'prepared'},answerChecked:checked});
 }
 if(!incoming.length)fail('File chưa có lời giải nào để nhập. Điền solution cho ít nhất một câu; các câu chưa soạn có thể giữ null.');
 if(unchecked)warnings.push(`${unchecked} câu chưa có đáp án riêng để đối chiếu tự động; giáo viên cần kiểm tra kết quả và các bước giải.`);
 const old=existing?.fingerprint===fp?existing.items:[],merged=new Map((old||[]).map(x=>[x.questionId,x]));
 const replaced=incoming.filter(x=>merged.has(x.questionId)).length;
 incoming.forEach(x=>merged.set(x.questionId,x));
 const items=[...merged.values()].sort((a,b)=>a.number-b.number),missing=questions.filter(q=>!merged.has(q.id)).map(q=>questions.indexOf(q)+1);
 if(replaced)warnings.push(`${replaced} lời giải đã lưu sẽ được thay bằng bản vừa nhập. Các câu khác được giữ nguyên.`);
 if(missing.length)warnings.push(`${missing.length} câu chưa có lời giải. Bạn có thể bổ sung sau.`);
 const baseRevision=a.prepared_solution_id||null;
 return {fingerprint:fp,baseRevision,previewToken:digest({fp,baseRevision,items}),items,imported:incoming.length,replaced,retained:items.length-incoming.length,total:questions.length,ready:items.length,visuals:items.filter(x=>x.solution.visual).length,missing,skipped,warnings,preview:incoming.map(x=>({...x,question:questionData(questions[x.number-1])}))};
}
function createPreparedService({q}){
 async function get(a){if(!a.prepared_solution_id)return null;return (await q('SELECT * FROM prepared_solution_sets WHERE id=$1 AND assignment_id=$2',[a.prepared_solution_id,a.assignment_id||a.id])).rows[0]||null;}
 async function summary(a,full=false){const set=await get(a);if(!set)return null;const valid=set.fingerprint===fingerprint(a);return {id:set.id,ready:valid?set.items.length:0,total:(a.questions||[]).length,visuals:valid?set.items.filter(x=>x.solution.visual).length:0,stale:!valid,createdAt:set.created_at,...(full&&valid?{items:set.items}:{} )};}
 async function preview(a,raw){return prepare(a,raw,await get(a));}
 async function save(tx,a,body){
  if(body.reviewed!==true)fail('Cần xác nhận đã kiểm tra nội dung và hình trong bản xem trước.');
  const p=await preview(a,body.content);
  if(body.previewToken!==p.previewToken)fail('Bản xem trước đã cũ hoặc nội dung vừa thay đổi. Hãy bấm Xem trước lại.',409);
  const set=(await tx.query('INSERT INTO prepared_solution_sets(assignment_id,owner_id,fingerprint,items) VALUES($1,$2,$3,$4) RETURNING id',[a.id,a.teacher_id,p.fingerprint,JSON.stringify(p.items)])).rows[0];
  // Saving a new version never publishes it implicitly, even if the previous version was visible.
  await tx.query('UPDATE assignments SET prepared_solution_id=$1,ai_enabled=false,show_explanations=false WHERE id=$2',[set.id,a.id]);
  return {id:set.id,ready:p.ready,total:p.total,visuals:p.visuals};
 }
 async function enrich(a,out){
  if(!out.review||!out.policy.showExplanations||!a.prepared_solution_id||a.ai_enabled)return out;
  const set=await get(a);if(!set||set.fingerprint!==fingerprint(a))return out;
  const map=new Map(set.items.map(x=>[x.questionId,x.solution]));
  out.review.questions=out.review.questions.map(question=>({...question,aiSolution:map.get(question.id)||null,aiState:map.has(question.id)?'ready':'unavailable',solutionSource:'prepared'}));
  out.review.ai={ready:set.items.length,total:(a.questions||[]).length,pending:false,source:'prepared'};
  return out;
 }
 return {get,summary,preview,save,enrich,template:async a=>template(a,await get(a))};
}
module.exports={FORMAT,MAX_BYTES,questionData,fingerprint,template,parse,prepare,createPreparedService};
