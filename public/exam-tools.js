(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.ExamTools=value;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const modes=['immediate','after_close','manual'];
  function settings(raw={}){
    const duration=Number(raw.duration??45),maxAttempts=Number(raw.maxAttempts??1);
    if(!Number.isInteger(duration)||duration<1||duration>1440)throw Error('Thời lượng phải từ 1 đến 1440 phút.');
    if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10)throw Error('Số lượt làm phải từ 1 đến 10.');
    const scoreMode=raw.scoreMode??'manual',answerMode=raw.answerMode??'manual';
    if(!modes.includes(scoreMode)||!modes.includes(answerMode))throw Error('Chế độ công bố không hợp lệ.');
    return {duration,maxAttempts,scoreMode,answerMode,showExplanations:raw.showExplanations===true,shuffleQuestions:raw.shuffleQuestions===true,proctorMode:['off','monitor','strict'].includes(raw.proctorMode)?raw.proctorMode:'off',instructions:String(raw.instructions||'').slice(0,3000)};
  }
  const simulationTypes={parabola:{a:[-5,5,1],b:[-10,10,0],c:[-10,10,0]},harmonic:{amplitude:[0.1,10,2],period:[0.2,10,2],phase:[-180,180,0]},triangle:{ab:[0.5,10,3],ac:[0.5,10,4]}};
  function simulation(raw){
    if(!raw||!raw.kind||raw.kind==='none')return null;
    const spec=simulationTypes[raw.kind];if(!spec)throw Error('Dạng mô phỏng chưa được hỗ trợ.');
    const params={};for(const [name,[min,max,fallback]] of Object.entries(spec)){const v=Number(raw.params?.[name]??fallback);if(!Number.isFinite(v)||v<min||v>max)throw Error(`Tham số ${name} phải từ ${min} đến ${max}.`);params[name]=v;}
    return {kind:raw.kind,visibility:raw.visibility==='exam'?'exam':'review',params};
  }
  function questionErrors(questions){
    const errors=[],ids=new Set();
    if(!Array.isArray(questions)||!questions.length)return ['Đề chưa có câu hỏi.'];
    if(questions.length>300)errors.push('Đề có tối đa 300 câu hỏi.');
    questions.forEach((q,i)=>{const add=s=>errors.push(`Câu ${i+1}: ${s}`);
      if(!/^[\w-]{1,100}$/.test(q.id||'')||ids.has(q.id))add('mã câu bị thiếu, không hợp lệ hoặc trùng.');ids.add(q.id);
      if(!String(q.text||'').trim())add('chưa nhập nội dung.');
      if(!Number.isFinite(Number(q.points))||Number(q.points)<=0)add('điểm phải lớn hơn 0.');
      if(q.type==='single'){if(!Array.isArray(q.options)||q.options.length<2||q.options.length>8||q.options.some(x=>!String(x).trim()))add('cần 2–8 phương án có nội dung.');if(!Number.isInteger(q.answer)||!q.options?.[q.answer])add('chưa chọn đáp án đúng.');}
      else if(q.type==='tf'){if(!Array.isArray(q.statements)||!q.statements.length||q.statements.some(x=>!String(x).trim()))add('thiếu nội dung các ý.');if(!Array.isArray(q.answer)||q.answer.length!==q.statements?.length||q.answer.some(x=>typeof x!=='boolean'))add('chưa chọn Đúng/Sai đủ các ý.');}
      else if(q.type==='number'){if(q.answer===null||q.answer===undefined||q.answer===''||!Number.isFinite(Number(q.answer)))add('chưa nhập đáp án số.');if(!Number.isFinite(Number(q.tolerance??0))||Number(q.tolerance??0)<0)add('sai số phải không âm.');}
      else if(q.type!=='essay')add('loại câu không hợp lệ.');
      try{simulation(q.simulation)}catch(e){add(e.message)}
    });return errors;
  }
  function headerQuestion(q){return q?.type==='essay'&&!q.images?.length&&!q.answer&&/(?:thời\s*gian\s*[:：]|cấu\s*trúc\s*[:：]|bản\s*chuẩn\s*hóa)/i.test(q.text||'')&&!/[?？]/.test(q.text||'');}
  function metadata(text='',filename=''){
    const lines=String(text).replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
    const first=lines.findIndex(s=>/^(?:Câu|Question)\s*\d+\s*[.):\-–]/i.test(s));
    const before=lines.slice(0,first<0?Math.min(lines.length,8):first);
    const titleLines=before.filter(s=>! /^(?:phần|nhóm|part|group)\s+[IVX\d]|^(?:thời\s*gian|cấu\s*trúc|họ\s*(?:và\s*tên|tên)|lớp\s*:|mã\s*đề|số\s*báo\s*danh|trường|sở\s*giáo|phòng\s*giáo|hướng\s*dẫn)/i.test(s));
    let title=(titleLines.slice(0,2).join(' — ')||filename.replace(/\.[^.]+$/,'')).replace(/\s*[-–—|]?\s*BẢN CHUẨN HÓA.*$/i,'').trim().slice(0,240);
    const context=before.join('\n'),time=context.match(/thời\s*gian(?:\s*làm\s*bài)?\s*[:：]?\s*(\d{1,4})\s*phút/i),subject=context.match(/(?:môn\s*[:：]?\s*)?(Toán|Vật\s*l[iíý])(?:\s*(?:lớp\s*)?(\d{1,2}))?/i);
    return {title,subject:subject?[subject[1],subject[2]].filter(Boolean).join(' '):'',duration:time?Number(time[1]):45,instructions:before.filter(s=>/^(?:thời\s*gian|cấu\s*trúc|hướng\s*dẫn)/i.test(s)).join('\n'),preamble:context};
  }
  function sections(questions,raw=[]){
    if(!Array.isArray(raw)||raw.length>30)throw Error('Đề có tối đa 30 phần.');
    const used=new Set(),ids=new Set();
    const result=raw.map((s,i)=>{
      const id=String(s.id||`sec-${i+1}`);if(!/^[\w-]{1,100}$/.test(id)||ids.has(id))throw Error('Mã phần không hợp lệ hoặc trùng.');ids.add(id);
      const questionIds=(Array.isArray(s.questionIds)?s.questionIds:[]).filter(id=>questions.some(q=>q.id===id));
      for(const qid of questionIds){if(used.has(qid))throw Error('Một câu hỏi chỉ được thuộc một phần.');used.add(qid);}
      return {id,title:String(s.title||`Phần ${i+1}`).trim().slice(0,200),kind:s.kind||'mixed',questionIds,points:+questionIds.reduce((sum,id)=>sum+Number(questions.find(q=>q.id===id).points),0).toFixed(4)};
    });
    const ungrouped=questions.filter(q=>!used.has(q.id));
    if(ungrouped.length){let id='sec-other';while(ids.has(id))id+='-1';result.push({id,title:result.length?'Câu hỏi chưa phân phần':'Phần I. Câu hỏi',kind:'mixed',questionIds:ungrouped.map(q=>q.id),points:+ungrouped.reduce((s,q)=>s+Number(q.points),0).toFixed(4)});}
    for(const s of result)for(const id of s.questionIds)questions.find(q=>q.id===id).sectionId=s.id;
    return result;
  }
  function distributePoints(questions,ids,total){
    const selected=ids.map(id=>questions.find(q=>q.id===id));const units=Math.round(Number(total)*10000);
    if(!selected.length||selected.some(q=>!q)||new Set(ids).size!==ids.length||!Number.isFinite(units)||units<selected.length||units>10000000)throw Error('Điểm phần phải lớn hơn 0, đủ chia cho các câu và không quá 1000.');
    const base=Math.floor(units/selected.length),remainder=units%selected.length;
    selected.forEach((q,i)=>q.points=(base+(i<remainder?1:0))/10000);
    return units/10000;
  }
  return {settings,simulation,simulationTypes,questionErrors,headerQuestion,metadata,sections,distributePoints};
});
