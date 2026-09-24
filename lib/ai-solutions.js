'use strict';
const crypto=require('node:crypto');
const {createProvider,context,validateContext}=require('./ai-provider');
function createService({q,pool,provider=createProvider(),env=process.env}){
 let busy=false,timer;
 function defaults(a){return context(a.ai_context,a);}
 function policy(body,a){
  const p={score:body.score??a.show_score,answers:body.answers??a.show_answers,ai:body.ai??a.ai_enabled,explanations:body.explanations??a.show_explanations,timing:body.timing||'immediate'};
  if(!['immediate','after_close'].includes(p.timing))throw Error('Thời điểm công bố không hợp lệ.');
  for(const key of ['score','answers','ai','explanations'])if(typeof p[key]!=='boolean')throw Error('Lựa chọn công bố không hợp lệ.');
  if(p.ai&&!p.answers)throw Error('Cần cho xem đáp án để công bố lời giải AI.');
  const ctx=context(body.context||a.ai_context,a);if(p.ai)validateContext(ctx);
  return {...p,explanations:p.answers&&(p.ai||p.explanations),context:ctx};
 }
 async function enqueue(tx,a,ctx){
  const questions=a.questions||[];if(!questions.length)throw Error('Đề chưa có câu hỏi.');
  const model=provider.model();
  const hash=crypto.createHash('sha256').update(JSON.stringify({version:1,questions,context:ctx,model})).digest('hex');
  let job=(await tx.query('SELECT * FROM ai_solution_jobs WHERE assignment_id=$1 AND content_hash=$2',[a.id,hash])).rows[0];
  if(!job){
   await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.teacher_id]);
   const used=Number((await tx.query("SELECT count(*)::int n FROM ai_solution_items i JOIN ai_solution_jobs j ON j.id=i.job_id WHERE j.owner_id=$1 AND j.created_at>=date_trunc('day',now())",[a.teacher_id])).rows[0].n);
   const limit=Math.max(1,Number(env.AI_DAILY_QUESTION_LIMIT)||120);
   if(used+questions.length>limit)throw Object.assign(Error(`Đã chạm giới hạn tạo lời giải ${limit} câu/ngày. Điểm có thể được lưu và công bố riêng.`),{status:429});
   job=(await tx.query('INSERT INTO ai_solution_jobs(assignment_id,owner_id,content_hash,context,status,model) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[a.id,a.teacher_id,hash,JSON.stringify(ctx),provider.configured()?'queued':'waiting_connection',model])).rows[0];
   for(let i=0;i<questions.length;i++)await tx.query('INSERT INTO ai_solution_items(job_id,question_id,position,question) VALUES($1,$2,$3,$4)',[job.id,questions[i].id,i,JSON.stringify(questions[i])]);
  }
  await tx.query('UPDATE assignments SET ai_job_id=$1 WHERE id=$2',[job.id,a.id]);return job;
 }
 async function applyPolicy(tx,a,p){
  await tx.query('UPDATE assignments SET show_score=$1,score_release=$2,show_answers=$3,answer_release=$4,show_explanations=$5,ai_enabled=$6,ai_context=$7 WHERE id=$8',[p.score,p.score?p.timing:'manual',p.answers,p.answers?p.timing:'manual',p.explanations,p.ai,JSON.stringify(p.context),a.id]);
  let job=null;if(p.ai)job=await enqueue(tx,a,p.context);return job;
 }
 async function summary(jobId,includeSolutions=false){
  if(!jobId)return null;
  const job=(await q('SELECT id,status,context,created_at,updated_at FROM ai_solution_jobs WHERE id=$1',[jobId])).rows[0];if(!job)return null;
  const items=(await q(`SELECT question_id,position,status,reason,tries${includeSolutions?',solution,question':''} FROM ai_solution_items WHERE job_id=$1 ORDER BY position`,[jobId])).rows;
  return {...job,done:items.filter(x=>['ready','needs_review','error'].includes(x.status)).length,total:items.length,ready:items.filter(x=>x.status==='ready').length,items};
 }
 async function refresh(jobId){
  const counts=(await q('SELECT status,count(*)::int n FROM ai_solution_items WHERE job_id=$1 GROUP BY status',[jobId])).rows;
  const tally=Object.fromEntries(counts.map(x=>[x.status,x.n]));
  const status=tally.pending||tally.running?'running':tally.needs_review||tally.error?(tally.ready||tally.needs_review?'partial':'failed'):'ready';
  await q('UPDATE ai_solution_jobs SET status=$1,updated_at=now() WHERE id=$2',[status,jobId]);
 }
 async function runOne(){
  if(!provider.configured())return false;
  await q("UPDATE ai_solution_jobs SET status='queued',updated_at=now() WHERE status='waiting_connection'");
  const stale=(await q("UPDATE ai_solution_items SET status='error',reason='Tác vụ bị gián đoạn. Giáo viên có thể thử lại.',updated_at=now() WHERE status='running' AND locked_at<now()-interval '10 minutes' RETURNING job_id")).rows;
  for(const id of new Set(stale.map(x=>x.job_id)))await refresh(id);
  const item=(await q(`WITH candidate AS (SELECT i.id FROM ai_solution_items i JOIN ai_solution_jobs j ON j.id=i.job_id JOIN assignments a ON a.ai_job_id=j.id WHERE i.status='pending' AND a.ai_enabled=true AND EXISTS(SELECT 1 FROM attempts at WHERE at.assignment_id=a.id AND at.status='graded') ORDER BY j.created_at,i.position FOR UPDATE OF i SKIP LOCKED LIMIT 1) UPDATE ai_solution_items i SET status='running',tries=tries+1,locked_at=now(),updated_at=now() FROM candidate WHERE i.id=candidate.id RETURNING i.*`)).rows[0];
  if(!item)return false;
  await q("UPDATE ai_solution_jobs SET status='running',updated_at=now() WHERE id=$1",[item.job_id]);
  try{
   const job=(await q('SELECT context,owner_id FROM ai_solution_jobs WHERE id=$1',[item.job_id])).rows[0];
   const images=[];let bytes=0;
   for(const image of (item.question.images||[]).slice(0,4)){
    const asset=(await q('SELECT data,mime_type FROM assets WHERE id=$1 AND owner_id=$2',[image.assetId,job.owner_id])).rows[0];
    if(!asset||!['image/png','image/jpeg','image/webp','image/gif'].includes(asset.mime_type))throw Object.assign(Error('Ảnh đề chưa đọc được. Cần kiểm tra hình gốc.'),{needsReview:true});
    const data=Buffer.from(asset.data);bytes+=data.length;if(bytes>16*1024*1024)throw Object.assign(Error('Hình đề quá lớn để phân tích tự động.'),{needsReview:true});
    images.push('data:'+asset.mime_type+';base64,'+data.toString('base64'));
   }
   const solution=await provider.generate(item.question,job.context,images);
   await q('UPDATE ai_solution_items SET status=$1,solution=$2,reason=$3,locked_at=NULL,updated_at=now() WHERE id=$4',[solution.status,JSON.stringify(solution),solution.reason||'',item.id]);
  }catch(error){
   const message=error.name==='TimeoutError'?'AI phản hồi quá lâu. Có thể thử lại.':error.message?.startsWith('AI ')||error.code?.startsWith('AI_')||error.needsReview?error.message:'Chưa tạo được lời giải hợp lệ. Hãy thử lại hoặc kiểm tra câu hỏi.';
   await q('UPDATE ai_solution_items SET status=$1,reason=$2,locked_at=NULL,updated_at=now() WHERE id=$3',[error.needsReview?'needs_review':'error',String(message).slice(0,2000),item.id]);
  }
  await refresh(item.job_id);return true;
 }
 async function pump(){if(busy)return;busy=true;try{while(await runOne()){} }catch{console.error('AI solution worker: tác vụ sẽ được kiểm tra lại ở lượt tiếp theo.');}finally{busy=false}}
 function start(){if(timer)return;timer=setInterval(()=>void pump(),5000);timer.unref();void pump();}
 function stop(){clearInterval(timer);timer=null;}
 async function enrich(row,out){
  if(out.review)out.review.questions=out.review.questions.map(({aiSolution,aiState,...question})=>question);
  if(!out.review||!out.policy.showExplanations||!row.ai_enabled)return out;
  const job=await summary(row.ai_job_id,true);if(!job)return out;
  const map=new Map(job.items.filter(x=>x.status==='ready'&&x.solution?.status==='ready').map(x=>[x.question_id,x.solution]));
  out.review.questions=out.review.questions.map(question=>{const {aiSolution,...safe}=question;return {...safe,aiSolution:map.get(question.id)||null,aiState:map.has(question.id)?'ready':'unavailable'};});
  out.review.ai={ready:job.ready,total:job.total,pending:['queued','running','waiting_connection'].includes(job.status)};
  return out;
 }
 return {provider,defaults,policy,enqueue,applyPolicy,summary,runOne,pump,start,stop,enrich};
}
module.exports={createService};
