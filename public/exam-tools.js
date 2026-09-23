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
  return {settings,simulation,simulationTypes,questionErrors,headerQuestion,metadata};
});
