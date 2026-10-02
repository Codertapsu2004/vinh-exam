'use strict';
const {randomUUID:uuid}=require('node:crypto');
const ExamTools=require('../public/exam-tools');
function sectionKindV6(title=''){
  const s=String(title).toLowerCase();
  if(/đúng\s*[-–]?\s*sai|dung\s*[-–]?\s*sai|true\s*[-–]?\s*false/.test(s)) return 'tf';
  if(/trả\s*lời\s*ngắn|tra\s*loi\s*ngan|điền|dien|short\s*answer/.test(s)) return 'number';
  if(/tự\s*luận|tu\s*luan|essay/.test(s)) return 'essay';
  if(/trắc\s*nghiệm|trac\s*nghiem|nhiều\s*lựa\s*chọn|multiple\s*choice/.test(s)) return 'single';
  return 'mixed';
}
function parseBoolAnswerV6(raw=''){
  const t=String(raw).replace(/[;,|/]/g,' ').split(/\s+/).map(x=>x.trim()).filter(Boolean);
  const vals=[];
  for(const x0 of t){const x=x0.toLowerCase();if(/^(đ|d|đúng|dung|true|t)$/.test(x))vals.push(true);else if(/^(s|sai|false|f)$/.test(x))vals.push(false)}
  return vals;
}
function parseNumberV6(raw=''){
  const value=String(raw).trim().replace(/,/g,'.');const match=value.match(/^([-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?)(?:\s*\/\s*([-+]?\d+(?:\.\d+)?))?$/i);if(!match)return null;const n=Number(match[1])/(match[2]===undefined?1:Number(match[2]));return Number.isFinite(n)?n:null;
}
function parseExamStructureV6(text=''){
  const clean=String(text||'').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+\n/g,'\n').trim();
  const metadata=ExamTools.metadata(clean);
  const lines=clean.split('\n').flatMap(line=>{
    const markers=[...line.matchAll(/(?:^|\s)([A-H])[.)]\s+/g)];
    if(markers.length<2)return [line];
    const pieces=[];let last=0;for(const m of markers){if(m.index>last)pieces.push(line.slice(last,m.index));last=m.index;}pieces.push(line.slice(last));return pieces;
  }).map(x=>x.trim()).filter(Boolean);
  const answerKey={},scopedKeys={},contentLines=[];let keyMode=false,keySection=null,keyCount=0;
  const keyPairs=line=>[...line.matchAll(/(?:^|[\s;,|])(?:Câu\s*)?(\d{1,3})\s*[.\-:)]\s*([A-H]|[-+]?\d+(?:[.,]\d+)?)(?=[\s;,|]|$)/gi)];
  for(const line of lines){
    if(/^(?:(?:BẢNG|HƯỚNG DẪN)\s+)?(?:ĐÁP\s*ÁN|ANSWER\s*KEY)\s*[:：]?\s*$/i.test(line)){keyMode=true;continue;}
    const pairs=keyPairs(line);
    if(keyMode){
      const section=line.match(/^(?:PHẦN|PART|NHÓM)\s+([IVXLCDM]+|\d+)/i);if(section){keySection=section[1].toUpperCase();continue;}
      for(const m of pairs){const target=keySection?(scopedKeys[keySection]??={}):answerKey;const n=Number(m[1]);if(target[n]!==undefined&&target[n]!==m[2].toUpperCase())target[n]=null;else target[n]=m[2].toUpperCase();keyCount++;}continue;
    }
    if(pairs.length>=2&&/^(?:Đáp\s*án\s*:|\d+\s*[.\-:])/i.test(line)){for(const m of pairs){answerKey[Number(m[1])]=m[2].toUpperCase();keyCount++;}continue;}
    contentLines.push(line);
  }
  const sections=[]; let current=null, qbuf=null; const questions=[];
  const ensureSection=(title='Phần I. Câu hỏi',kind='mixed')=>{if(current)return current;current={id:'sec-'+(sections.length+1),title,kind,questionIds:[],points:0};sections.push(current);return current};
  const sectionMatch=line=>{
    let m=line.match(/^(?:PHẦN|Phần|PART|Part|NHÓM|Nhóm|GROUP|Group)\s+([IVXLCDM]+|\d+)\s*[.):\-–]?\s*(.*)$/i);
    if(m)return {title:line,kind:sectionKindV6(line)};
    m=line.match(/^([IVXLCDM]+)\.\s+(.+)$/i);
    if(m&&/(trắc|dung|đúng|sai|ngắn|tự\s*luận|multiple|true|short|essay)/i.test(line))return {title:line,kind:sectionKindV6(line)};
    return null;
  };
  const qStart=line=>line.match(/^(?:Câu|Bài|Question)\s*(\d{1,3})\s*[.):\-–]?\s*(.*)$/i);
  const flush=()=>{
    if(!qbuf)return;
    const sec=qbuf.section||ensureSection(); const raws=qbuf.lines; const body=[]; const upper=[], lower=[]; let localAnswer='',explanation='',inExplanation=false;
    for(const line of raws){
      if(/^(?:Lời\s*giải|Giải\s*thích|Hướng\s*dẫn\s*giải)\s*[:：]?/i.test(line)){inExplanation=true;explanation+=line.replace(/^(?:Lời\s*giải|Giải\s*thích|Hướng\s*dẫn\s*giải)\s*[:：]?\s*/i,'')+'\n';continue;}
      if(inExplanation){explanation+=line+'\n';continue;}
      let m=line.match(/^([A-H])\s*[.):\-]\s*(.+)$/);if(m){upper.push({k:m[1],v:m[2].trim()});continue}
      m=line.match(/^([a-d])\s*[).:\-]\s*(.+)$/);if(m){lower.push({k:m[1],v:m[2].trim()});continue}
      m=line.match(/^(?:Đáp\s*án|Dap\s*an|ĐA|Answer)\s*[:\-]\s*(.+)$/i);if(m){localAnswer=m[1].trim();continue}
      body.push(line);
    }
    let type=sec.kind, confidence='medium';
    if(upper.length>=2){type='single';confidence='high'}
    else if((sec.kind==='tf'&&lower.length>=2)||lower.length>=4){type='tf';confidence=lower.length>=4?'high':'medium'}
    else if(sec.kind==='number'||parseNumberV6(localAnswer)!==null){type='number';confidence=localAnswer?'high':'medium'}
    else if(sec.kind==='essay'){type='essay';confidence='high'}
    else {type='essay';confidence='low'}
    const textOut=[qbuf.lead,...body].filter(Boolean).join('\n').trim()||`Câu ${qbuf.no}`;
    const item={id:uuid(),questionNo:qbuf.no,sectionId:sec.id,type,text:textOut,points:1,explanation:explanation.trim(),confidence,source:'structure-v12'};
    if(!questions.length&&ExamTools.headerQuestion(item)){qbuf=null;return;}
    if(type==='single'){
      item.options=upper.map(x=>x.v);const letter=(localAnswer.match(/^(?:chọn\s*)?([A-H])(?:[.)]|$)/i)?.[1]||'').toUpperCase();item.answer=letter?upper.findIndex(x=>x.k===letter):null;item.answerSource=letter?'inline':null;
      if(item.answer===null||item.answer<0)item.answer=null;
    }else if(type==='tf'){
      item.statements=lower.map(x=>x.v);const vals=parseBoolAnswerV6(localAnswer);item.answer=item.statements.map((_,i)=>vals[i]??null);if(vals.length===item.statements.length)item.answerSource='inline';
    }else if(type==='number'){
      item.answer=parseNumberV6(localAnswer);item.tolerance=0;if(item.answer!==null)item.answerSource='inline';
    }
    sec.questionIds.push(item.id);questions.push(item);qbuf=null;
  };
  for(const line of contentLines){
    const sm=sectionMatch(line);if(sm){flush();current={id:'sec-'+(sections.length+1),title:sm.title,kind:sm.kind,questionIds:[],points:0};sections.push(current);continue}
    const qm=qStart(line);if(qm){flush();qbuf={no:Number(qm[1]),lead:(qm[2]||'').trim(),lines:[],section:ensureSection()};continue}
    if(qbuf)qbuf.lines.push(line);
  }
  flush();
  for(const item of questions){
    const sec=sections.find(x=>x.id===item.sectionId),label=sec?.title.match(/^(?:PHẦN|PART|NHÓM)\s+([IVXLCDM]+|\d+)/i)?.[1]?.toUpperCase();
    const raw=scopedKeys[label]?.[item.questionNo]??(questions.filter(x=>x.questionNo===item.questionNo).length===1?answerKey[item.questionNo]:undefined);
    if(raw===undefined||raw===null)continue;
    const answer=item.type==='single'&&/^[A-H]$/.test(raw)?'ABCDEFGH'.indexOf(raw):item.type==='number'?parseNumberV6(raw):null;
    if(answer===null||(item.type==='single'&&answer>=item.options.length))continue;
    if(item.answerSource&&item.answer!==answer){item.answer=null;item.answerSource='conflict';item.confidence='low';}
    else{item.answer=answer;item.answerSource='key';}
  }
  const nonempty=sections.filter(s=>s.questionIds.length); if(nonempty.length!==sections.length){sections.splice(0,sections.length,...nonempty)}
  if(!sections.length&&questions.length){sections.push({id:'sec-1',title:'Phần I. Câu hỏi',kind:'mixed',questionIds:questions.map(q=>q.id),points:questions.length})}
  for(const sec of sections){sec.points=sec.questionIds.reduce((s,id)=>s+Number(questions.find(q=>q.id===id)?.points||0),0);if(sec.kind==='mixed'){const ks=[...new Set(questions.filter(q=>q.sectionId===sec.id).map(q=>q.type))];if(ks.length===1)sec.kind=ks[0]}}
  return {questions:questions.slice(0,300),sections,meta:{...metadata,lines:lines.length,questionCount:questions.length,sectionCount:sections.length,answerKeyCount:keyCount,analyzer:'structure-v12'}};
}


module.exports={parseExamStructureV6,parseNumberV6};
