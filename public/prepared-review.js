(()=>{
 'use strict';
 let session=null;
 const root=()=>document.querySelector('#solutionImportRoot');
 const active=s=>session===s&&root()?.dataset.assignment===s.id;
 function error(message){const el=document.querySelector('#solutionImportError');if(el){el.textContent=message;el.hidden=!message;}}
 function invalidate(){if(!session)return;session.preview=null;session.version++;const p=document.querySelector('#solutionImportPreview');if(p)p.innerHTML='';const b=document.querySelector('#savePreparedButton');if(b)b.disabled=true;error('');}
 function filename(title){return String(title||'de-kiem-tra').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,65)||'de-kiem-tra';}
 window.downloadSolutionTemplate=async(id,button)=>{try{
  if(button)button.disabled=true;const d=await api('/teacher/assignments/'+encodeURIComponent(id)+'/solutions/template');
  const url=URL.createObjectURL(new Blob([JSON.stringify(d.package,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=filename(d.package.title)+'-mau-loi-giai.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){toast(e.message);}finally{if(button?.isConnected)button.disabled=false;}};
 window.preparedSolutionPanel=(id,p)=>`<section class="prepared-panel" aria-label="Lời giải có sẵn"><div class="prepared-panel-heading"><div><span class="prepared-kicker">KHÔNG DÙNG API</span><h4>Lời giải có sẵn</h4><p>${p?.stale?'Đề đã thay đổi. Cần nhập lại lời giải cho phiên bản hiện tại.':p?.ready?`${p.ready}/${p.total} câu · ${p.visuals} hình minh họa hoặc mô phỏng`:'Nhập một bộ lời giải cho cả đề, tự ghép vào từng câu.'}</p></div><button class="btn soft" onclick="openSolutionImport('${id}')">${p?.ready?'Bổ sung lời giải':'Nhập lời giải'}</button></div>${p?.items?.length?`<details class="prepared-saved"><summary>Xem lời giải đã lưu</summary>${p.items.map(x=>`<details class="ai-job-item"><summary><span>Câu ${x.number}</span><span class="badge ok">Đã lưu</span></summary>${window.renderDetailedSolution(x.solution)}</details>`).join('')}</details>`:''}</section>`;
 window.openSolutionImport=async id=>{
  const s={id,version:0,preview:null,busy:false};
  modal('Nhập lời giải theo đề',`<div id="solutionImportRoot" data-assignment="${esc(id)}"><div class="prepared-intro"><span class="prepared-kicker">LƯU MỘT LẦN · DÙNG CHO CẢ LỚP</span><h3>Lời giải rõ ràng, hình vẽ đi cùng.</h3><p>Nhập bộ đã soạn, kiểm tra cách ghép câu rồi chọn công bố.</p></div>
   <section class="prepared-step"><div class="prepared-step-heading"><span>1</span><h4>Chuẩn bị lời giải</h4></div><p>Tải mẫu có sẵn nội dung và mã câu. Gửi mẫu cùng đề gốc để soạn lời giải; nhập lại file đã hoàn thành.</p><button type="button" class="btn soft" onclick="downloadSolutionTemplate('${id}',this)">Tải mẫu của đề này</button><p class="field-help">File mẫu có hướng dẫn cho hình vẽ và mô phỏng. Nếu đề có ảnh, gửi kèm file đề gốc.</p></section>
   <section class="prepared-step"><div class="prepared-step-heading"><span>2</span><h4>Nhập bộ đã soạn</h4></div><label class="prepared-file" for="solutionImportFile"><strong>Chọn file lời giải</strong><span>JSON, TXT hoặc MD · tối đa 1 MB</span><input id="solutionImportFile" type="file" accept=".json,.txt,.md,application/json,text/plain,text/markdown"></label><span id="solutionFileName" class="field-help" aria-live="polite"></span><div class="field"><label for="solutionImportText">Hoặc dán nội dung</label><textarea id="solutionImportText" rows="7" spellcheck="false" placeholder="Câu 1.\nLời giải chi tiết...\nKết luận: ...\n\nCâu 2.\nLời giải chi tiết..."></textarea></div><p class="field-help">Văn bản: đánh số liên tục cho cả đề. Muốn có hình và mô phỏng, dùng file JSON theo mẫu.</p></section>
   <div id="solutionImportError" class="ai-provider-alert" role="alert" hidden></div><div id="solutionImportPreview" aria-live="polite"></div></div>`,
   `<button class="btn ghost" onclick="openResultRelease('${id}')">Quay lại</button><button class="btn soft" id="previewPreparedButton">Xem trước</button><button class="btn primary" id="savePreparedButton" disabled>Lưu lời giải</button>`);
  session=s;
  const text=document.querySelector('#solutionImportText');
  text.addEventListener('input',invalidate);
  document.querySelector('#solutionImportFile').addEventListener('change',async event=>{
   const file=event.target.files[0];if(!file)return;invalidate();const version=s.version;text.value='';
   if(file.size>1024*1024){error('File vượt quá 1 MB. Hãy chia thành các lượt nhập nhỏ hơn.');return;}
   if(!/\.(json|txt|md)$/i.test(file.name)){error('Chọn file JSON, TXT hoặc MD. Với Word/PDF, hãy sao chép phần lời giải vào ô bên dưới.');return;}
   try{const content=await file.text();if(!active(s)||s.version!==version)return;text.value=content;document.querySelector('#solutionFileName').textContent=file.name;}catch{if(active(s))error('Chưa đọc được file. Hãy chọn lại hoặc dán nội dung.');}
  });
  document.querySelector('#previewPreparedButton').addEventListener('click',()=>preview(s));
  document.querySelector('#savePreparedButton').addEventListener('click',()=>save(s));
 };
 async function preview(s){
  if(!active(s)||s.busy)return;invalidate();const content=document.querySelector('#solutionImportText').value,version=s.version,button=document.querySelector('#previewPreparedButton');
  s.busy=true;button.disabled=true;button.textContent='Đang ghép câu…';
  try{
   const p=await api('/teacher/assignments/'+encodeURIComponent(s.id)+'/solutions/preview',{method:'POST',body:JSON.stringify({content})});
   if(!active(s)||s.version!==version)return;s.preview={...p,content};
   document.querySelector('#solutionImportPreview').innerHTML=`<section class="prepared-step prepared-confirm"><div class="prepared-step-heading"><span>3</span><h4>Kiểm tra trước khi lưu</h4></div><div class="prepared-stats"><span><b>${p.imported}</b> câu vừa nhập</span><span><b>${p.ready}/${p.total}</b> câu có lời giải sau khi lưu</span><span><b>${p.visuals}</b> hình / mô phỏng sau khi lưu</span></div>${p.warnings.length?`<ul class="prepared-warnings">${p.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<p class="field-help">Hệ thống kiểm tra cấu trúc và đáp án đã khai báo. Giáo viên kiểm tra lập luận, kiến thức theo lớp và tính đúng của hình.</p>${p.preview.map(x=>`<details class="ai-job-item" ${p.preview.length===1?'open':''}><summary><span>Câu ${x.number} · ${esc(x.question.text.slice(0,110))}</span><span class="badge ${x.answerChecked?'ok':''}">${x.answerChecked?'Khớp đáp án':'Cần đọc lại'}</span></summary><div class="prepared-source"><p>${esc(x.question.text)}</p>${x.question.options?.length?`<ol type="A">${x.question.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}${x.question.statements?.length?`<ol type="a">${x.question.statements.map(o=>`<li>${esc(typeof o==='string'?o:o.text||'')}</li>`).join('')}</ol>`:''}${(x.question.images||[]).map(im=>`<img loading="lazy" class="grade-question-image" src="/api/question-assets/${encodeURIComponent(im.assetId)}" alt="${esc(im.alt||'Hình đề gốc')}">`).join('')}</div>${window.renderDetailedSolution(x.solution)}</details>`).join('')}<label class="prepared-ack"><input type="checkbox" id="preparedReviewed"><span>Tôi đã kiểm tra các câu được ghép, nội dung lời giải và hình minh họa.</span></label><p class="field-help">Lưu xong, lời giải được giữ kín cho đến khi bạn bật công bố. Các lượt làm và điểm số được giữ nguyên.</p></section>`;
   document.querySelector('#preparedReviewed').addEventListener('change',event=>{document.querySelector('#savePreparedButton').disabled=!event.target.checked||!s.preview;});
   window.renderMath?.([root()]);document.querySelector('#solutionImportPreview').scrollIntoView?.({behavior:'smooth',block:'start'});
  }catch(e){if(active(s)&&s.version===version)error(e.message);}
  finally{if(active(s)){s.busy=false;button.disabled=false;button.textContent='Xem trước';}}
 }
 async function save(s){
  if(!active(s)||s.busy||!s.preview||!document.querySelector('#preparedReviewed')?.checked)return;
  const content=document.querySelector('#solutionImportText').value;if(content!==s.preview.content){invalidate();error('Nội dung đã thay đổi. Hãy bấm Xem trước lại.');return;}
  s.busy=true;const button=document.querySelector('#savePreparedButton');button.disabled=true;button.textContent='Đang lưu…';error('');
  try{
   await api('/teacher/assignments/'+encodeURIComponent(s.id)+'/solutions',{method:'POST',body:JSON.stringify({content,previewToken:s.preview.previewToken,reviewed:true})});
   if(!active(s))return;toast('Đã lưu lời giải. Bật “Hiện lời giải & hình minh họa” khi muốn công bố.');await openResultRelease(s.id);
  }catch(e){if(active(s)){error(e.message);button.disabled=false;button.textContent='Lưu lời giải';}}
  finally{if(active(s))s.busy=false;}
 }
})();
