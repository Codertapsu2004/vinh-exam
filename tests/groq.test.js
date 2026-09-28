const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {createProvider,normalizeSolution}=require('../lib/ai-provider');
const {createService}=require('../lib/ai-solutions');
const {providerError}=require('../lib/ai-errors');
const {evaluate}=require('../lib/solution-checks');
const question={id:'q1',type:'number',text:'Vật đi đều 2 m/s trong 4 s. Tính quãng đường.',answer:8,tolerance:0,images:[]};
const ctx={grade:10,subject:'Vật lí',lesson:'Chuyển động thẳng đều',scope:'Dùng s=v*t; chưa học đạo hàm.'};
const draft={status:'ready',reason:'',knowledge:['Quãng đường của chuyển động thẳng đều'],steps:[{title:'Tính quãng đường',text:'Vận tốc và thời gian đã ở đơn vị SI.',formula:'\\(s=vt=2\\cdot4=8\\text{ m}\\)'}],conclusion:'Vật đi được 8 m.',commonMistake:'Phân biệt quãng đường và độ dịch chuyển.',answer:8,visual:null,calculations:[{expression:'2*4',expected:8}]};
const verdict={correct:true,answerMatches:true,gradeAppropriate:true,visualMatches:true,reason:''};
const reply=content=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]})});
const env={AI_PROVIDER:'groq',AI_FREE_ONLY:'true',GROQ_API_KEY:'test-only-groq',OPENAI_API_KEY:'must-never-be-used'};

test('Groq uses its own key, image and strict JSON API; never falls back to a paid provider',async()=>{
 const calls=[];
 const provider=createProvider({env,fetchImpl:async(url,options)=>{calls.push({url,...options});return reply(calls.length===1?draft:verdict);}});
 const out=await provider.generate({...question,studentName:'PRIVATE',studentAnswer:'PRIVATE',images:[{assetId:'image-id'}]},ctx,['data:image/png;base64,AAAA']);
 assert.equal(out.status,'ready');assert.equal(calls.length,2);
 for(const call of calls){assert.equal(call.url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(call.headers.Authorization,'Bearer test-only-groq');assert.ok(!call.body.includes('PRIVATE'));assert.ok(!call.body.includes('must-never'));const body=JSON.parse(call.body);assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.model,'qwen/qwen3.8-27b');assert.equal(body.messages[1].content[1].image_url.url,'data:image/png;base64,AAAA');}
 const missing=createProvider({env:{...env,GROQ_API_KEY:''},fetchImpl:async()=>{throw Error('Must not call OpenAI');}});assert.equal(missing.configured(),false);await assert.rejects(()=>missing.generate(question,ctx),/GROQ_API_KEY/);
 assert.equal(createProvider({env:{...env,AI_PROVIDER:'openai'}}).configured(),false);
 assert.ok(!JSON.stringify(provider.info()).includes('test-only'));
 let attempts=0;const failed=createProvider({env,fetchImpl:async()=>{attempts++;return {ok:false,status:401,json:async()=>({error:{message:'SECRET'}})};}});await assert.rejects(()=>failed.generate(question,ctx),e=>e.code==='AI_AUTH'&&!e.message.includes('SECRET'));assert.equal(attempts,1);
});

test('Groq quota preserves retry time and oversized/invalid image questions do not pause all questions',async()=>{
 const limit=providerError(429,{error:{message:'SECRET tokens per day (TPD). Please try again in 2h3m4s.'}},null,'groq');assert.equal(limit.code,'AI_DAILY_LIMIT');assert.equal(limit.retryAfterMs,7384000);assert.equal(limit.automatic,true);assert.ok(!JSON.stringify(limit).includes('SECRET'));
 assert.equal(providerError(429,{},'900','groq').retryAfterMs,900000);
 assert.equal(providerError(429,{error:{message:'Tokens per day'}},null,'groq').retryAfterMs,86400000);
 const size=providerError(413,{},null,'groq');assert.equal(size.needsReview,true);assert.equal(size.pause,false);
 const p=createProvider({env,fetchImpl:async()=>{throw Error('Must not send incomplete images');}});
 await assert.rejects(()=>p.generate({...question,images:[{}]},ctx),e=>e.needsReview);
 await assert.rejects(()=>p.generate(question,ctx,Array(4).fill('data:image/png;base64,AA')),e=>e.code==='AI_IMAGE');
 const truncated=createProvider({env,fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:JSON.stringify(draft)}}]})})});await assert.rejects(()=>truncated.generate(question,ctx),e=>e.code==='AI_OUTPUT'&&e.needsReview);
});

test('arithmetic catches incorrect calculations even when the answer key matches; rejects code execution',()=>{
 assert.equal(evaluate('72/3.6*0.75+(72/3.6)^2/(2*5)'),55);
 assert.equal(evaluate('-2^2'),-4);assert.equal(evaluate('(-2)^2'),4);assert.equal(evaluate('sqrt(9)+abs(-2)'),5);assert.ok(Math.abs(evaluate('sin(pi/2)')-1)<1e-10);
 for(const expression of ['process.exit()','1/0','sqrt(-1)','2;global.x=1','('.repeat(50)+'1'+')'.repeat(50)])assert.throws(()=>evaluate(expression));
 assert.equal(normalizeSolution({...draft,calculations:[{expression:'2*4',expected:9}]},question).status,'needs_review');
 assert.equal(normalizeSolution(draft,question).status,'ready');
});

test('draft checkpoint survives quota and restart, is never published before verification, and skips old model jobs', {timeout:120000},async()=>{
 const db=new PGlite();
 const q=async(sql,params=[])=>params.length?db.query(sql,params):(await db.exec(sql)).at(-1);
 const pool={connect:async()=>({query:q,release(){}})};
 try{
  await db.exec('CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE assignments(id uuid PRIMARY KEY); CREATE TABLE attempts(assignment_id uuid,status text);');
  await db.exec(fs.readFileSync(require.resolve('../server-ai-migration.sql'),'utf8'));
  const teacher='11111111-1111-4111-8111-111111111111',assignment='22222222-2222-4222-8222-222222222222';
  await q('INSERT INTO users VALUES($1)',[teacher]);await q('INSERT INTO assignments(id) VALUES($1)',[assignment]);
  let calls=0;const provider=createProvider({env,fetchImpl:async()=>{calls++;if(calls===1)return reply(draft);if(calls===2)return {ok:false,status:429,headers:{get:()=> '600'},json:async()=>({error:{message:'Tokens per day (TPD)'}})};return reply(verdict);}});
  const service=createService({q,pool,provider,env});
  const job=await service.enqueue({query:q},{id:assignment,teacher_id:teacher,questions:[question]},ctx);
  await q('UPDATE assignments SET ai_enabled=true WHERE id=$1',[assignment]);
  assert.equal(await service.runOne(),false); // Never run before a graded attempt.
  await q("INSERT INTO attempts VALUES($1,'graded')",[assignment]);
  await q('UPDATE ai_solution_jobs SET model=$1 WHERE id=$2',['old-model',job.id]);assert.equal(await service.runOne(),false);
  await q('UPDATE ai_solution_jobs SET model=$1 WHERE id=$2',[provider.model(),job.id]);
  assert.equal(await service.runOne(),true);assert.equal(calls,2);
  let row=(await q('SELECT * FROM ai_solution_items WHERE job_id=$1',[job.id])).rows[0];assert.equal(row.status,'blocked');assert.ok(row.draft);assert.equal(row.solution,null);assert.equal(row.tries,0);
  const out=await service.enrich({ai_enabled:true,ai_job_id:job.id},{review:{questions:[question]},policy:{showExplanations:true}});assert.equal(out.review.questions[0].aiSolution,null);assert.equal(out.review.ai.pending,true);
  const restarted=createService({q,pool,provider,env});assert.equal(await restarted.runOne(),false);assert.equal(calls,2);
  await q("UPDATE ai_provider_health SET issue=jsonb_set(issue,'{retryAt}',to_jsonb('2000-01-01T00:00:00Z'::text)) WHERE id=1");
  assert.equal(await restarted.runOne(),true);assert.equal(calls,3);assert.equal(await restarted.runOne(),false);
  row=(await q('SELECT * FROM ai_solution_items WHERE job_id=$1',[job.id])).rows[0];assert.equal(row.status,'ready');assert.equal(row.draft,null);assert.equal(row.solution.conclusion,draft.conclusion);
  assert.equal((await restarted.summary(job.id)).ready,1);
 }finally{await db.close();}
});
