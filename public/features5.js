(()=>{
  const formPostV5=async(path,fd)=>{const r=await fetch('/api'+path,{method:'POST',credentials:'include',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Không thể tải tệp');return d};
  const bankImgUrlV5=id=>'/api/question-assets/'+encodeURIComponent(id);
  const bankImagesHtmlV5=()=>{
    const imgs=window.__bankImagesV5||[];
    return `<div class="bank-images-v5"><div class="bank-images-head"><div><b>Hình minh họa</b><div class="hint">Tối đa 4 ảnh · PNG/JPG/WEBP/GIF · 6 MB/ảnh</div></div><button type="button" class="btn soft" onclick="pickBankImageV5()">＋ Tải ảnh</button></div><input id="bankImageInputV5" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="uploadBankImageV5(this.files[0])"><div id="bankImageGridV5" class="bank-image-grid-v5">${imgs.length?imgs.map((x,i)=>`<figure><img src="${bankImgUrlV5(x.assetId)}" alt="${esc(x.alt||'Hình minh họa')}"><div class="bank-image-meta"><input value="${esc(x.caption||'')}" placeholder="Chú thích ảnh" oninput="setBankImageCaptionV5(${i},this.value)"><button type="button" class="icon-danger-v5" onclick="removeBankImageV5(${i})" title="Gỡ ảnh">✕</button></div></figure>`).join(''):`<div class="image-drop-empty-v5"><span>▧</span><b>Chưa có hình minh họa</b><small>Tải sơ đồ, đồ thị, hình học, mạch điện…</small></div>`}</div></div>`;
  };
  const refreshBankImagesV5=()=>{const el=$('#bankImageGridV5');if(!el)return;const tmp=document.createElement('div');tmp.innerHTML=bankImagesHtmlV5();el.replaceWith(tmp.querySelector('#bankImageGridV5'))};

  window.pickBankImageV5=()=>{const i=$('#bankImageInputV5');if(i){i.value='';i.click()}};
  window.uploadBankImageV5=async file=>{if(!file)return;if((window.__bankImagesV5||[]).length>=4)return toast('Mỗi câu tối đa 4 ảnh');try{toast('Đang tải ảnh…');const fd=new FormData();fd.append('file',file);const d=await formPostV5('/teacher/question-assets',fd);window.__bankImagesV5.push({assetId:d.asset.id,alt:file.name,caption:''});refreshBankImagesV5();toast('Đã thêm ảnh minh họa')}catch(e){toast(e.message)}};
  window.removeBankImageV5=i=>{window.__bankImagesV5.splice(i,1);refreshBankImagesV5()};
  window.setBankImageCaptionV5=(i,v)=>{if(window.__bankImagesV5[i])window.__bankImagesV5[i].caption=v};

  questionModal=function(id){
    const q=id?(window.__bank||[]).find(x=>x.id===id):null;
    window.__editingQ=q;window.__bankImagesV5=Array.isArray(q?.images)?q.images.map(x=>({...x})):[];
    modal(q?'Sửa câu hỏi':'Tạo câu hỏi',`<div class="question-modal-v5"><div class="form-grid"><div class="field"><label>Môn</label><input id="qbSubject" value="${esc(q?.subject||'')}"></div><div class="field"><label>Khối/lớp</label><input id="qbGrade" value="${esc(q?.grade||'')}"></div><div class="field"><label>Chủ đề</label><input id="qbTopic" value="${esc(q?.topic||'')}"></div><div class="field"><label>Loại câu</label><select id="qbType" onchange="renderQBFields();previewBankQuestionV5()"><option value="single">Một đáp án đúng</option><option value="tf">Đúng/Sai nhiều ý</option><option value="number">Trả lời ngắn dạng số</option><option value="essay">Tự luận</option></select></div><div class="field wide"><label>Nội dung <span class="muted">· hỗ trợ LaTeX $...$ hoặc $$...$$</span></label><textarea id="qbPrompt" rows="5" oninput="previewBankQuestionV5()">${esc(q?.prompt||'')}</textarea></div><div class="wide" id="qbDynamic"></div><div class="wide">${bankImagesHtmlV5()}</div><div class="field"><label>Điểm</label><input id="qbPoints" type="number" step="0.25" value="${q?.points||1}"></div><div class="field"><label>Giải thích</label><textarea id="qbExplanation" rows="3">${esc(q?.explanation||'')}</textarea></div></div><div class="bank-preview-v5"><div class="eyebrow">XEM TRƯỚC</div><div id="bankQuestionPreviewV5"></div></div></div>`,`<button class="btn ghost" onclick="closeModal()">Hủy</button><button class="btn primary" onclick="saveQuestion('${id||''}')">Lưu câu hỏi</button>`);
    $('#qbType').value=q?.type||'single';renderQBFields();previewBankQuestionV5();
  };

  window.previewBankQuestionV5=()=>{
    const el=$('#bankQuestionPreviewV5');if(!el)return;const text=$('#qbPrompt')?.value||'';const imgs=window.__bankImagesV5||[];
    el.innerHTML=`<div class="preview-question-card-v5"><div class="question-title">${esc(text)||'<span class="muted">Nội dung câu hỏi sẽ hiển thị ở đây…</span>'}</div>${imgs.length?`<div class="question-images-v4 compact">${imgs.map((x,i)=>`<figure><img src="${bankImgUrlV5(x.assetId)}" alt="${esc(x.alt||('Hình '+(i+1)))}"><figcaption>${esc(x.caption||'')}</figcaption></figure>`).join('')}</div>`:''}</div>`;
    setTimeout(()=>window.MathJax?.typesetPromise?.([el]).catch(()=>{}),0);
  };

  saveQuestion=async function(id){try{
    const type=$('#qbType').value;let options=[],answer=null,tolerance=null;
    if(type==='single'){options=$('#qbOptions').value.split('\n').map(x=>x.trim()).filter(Boolean);answer=Number($('#qbAnswer').value)}
    else if(type==='tf'){options=$('#qbOptions').value.split('\n').map(x=>x.trim()).filter(Boolean);answer=$('#qbAnswerTF').value.split(',').map(x=>x.trim().toLowerCase().startsWith('đ')||x.trim().toLowerCase().startsWith('d'))}
    else if(type==='number'){answer=Number($('#qbAnswerNum').value);tolerance=Number($('#qbTolerance').value||0)}
    const body={subject:$('#qbSubject').value,grade:$('#qbGrade').value,topic:$('#qbTopic').value,type,prompt:$('#qbPrompt').value,options,answer,points:Number($('#qbPoints').value||1),tolerance,explanation:$('#qbExplanation').value,images:window.__bankImagesV5||[]};
    await api('/teacher/questions'+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});closeModal();toast('Đã lưu câu hỏi cùng hình minh họa');questionBank();
  }catch(e){toast(e.message)}};

  const oldBankTableV5=bankTable;
  bankTable=function(rows){if(!rows.length)return empty('Chưa có câu hỏi');return `<table class="table"><thead><tr><th>Nội dung</th><th>Loại</th><th>Chủ đề</th><th>Điểm</th><th></th></tr></thead><tbody>${rows.map(q=>`<tr><td style="max-width:560px"><div class="bank-row-content-v5">${Array.isArray(q.images)&&q.images.length?`<img class="bank-thumb-v5" src="${bankImgUrlV5(q.images[0].assetId)}" alt="">`:''}<div><strong>${esc(q.prompt)}</strong><div class="muted">${esc(q.subject)} ${q.grade?`· ${esc(q.grade)}`:''}${q.images?.length?` · ${q.images.length} ảnh`:''}</div></div></div></td><td>${questionType(q.type)}</td><td>${esc(q.topic||'—')}</td><td>${q.points}</td><td class="actions"><button class="btn soft" onclick="questionModal('${q.id}')">Sửa</button><button class="btn danger" onclick="archiveQuestion('${q.id}')">Lưu trữ</button></td></tr>`).join('')}</tbody></table>`};

  addBankQuestionToExam=function(id){const q=(window.__bank||[]).find(x=>x.id===id);if(!q)return;const copy={id:crypto.randomUUID?.()||('q'+Date.now()),type:q.type,text:q.prompt,points:Number(q.points),explanation:q.explanation||'',images:Array.isArray(q.images)?q.images.map(x=>({...x})):[]};if(q.type==='single'){copy.options=q.options||[];copy.answer=q.answer}else if(q.type==='tf'){copy.statements=q.options||[];copy.answer=q.answer}else if(q.type==='number'){copy.answer=q.answer;copy.tolerance=q.tolerance||0}window.__exam.questions.push(copy);refreshExamList();toast(q.images?.length?'Đã thêm câu hỏi và hình minh họa':'Đã thêm câu hỏi')};

  const openImportBeforeV5=window.openImportV3;
  window.openImportV3=async id=>{
    await openImportBeforeV5(id);
    try{
      const d=await api('/teacher/imports/'+id+'/formulas');window.__formulaV5=d.items||[];
      if(!d.items?.length)return;
      const side=document.querySelector('.review-grid > div:last-child');if(!side)return;
      const qs=Array.isArray(window.__importV3?.draft_questions)?window.__importV3.draft_questions:[];
      const panel=document.createElement('div');panel.className='panel formula-panel-v5';panel.innerHTML=`<div class="panel-head"><div><h3>∑ Formula Assistant</h3><div class="muted">${d.items.length} biểu thức nhận diện · kiểm tra lại trước khi xuất bản</div></div></div><div class="panel-body"><div class="formula-target-v5"><label>Chèn vào câu</label><select id="formulaTargetV5">${qs.map((_,i)=>`<option value="${i}">Câu ${i+1}</option>`).join('')}</select></div>${d.note?`<div class="formula-note-v5">${esc(d.note)}</div>`:''}<div class="formula-list-v5">${d.items.map((f,i)=>`<div class="formula-item-v5"><div class="formula-render-v5">${f.source==='word-omml'?`$$${esc(f.latex)}$$`:`<code>${esc(f.latex)}</code>`}</div><div class="formula-actions-v5"><span class="badge ${f.confidence==='medium'?'info':'warn'}">${f.source==='word-omml'?'Word OMML':'PDF text'}</span><button class="btn ghost" onclick="copyFormulaV5(${i})">Sao chép</button>${qs.length?`<button class="btn soft" onclick="insertFormulaV5(${i})">Chèn vào câu</button>`:''}</div></div>`).join('')}</div></div>`;side.appendChild(panel);setTimeout(()=>window.MathJax?.typesetPromise?.([panel]).catch(()=>{}),0);
    }catch(e){console.warn('Formula Assistant:',e.message)}
  };
  window.copyFormulaV5=async i=>{const x=window.__formulaV5?.[i];if(!x)return;try{await navigator.clipboard.writeText(x.latex);toast('Đã sao chép LaTeX')}catch{toast('Không thể truy cập clipboard')}};
  window.insertFormulaV5=i=>{const f=window.__formulaV5?.[i],idx=Number($('#formulaTargetV5')?.value);const q=window.__importV3?.draft_questions?.[idx];if(!f||!q)return toast('Không tìm thấy câu đích');q.text=(q.text||'').trim()+`\n$$${f.latex}$$`;toast(`Đã chèn công thức vào câu ${idx+1}`)};
  const confirmImportBeforeV5=window.confirmImportExamV3;
  window.confirmImportExamV3=async id=>{try{const d=await api('/teacher/imports/'+id+'/create-exam',{method:'POST',body:JSON.stringify({title:$('#impTitle').value,subject:$('#impSubject').value,duration:Number($('#impDuration').value||45),questions:window.__importV3?.draft_questions||[]})});closeModal();toast('Đã tạo đề nháp, giữ các công thức đã chèn');examEditor(d.exam.id)}catch(e){toast(e.message)}};
})();
