'use strict';
const JSZip=require('jszip');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
// Only an explicitly underlined option label is an answer marker. Bold is not.
module.exports=async function retainUnderlinedAnswers(buffer,questions){
 const zip=await JSZip.loadAsync(buffer),document=zip.file('word/document.xml');if(!document)return;
 const xml=await document.async('string');let index=-1,current=null;const candidates=new Map();
 for(const paragraph of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)||[]){
  const runs=[...paragraph.matchAll(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g)].map(([run])=>({text:[...run.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>decode(m[1])).join(''),underlined:/<w:u(?:\s[^>]*)?\/?\s*>/.test(run)&&!/<w:u[^>]*w:val="(?:none|0)"/.test(run)}));
  const plain=runs.map(r=>r.text).join(''),start=plain.trim().match(/^(?:Câu|Bài|Question)\s*(\d+)/i);
  if(start){const next=questions.findIndex((q,i)=>i>index&&q.questionNo===Number(start[1]));index=next>=0?next:index;current=next>=0?questions[next]:null;}
  if(!current||current.type!=='single')continue;
  let offset=0;const ranges=runs.map(r=>{const range={start:offset,end:offset+r.text.length,underlined:r.underlined};offset=range.end;return range;});
  for(const marker of plain.matchAll(/(?:^|\s)([A-H])[.)]\s*/g)){
   const at=marker.index+marker[0].indexOf(marker[1]);if(!ranges.some(r=>r.underlined&&r.start<=at&&r.end>at))continue;
   const answer='ABCDEFGH'.indexOf(marker[1]);if(answer>=current.options.length)continue;const set=candidates.get(current.id)||new Set();set.add(answer);candidates.set(current.id,set);
  }
 }
 for(const q of questions){const values=candidates.get(q.id);if(!values)continue;const answer=[...values][0];
  if(values.size!==1||(q.answer!==null&&q.answer!==undefined&&q.answer!==answer)){q.answer=null;q.answerSource='conflict';q.confidence='low';}
  else{q.answer=answer;q.answerSource='underline';}
 }
};
