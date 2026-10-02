(()=>{
 'use strict';
 let gradingContext=null;
 const checked=value=>value?'checked':'';
 function options(a){return `<div class="release-options"><p class="field-help">Áp dụng cho các bài đã chấm của bài giao này.</p>
 ${[['releaseScore','Điểm số','Cho học sinh xem điểm tổng.',a.showScore],['releaseAnswers','Đáp án','Cho học sinh đối chiếu với bài đã làm.',a.showAnswers],['releaseExisting','Lời giải & hình minh họa','Hiện nội dung giáo viên đã lưu cùng câu hỏi.',a.showExplanations]].map(([id,title,help,on])=>`<label class="release-option"><span><strong>${title}</strong><small>${help}</small></span><input type="checkbox" id="${id}" ${checked(on)} onchange="syncReleaseChoices('${id}')"></label>`).join('')}
 <div class="field"><label for="releaseTiming">Thời điểm học sinh được xem</label><select id="releaseTiming"><option value="immediate">Ngay khi bài được chấm xong</option><option value="after_close" ${a.scoreMode==='after_close'||a.answerMode==='after_close'?'selected':''}>Sau khi đóng bài thi</option></select></div></div>`;}
 window.syncReleaseChoices=id=>{if(id==='releaseExisting'&&$('#releaseExisting').checked)$('#releaseAnswers').checked=true;if(id==='releaseAnswers'&&!$('#releaseAnswers').checked)$('#releaseExisting').checked=false;};
 const readPolicy=()=>({score:$('#releaseScore').checked,answers:$('#releaseAnswers').checked,explanations:$('#releaseExisting').checked,timing:$('#releaseTiming').value});
 window.openResultRelease=async id=>{try{
  const d=await api('/teacher/assignments/'+id+'/release');modal('Công bố kết quả',`<div class="release-title"><span class="badge info">${d.counts.graded} bài đã chấm</span><h3>${esc(d.assignment.title)}</h3><p class="muted">${d.counts.pending} bài còn chờ chấm</p></div>${options(d.assignment)}`,`<button class="btn ghost" onclick="closeModal()">Đóng</button><button class="btn primary" id="releaseSaveButton" onclick="saveResultRelease('${id}')">Lưu cài đặt</button>`);
 }catch(e){toast(e.message)}};
 window.saveResultRelease=async id=>{const button=$('#releaseSaveButton');button.disabled=true;try{await api('/teacher/assignments/'+id+'/release',{method:'POST',body:JSON.stringify(readPolicy())});closeModal();toast('Đã cập nhật quyền xem kết quả');}catch(e){toast(e.message);button.disabled=false;}};
 policyV3=(id)=>openResultRelease(id);
 const monitor=openMonitor;openMonitor=async id=>{await monitor(id);$('#page .head-actions')?.insertAdjacentHTML('afterbegin',`<button class="btn soft" onclick="openResultRelease('${id}')">Công bố kết quả</button>`);};
 function answerText(q,value){if(value===null||value===undefined||value==='')return 'Chưa trả lời';if(q.type==='single')return `${String.fromCharCode(65+Number(value))}. ${q.options?.[value]||''}`;if(Array.isArray(value))return value.map((x,i)=>`${String.fromCharCode(97+i)}) ${x===true?'Đúng':x===false?'Sai':'Chưa chọn'}`).join(' · ');return String(value);}
 openGrade=async id=>{try{
  const d=await api('/teacher/attempts/'+id+'/grading'),a=d.attempt;gradingContext={...d,id};
  const essays=a.questions.filter(q=>q.type==='essay');
  const legacy=a.status==='graded'&&essays.length>0&&!essays.every(q=>Object.hasOwn(a.manual_scores||{},q.id));
  modal('Chấm bài',`<div class="grading-header"><span class="avatar">${esc(a.student_name.slice(0,1))}</span><div><h3>${esc(a.student_name)}</h3><p>${esc(a.exam_title)}</p></div><span class="badge info">${a.status==='graded'?'Chấm lại':'Chờ chấm'}</span></div>
  <div class="grading-layout"><div class="grading-answers">${essays.map((q,i)=>`<section class="grade-item"><div class="grade-item-head"><h3>Câu ${a.questions.indexOf(q)+1}</h3><span class="badge">Tự luận · ${q.points} điểm</span></div><p class="grade-prompt">${esc(q.text)}</p>${(q.images||[]).map(im=>`<img class="grade-question-image" src="/api/question-assets/${encodeURIComponent(im.assetId)}" alt="${esc(im.alt||'Hình đề bài')}">`).join('')}<span class="small-label">BÀI LÀM CỦA HỌC SINH</span><div class="grade-student-answer">${esc(answerText(q,a.answers?.[q.id]))}</div>${q.explanation?`<details class="grade-guide"><summary>Hướng dẫn chấm</summary><p>${esc(q.explanation)}</p></details>`:''}<label class="grade-score-input">Điểm câu này <span><input type="number" data-manual-score="${esc(q.id)}" min="0" max="${q.points}" step="0.01" value="${a.manual_scores?.[q.id]??''}" placeholder="—" oninput="updateGradeTotal()" ${legacy?'disabled':''}> / ${q.points}</span></label></section>`).join('')||'<div class="empty"><strong>Bài được chấm tự động</strong><span>Kiểm tra câu trả lời bên dưới trước khi công bố.</span></div>'}
  <details class="objective-review"><summary>Xem phần chấm tự động · ${d.objectiveScore} điểm</summary>${a.questions.filter(q=>q.type!=='essay').map(q=>`<article><strong>Câu ${a.questions.indexOf(q)+1}. ${esc(q.text)}</strong><p>Bài làm: ${esc(answerText(q,a.answers?.[q.id]))}</p><p class="correct-answer">Đáp án: ${esc(answerText(q,q.answer))}</p></article>`).join('')}</details></div>
  <aside class="grading-summary"><span class="small-label">TỔNG ĐIỂM</span><div class="grade-total"><strong id="gradeTotal">${legacy?Number(a.score):d.objectiveScore}</strong><span> / ${d.maxScore}</span></div><div class="grade-breakdown"><span>Tự động</span><b>${d.objectiveScore}</b><span>Tự luận</span><b id="gradeManualTotal">${legacy?d.manualPoints:'0'}</b></div>
  ${legacy?`<div class="legacy-grade"><p>Bài này đã có điểm tự luận tổng: <b>${d.manualPoints}</b>. Giữ nguyên điểm cũ hoặc chấm lại từng câu.</p><label><input type="checkbox" id="regradeByQuestion" onchange="enablePerQuestionGrading()"> Chấm lại từng câu</label></div>`:''}
  <div class="field"><label for="manualComment">Nhận xét cho học sinh</label><textarea id="manualComment" rows="4" placeholder="Nhận xét cách làm, điều cần cải thiện…">${esc(a.manual_comment||'')}</textarea></div>
  <details class="grade-publication"><summary>Cài đặt công bố kết quả</summary>${options(d.release.assignment)}</details><p class="field-help">“Lưu điểm” giữ nguyên quyền xem hiện tại. “Lưu & công bố” áp dụng các lựa chọn ở trên.</p><p id="gradingError" role="alert" class="form-error" hidden></p></aside></div>`,
  `<button class="btn ghost" onclick="closeModal()">Đóng</button><button class="btn soft" id="gradeOnlyButton" onclick="saveGrade('${id}',false)">Lưu điểm</button><button class="btn primary" id="gradeReleaseButton" onclick="saveGrade('${id}',true)">Lưu & công bố</button>`);
  $('#modalRoot .modal').classList.add('grading-dialog');window.renderMath?.([$('#modalRoot')]);
 }catch(e){toast(e.message)}};
 window.enablePerQuestionGrading=()=>{$$('[data-manual-score]').forEach(x=>x.disabled=!$('#regradeByQuestion').checked);updateGradeTotal();};
 window.updateGradeTotal=()=>{if(!gradingContext)return;const legacy=$('#regradeByQuestion')&&!$('#regradeByQuestion').checked;const manual=legacy?gradingContext.manualPoints:$$('[data-manual-score]').reduce((sum,x)=>sum+(Number(x.value)||0),0);$('#gradeManualTotal').textContent=+manual.toFixed(4);$('#gradeTotal').textContent=+(manual+gradingContext.objectiveScore).toFixed(2);};
 saveGrade=async(id,release=false)=>{
  const buttons=[$('#gradeOnlyButton'),$('#gradeReleaseButton')],error=$('#gradingError');error.hidden=true;
  try{
   const legacy=$('#regradeByQuestion')&&!$('#regradeByQuestion').checked;const scores={};
   if(!legacy)for(const el of $$('[data-manual-score]')){if(el.value===''||!el.checkValidity())throw Error('Nhập điểm hợp lệ cho từng câu tự luận.');scores[el.dataset.manualScore]=Number(el.value);}
   buttons.forEach(b=>b.disabled=true);const data=await api('/teacher/attempts/'+id+'/grade-and-release',{method:'POST',body:JSON.stringify({...(legacy?{points:gradingContext.manualPoints}:{scores}),comment:$('#manualComment').value,...(release?{publication:readPolicy()}:{})})});
   closeModal();toast(`Đã lưu ${data.score} điểm`);await gradingPage();
  }catch(e){error.textContent=e.message;error.hidden=false;buttons.forEach(b=>b.disabled=false);}
 };
 reviewAttempt=id=>showResult(id);
})();
