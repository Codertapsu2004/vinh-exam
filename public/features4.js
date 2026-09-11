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
    // features3 owns the visual renderer; expose the EventSource through a small wrapper
    const OriginalEventSource=window.EventSource;
    window.EventSource=function(...args){const es=new OriginalEventSource(...args);window.__vinhExamMonitorES=es;return es};
    window.EventSource.prototype=OriginalEventSource.prototype;
    try{return await oldOpenMonitorV4(id)} finally {window.EventSource=OriginalEventSource;}
  };
})();
