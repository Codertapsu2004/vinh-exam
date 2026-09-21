(()=>{
  // Security + lifecycle hardening layered after features3.js.
  const previousOpenImport = window.openImportV3;
  window.openImportV3 = async id => {
    try {
      const x=(await api('/teacher/imports/'+id)).item;
      window.__importV3=x;
      const warnings=Array.isArray(x.warnings)?x.warnings:[];
      const qs=Array.isArray(x.draft_questions)?x.draft_questions:[];
      const safeHtml = window.DOMPurify ? DOMPurify.sanitize(x.extracted_html||'',{
        USE_PROFILES:{html:true},
        ALLOWED_URI_REGEXP:/^(?:(?:https?|mailto|tel):|data:image\/(?:png|gif|jpeg|webp);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
      }) : esc(x.extracted_html||'');
      page('Rà soát đề nhập',esc(x.original_name),`<button class="btn ghost" onclick="route('imports')">← Danh sách</button><button class="btn primary" onclick="createExamFromImportV3('${id}')" ${qs.length?'':'disabled'}>Tạo đề nháp</button>`,`<div class="review-grid"><div><div class="panel"><div class="panel-head"><h3>Bản xem trước an toàn</h3><a class="btn ghost" href="/api/assets/${x.asset_id}" target="_blank" rel="noopener">Mở tệp gốc</a></div><div class="panel-body import-preview">${x.kind==='docx'&&x.extracted_html?safeHtml:x.kind==='image'?`<img src="/api/assets/${x.asset_id}" alt="Ảnh đề">`:`<pre>${esc((x.extracted_text||'').slice(0,30000))}</pre>`}</div></div></div><div><div class="panel"><div class="panel-head"><h3>Câu hỏi nhận diện</h3><span class="badge info">${qs.length} câu</span></div><div class="panel-body">${qs.length?qs.map((q,i)=>`<div class="detected-q"><span class="qdot">${i+1}</span><div><strong>${esc(q.text).slice(0,160)}</strong><div class="muted">${questionType(q.type)} · ${q.points||1} điểm</div></div></div>`).join(''):empty('Chưa nhận diện được câu hỏi','Bạn vẫn có thể xem tệp gốc và soạn câu thủ công.')}</div></div>${warnings.length?`<div class="panel warning-panel"><div class="panel-head"><h3>Điểm cần rà soát</h3></div><div class="panel-body">${warnings.map(w=>`<div class="warning-line">⚠ ${esc(w)}</div>`).join('')}</div></div>`:''}</div></div>`);
    } catch(e) {
      toast(e.message);
      if(previousOpenImport && previousOpenImport!==window.openImportV3) previousOpenImport(id);
    }
  };

  // Ensure an SSE connection does not remain alive after leaving Live Monitor.
  const baseRouteV4 = route;
  route = async function(key,...args){
    if(window.__vinhExamMonitorES){try{window.__vinhExamMonitorES.close()}catch{} window.__vinhExamMonitorES=null;}
    return baseRouteV4(key,...args);
  };
  const oldOpenMonitorV4 = openMonitor;
  openMonitor = async function(id){
    const OriginalEventSource=window.EventSource;
    window.EventSource=function(...args){const es=new OriginalEventSource(...args);window.__vinhExamMonitorES=es;return es};
    window.EventSource.prototype=OriginalEventSource.prototype;
    try{return await oldOpenMonitorV4(id)} finally {window.EventSource=OriginalEventSource;}
  };

  const imgUrlV4=id=>'/api/question-assets/'+encodeURIComponent(id);
  const galleryV4=(q,compact=false)=>{
    const imgs=Array.isArray(q?.images)?q.images.filter(x=>x&&x.assetId):[];
    if(!imgs.length)return '';
    return `<div class="question-images-v4 ${compact?'compact':''}">${imgs.map((x,i)=>`<figure><img loading="lazy" src="${imgUrlV4(x.assetId)}" alt="${esc(x.alt||('Hình '+(i+1)))}"><figcaption>${esc(x.caption||'')}</figcaption></figure>`).join('')}</div>`;
  };

  // Student exam renderer now supports teacher-uploaded question images.
  renderExamQuestion=function(q,i){
    let body='';
    if(q.type==='single')body=(q.options||[]).map((o,j)=>`<label class="option"><input type="radio" name="${q.id}" value="${j}"><span>${esc(o)}</span></label>`).join('');
    else if(q.type==='tf')body=(q.statements||[]).map((s,j)=>`<div class="option"><span style="flex:1">${esc(s)}</span><select data-tf="${q.id}" data-index="${j}"><option value="">— Chọn —</option><option value="true">Đúng</option><option value="false">Sai</option></select></div>`).join('');
    else if(q.type==='number')body=`<div class="field"><input data-text="${q.id}" type="number" step="any" placeholder="Nhập đáp án số"></div>`;
    else body=`<div class="field"><textarea data-text="${q.id}" rows="7" placeholder="Trình bày lời giải..."></textarea></div>`;
    return `<section class="question" id="q${i}"><div class="question-title">Câu ${i+1} <span class="badge">${q.points||0} điểm</span><br>${esc(q.text)}</div>${galleryV4(q)}${body}</section>`;
  };

  const oldExamEditorV4=examEditor;
  examEditor=async function(id){
    await oldExamEditorV4(id);
    if(window.__exam?.questions?.length) editExamQuestion(0);
  };

  examQuestionList=function(editable=true){
    const qs=window.__exam?.questions||[];
    return qs.length?qs.map((q,i)=>`<div class="q-row q-row-v4" data-index="${i}" ${editable?`draggable="true" ondragstart="qDragStartV4(event,${i})" ondragover="qDragOverV4(event)" ondrop="qDropV4(event,${i})"`:''} onclick="editExamQuestion(${i})"><div class="q-drag-v4" title="Kéo để đổi thứ tự">⋮⋮</div><div class="q-row-main-v4"><div class="kpi-line"><span class="badge">Câu ${i+1}</span><span class="badge info">${questionType(q.type)}</span><span class="badge">${q.points||0}đ</span>${q.images?.length?`<span class="badge ok">${q.images.length} hình</span>`:''}</div><div class="q-row-text-v4">${esc(q.text||'Chưa nhập nội dung').slice(0,95)}${(q.text||'').length>95?'…':''}</div></div>${editable?`<div class="q-move-v4"><button type="button" title="Lên" onclick="event.stopPropagation();moveExamQuestionV4(${i},-1)">↑</button><button type="button" title="Xuống" onclick="event.stopPropagation();moveExamQuestionV4(${i},1)">↓</button></div>`:''}</div>`).join(''):empty('Chưa có câu hỏi');
  };
  refreshExamList=function(){if($('#examQuestionList'))$('#examQuestionList').innerHTML=examQuestionList(window.__exam?.status!=='published')};

  window.qDragStartV4=(ev,i)=>{window.__dragExamQV4=i;ev.dataTransfer.effectAllowed='move';ev.currentTarget.classList.add('dragging')};
  window.qDragOverV4=ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='move'};
  window.qDropV4=(ev,to)=>{ev.preventDefault();$$('.q-row-v4.dragging').forEach(x=>x.classList.remove('dragging'));const from=window.__dragExamQV4;if(from===undefined||from===to)return;const qs=window.__exam.questions;const [moved]=qs.splice(from,1);qs.splice(to,0,moved);window.__dragExamQV4=undefined;refreshExamList();editExamQuestion(to);toast('Đã đổi thứ tự câu hỏi')};
  window.moveExamQuestionV4=(i,dir)=>{const j=i+dir,qs=window.__exam.questions;if(j<0||j>=qs.length)return;[qs[i],qs[j]]=[qs[j],qs[i]];refreshExamList();editExamQuestion(j)};

  const renderImageManagerV4=(q,i,editable)=>{
    const imgs=Array.isArray(q.images)?q.images:[];
    return `<div class="asset-manager-v4"><div class="asset-head-v4"><div><strong>Hình minh họa</strong><div class="muted">PNG/JPG/WEBP/GIF · tối đa 6 MB/ảnh · ${imgs.length}/4 ảnh</div></div>${editable&&imgs.length<4?`<label class="btn soft upload-btn-v4">＋ Tải ảnh<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="uploadQuestionImageV4(${i},this.files[0])"></label>`:''}</div>${imgs.length?`<div class="asset-grid-v4">${imgs.map((x,k)=>`<div class="asset-card-v4"><img src="${imgUrlV4(x.assetId)}" alt="${esc(x.alt||'Hình câu hỏi')}"><div><input ${editable?'':'disabled'} value="${esc(x.caption||'')}" placeholder="Chú thích (tùy chọn)" oninput="setQuestionImageCaptionV4(${i},${k},this.value)">${editable?`<button class="btn danger tiny-v4" onclick="removeQuestionImageV4(${i},${k})">Gỡ hình</button>`:''}</div></div>`).join('')}</div>`:`<div class="drop-hint-v4">Chưa có hình. Bạn có thể thêm sơ đồ, đồ thị, hình học hoặc ảnh đề bài.</div>`}</div>`;
  };

  editExamQuestion=function(i){
    const q=window.__exam.questions[i],editable=window.__exam.status!=='published';if(!q)return;
    window.__activeExamQIndexV4=i;
    const dis=editable?'':'disabled';
    let dyn='';
    if(q.type==='single')dyn=`<div class="field"><label>Phương án (mỗi dòng)</label><textarea id="eqOptions" rows="5" ${dis}>${esc((q.options||[]).join('\n'))}</textarea></div><div class="field"><label>Đáp án đúng (A=0, B=1...)</label><input id="eqAnswer" type="number" min="0" max="5" value="${q.answer??0}" ${dis}></div>`;
    else if(q.type==='tf')dyn=`<div class="field"><label>Mệnh đề (mỗi dòng)</label><textarea id="eqOptions" rows="5" ${dis}>${esc((q.statements||q.options||[]).join('\n'))}</textarea></div><div class="field"><label>Đáp án Đ/S, cách nhau dấu phẩy</label><input id="eqAnswerTF" value="${(q.answer||[]).map(x=>x?'Đ':'S').join(',')}" ${dis}></div>`;
    else if(q.type==='number')dyn=`<div class="form-grid"><div class="field"><label>Đáp án</label><input id="eqAnswerNum" type="number" step="any" value="${q.answer??''}" ${dis}></div><div class="field"><label>Sai số</label><input id="eqTolerance" type="number" step="any" value="${q.tolerance??0}" ${dis}></div></div>`;
    else dyn=`<div class="hint">Tự luận: giáo viên chấm thủ công.</div>`;
    $('#examEditorPane').innerHTML=`<div class="editor-head-v4"><div><div class="kpi-line"><span class="badge info">Câu ${i+1}</span><span class="badge">${questionType(q.type)}</span></div><h3>Biên tập câu hỏi</h3></div><div class="muted">Thay đổi chỉ được ghi vào đề khi bấm Lưu nháp / Xuất bản.</div></div><div class="editor-columns-v4"><div><div class="field"><label>Nội dung câu hỏi <span class="muted">(hỗ trợ LaTeX bằng $...$ hoặc $$...$$)</span></label><textarea id="eqText" rows="5" ${dis} oninput="updateQuestionPreviewV4(${i})">${esc(q.text)}</textarea></div>${renderImageManagerV4(q,i,editable)}<div class="field"><label>Loại câu</label><select id="eqType" ${dis} onchange="changeExamQType(${i})"><option value="single">Một đáp án</option><option value="tf">Đúng/Sai nhiều ý</option><option value="number">Trả lời số</option><option value="essay">Tự luận</option></select></div>${dyn}<div class="form-grid"><div class="field"><label>Điểm</label><input id="eqPoints" type="number" step="0.25" value="${q.points||1}" ${dis}></div><div class="field"><label>Giải thích</label><textarea id="eqExplanation" rows="3" ${dis}>${esc(q.explanation||'')}</textarea></div></div>${editable?`<div class="head-actions"><button class="btn primary" onclick="applyExamQuestion(${i})">Áp dụng</button><button class="btn danger" onclick="removeExamQuestion(${i})">Xóa câu</button></div>`:''}</div><aside class="preview-card-v4"><div class="eyebrow">XEM TRƯỚC</div><div id="questionPreviewV4"></div></aside></div>`;
    $('#eqType').value=q.type;
    updateQuestionPreviewV4(i);
  };

  window.updateQuestionPreviewV4=i=>{
    const q=window.__exam.questions[i];if(!q||!$('#questionPreviewV4'))return;
    const text=$('#eqText')?.value??q.text??'';
    $('#questionPreviewV4').innerHTML=`<div class="preview-question-v4"><div class="preview-num-v4">Câu ${i+1} · ${Number($('#eqPoints')?.value||q.points||1)} điểm</div><div class="preview-text-v4">${esc(text||'Nội dung câu hỏi sẽ hiển thị tại đây')}</div>${galleryV4(q,true)}</div>`;
    setTimeout(()=>window.renderMath([$('#questionPreviewV4')]).catch(()=>{}),0);
  };

  window.uploadQuestionImageV4=async(i,file)=>{
    if(!file)return;const q=window.__exam.questions[i];if(!q)return;
    if((q.images||[]).length>=4)return toast('Mỗi câu tối đa 4 hình');
    try{
      toast('Đang tải ảnh…');
      const fd=new FormData();fd.append('file',file);
      const r=await fetch('/api/teacher/question-assets',{method:'POST',credentials:'include',body:fd});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Không thể tải ảnh');
      q.images=[...(q.images||[]),{assetId:d.asset.id,alt:file.name,caption:''}];
      refreshExamList();editExamQuestion(i);toast('Đã thêm hình vào câu hỏi');
    }catch(e){toast(e.message)}
  };
  window.removeQuestionImageV4=(i,k)=>{const q=window.__exam.questions[i];if(!q?.images)return;q.images.splice(k,1);refreshExamList();editExamQuestion(i)};
  window.setQuestionImageCaptionV4=(i,k,v)=>{const q=window.__exam.questions[i];if(q?.images?.[k]){q.images[k].caption=v;updateQuestionPreviewV4(i)}};

  changeExamQType=function(i){applyExamQuestion(i,true);editExamQuestion(i)};
  applyExamQuestion=function(i,skipRefresh=false){
    const q=window.__exam.questions[i];if(!q||!$('#eqText'))return;
    q.text=$('#eqText').value;q.type=$('#eqType').value;q.points=Number($('#eqPoints').value||1);q.explanation=$('#eqExplanation').value;
    if(q.type==='single'){q.options=$('#eqOptions')?.value.split('\n').map(x=>x.trim()).filter(Boolean)||[];q.answer=Number($('#eqAnswer')?.value||0);delete q.statements;}
    else if(q.type==='tf'){q.statements=$('#eqOptions')?.value.split('\n').map(x=>x.trim()).filter(Boolean)||[];q.answer=$('#eqAnswerTF')?.value.split(',').map(x=>x.trim().toLowerCase().startsWith('đ')||x.trim().toLowerCase().startsWith('d'))||[];delete q.options;}
    else if(q.type==='number'){q.answer=Number($('#eqAnswerNum')?.value);q.tolerance=Number($('#eqTolerance')?.value||0);delete q.options;delete q.statements;}
    else {delete q.answer;delete q.options;delete q.statements;delete q.tolerance;}
    if(!skipRefresh){refreshExamList();updateQuestionPreviewV4(i);toast('Đã áp dụng thay đổi')}
  };

  addBlankQuestion=function(){window.__exam.questions.push({id:crypto.randomUUID?.()||('q'+Date.now()),type:'single',text:'',options:['','','',''],answer:0,points:1,explanation:'',images:[]});refreshExamList();editExamQuestion(window.__exam.questions.length-1)};
  removeExamQuestion=function(i){window.__exam.questions.splice(i,1);refreshExamList();window.__activeExamQIndexV4=null;$('#examEditorPane').innerHTML=empty('Đã xóa câu hỏi')};

  const baseSaveExamV4=saveExam;
  saveExam=async function(id){
    const i=window.__activeExamQIndexV4;
    if(Number.isInteger(i)&&window.__exam?.questions?.[i]&&$('#eqText'))applyExamQuestion(i,true);
    return baseSaveExamV4(id);
  };
})();
