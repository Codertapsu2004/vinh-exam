(()=>{
  const AUTH=document.getElementById('login');
  let flowRafV10=0,flowResizeV10=null;
  const kindNameV10=k=>k==='homework'?'Bài tập':'Kiểm tra';
  const proctorNameV10=a=>({off:'Không giám sát',monitor:'Theo dõi',strict:'Nghiêm ngặt'}[(a?.proctor_config||{}).mode||'off']||'Không giám sát';
  const stateV10=a=>{const n=Date.now(),o=Date.parse(a.open_at),c=Date.parse(a.close_at);if(n<o)return['scheduled','Đã lên lịch','warn'];if(n>c)return['closed','Đã đóng',''];return['open','Đang mở','ok']};

  function wordRevealV10(el){
    if(!el)return;const words=(el.textContent||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return;
    el.innerHTML=words.map((w,i)=>`<span class="auth-word-v10" style="animation-delay:${480+i*70}ms">${esc(w)}${i<words.length-1?'&nbsp;':''}</span>`).join('');
  }
  function installAuthV10(){
    if(!AUTH||AUTH.dataset.commercialV10==='1')return;AUTH.dataset.commercialV10='1';
    const canvas=document.createElement('canvas');canvas.className='auth-flow-canvas-v10';canvas.setAttribute('aria-hidden','true');
    const scrim=document.createElement('div');scrim.className='auth-flow-scrim-v10';scrim.setAttribute('aria-hidden','true');AUTH.prepend(scrim);AUTH.prepend(canvas);
    const hero=AUTH.querySelector('.login-hero');if(hero){const proof=document.createElement('div');proof.className='auth-proof-v10';proof.innerHTML='<span>✓ Lớp học & bài tập</span><span>✓ Kiểm tra & giám sát</span><span>✓ Chấm điểm & phân tích</span>';hero.appendChild(proof);wordRevealV10(hero.querySelector('h1'))}
    runFlowV10(canvas);
    const originalSwitch=window.switchAuthV8;if(originalSwitch)window.switchAuthV8=function(mode){originalSwitch(mode);setTimeout(()=>wordRevealV10(AUTH.querySelector('.login-hero h1')),20)};
  }
  function runFlowV10(canvas){
    if(!canvas||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    let w=0,h=0,dpr=1;const blobs=[{h:190,r:.34,s:.00045,ox:.18,oy:.14},{h:220,r:.30,s:.00037,ox:.72,oy:.18},{h:265,r:.28,s:.00031,ox:.67,oy:.70},{h:315,r:.25,s:.00041,ox:.23,oy:.73}];
    const resize=()=>{const b=canvas.getBoundingClientRect();dpr=Math.min(1.6,window.devicePixelRatio||1);w=Math.max(1,Math.floor(b.width*dpr));h=Math.max(1,Math.floor(b.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}};flowResizeV10=resize;window.addEventListener('resize',resize,{passive:true});resize();
    const draw=t=>{resize();ctx.fillStyle='#04050c';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';blobs.forEach((b,i)=>{const phase=t*b.s+i*1.7,x=(b.ox+.13*Math.sin(phase*1.7)+.06*Math.sin(phase*.7))*w,y=(b.oy+.16*Math.cos(phase*1.25)+.05*Math.sin(phase*1.1))*h,rad=Math.min(w,h)*(b.r+.03*Math.sin(phase));const g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`hsla(${b.h},95%,60%,.72)`);g.addColorStop(.35,`hsla(${b.h+18},92%,54%,.34)`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2)});ctx.globalCompositeOperation='source-over';const vg=ctx.createRadialGradient(w*.5,h*.45,0,w*.5,h*.45,Math.max(w,h)*.68);vg.addColorStop(0,'rgba(4,5,12,.08)');vg.addColorStop(.55,'rgba(4,5,12,.28)');vg.addColorStop(1,'rgba(4,5,12,.78)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);flowRafV10=requestAnimationFrame(draw)};flowRafV10=requestAnimationFrame(draw)
  }

  function applyRoleClassV10(){if(!ME)return;document.body.dataset.vxRole=ME.role;document.title=`VINH EXAM · ${roleName(ME.role)}`}
  const oldShowAppV10=showApp;showApp=function(){if(flowRafV10)cancelAnimationFrame(flowRafV10);if(flowResizeV10)window.removeEventListener('resize',flowResizeV10);oldShowAppV10();applyRoleClassV10();setTimeout(()=>decorateCurrentV10(),0)};
  function lifecycleV10(kind='test'){const names=kind==='homework'?['Nháp','Đã giao','Đang nhận bài','Đã hết hạn','Đã chấm / Trả bài']:['Nháp','Đã lên lịch','Đang mở','Đã đóng','Đã chấm / Công bố'];return `<div class="edu-lifecycle-v10">${names.map((x,i)=>`<span ${i===2?'class="active"':''}>${i+1}. ${x}</span>`).join('')}</div>`}
  function decorateCurrentV10(){if(!ME||!document.getElementById('page'))return;if(ME.role==='teacher'&&CURRENT==='home'&&!document.getElementById('eduCommercialV10')){const host=document.querySelector('#page .page-head');if(host)host.insertAdjacentHTML('afterend',`<div id="eduCommercialV10" class="edu-principles-v10"><div><b>Ra đề có kiểm soát</b><span>Nháp → rà soát → xuất bản. Đề đã xuất bản không sửa ngược lịch sử bài thi.</span></div><div><b>Tổ chức đúng mục đích</b><span>Bài tập để luyện tập & phản hồi; Kiểm tra để giới hạn thời gian, số lượt và giám sát.</span></div><div><b>Công bố có chủ đích</b><span>Điểm, đáp án và lời giải được cấu hình riêng thay vì mặc định hiện ngay.</span></div></div>`)}}

  /* Correct education semantics: homework and tests do not share the same actions. */
  assignmentTable=function(rows,compact=false){
    if(!rows?.length)return empty('Chưa có hoạt động');
    return `<table class="table"><thead><tr><th>Hoạt động</th><th>Lớp</th><th>Thời gian</th><th>Trạng thái</th><th>Tham gia</th><th></th></tr></thead><tbody>${rows.map(a=>{const kind=a.assignment_kind||'test',st=stateV10(a),isTest=kind==='test';return `<tr><td><div class="kpi-line"><span class="badge ${isTest?'info':''}">${kindNameV10(kind)}</span><strong>${esc(a.title)}</strong></div><div class="muted">${esc(a.exam_title||'')}</div></td><td>${esc(a.class_name||'')}</td><td>${fmt(a.open_at)}<div class="muted">→ ${fmt(a.close_at)}</div></td><td><span class="badge ${st[2]}">${st[1]}</span></td><td>${a.attempts??0} / ${a.students??0}</td><td><div class="actions">${isTest?`<button class="btn soft" onclick="openMonitor('${a.id}')">Theo dõi</button><button class="btn ghost" onclick="proctorSettingsV6('${a.id}')">${proctorNameV10(a)}</button>`:`<button class="btn soft" onclick="route('grading')">Chấm bài</button>`}<button class="btn ghost" onclick="policyV3('${a.id}',${!!a.show_score},${!!a.show_answers},${!!a.show_explanations})">Công bố</button><button class="btn ghost" onclick="editAssignment('${a.id}')">Sửa</button></div></td></tr>`}).join('')}</tbody></table>`
  };

  async function teacherMonitorHubV10(){
    const d=await api('/teacher/assignments');const rows=(d.assignments||[]).filter(x=>(x.assignment_kind||'test')==='test'),now=Date.now(),active=rows.filter(x=>Date.parse(x.open_at)<=now&&Date.parse(x.close_at)>=now),upcoming=rows.filter(x=>Date.parse(x.open_at)>now),closed=rows.filter(x=>Date.parse(x.close_at)<now);
    page('Giám sát trực tiếp','Chỉ hiển thị các bài Kiểm tra. Bài tập được xử lý trong luồng Chấm bài.',`<button class="btn primary" onclick="route('assignments')">＋ Tạo kiểm tra</button>`,`<div class="stats"><div class="stat"><small>Đang mở</small><strong>${active.length}</strong></div><div class="stat"><small>Sắp mở</small><strong>${upcoming.length}</strong></div><div class="stat"><small>Đã đóng</small><strong>${closed.length}</strong></div><div class="stat"><small>Tổng kiểm tra</small><strong>${rows.length}</strong></div></div><div class="monitor-hub-grid-v7">${rows.length?rows.map(a=>{const st=stateV10(a);return `<article class="monitor-card-v7 ${st[0]==='open'?'live':''}"><div class="monitor-card-top-v7"><span class="badge ${st[2]}">${st[1]}</span><span class="badge">${proctorNameV10(a)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.class_name)} · ${esc(a.exam_title)}</p><div class="monitor-metrics-v7"><div><b>${a.attempts??0}</b><span>đã vào</span></div><div><b>${a.students??0}</b><span>học sinh</span></div><div><b>${a.duration}</b><span>phút</span></div></div><div class="monitor-card-foot-v7"><small>${fmt(a.open_at)} → ${fmt(a.close_at)}</small><button class="btn ${st[0]==='open'?'primary':'soft'}" onclick="openMonitor('${a.id}')">Mở giám sát →</button></div></article>`}).join(''):empty('Chưa có bài kiểm tra','Tạo một bài kiểm tra để sử dụng giám sát.')}</div>`)
  }

  const teacherRouteBeforeV10=teacherRoute;teacherRoute=async function(k,...a){if(k==='monitor')return teacherMonitorHubV10();const r=await teacherRouteBeforeV10(k,...a);setTimeout(()=>decorateCurrentV10(),0);return r};
  const oldRouteV10=route;route=async function(k,...a){const r=await oldRouteV10(k,...a);setTimeout(()=>decorateCurrentV10(),0);return r};

  const oldOpenAssignmentModalV10=openAssignmentModal;openAssignmentModal=async function(){await oldOpenAssignmentModalV10();const body=document.querySelector('#modalRoot .modal-body');if(!body||body.querySelector('.education-flow-note-v10'))return;const note=document.createElement('div');note.className='education-flow-note-v10';note.innerHTML=`<div style="margin:12px 0 2px;padding:12px 14px;border-radius:14px;background:#f7f8ff;border:1px solid #e3e7ff"><b style="font-size:11px">Chọn đúng loại hoạt động</b><div style="font-size:10px;color:#69738a;margin-top:5px;line-height:1.55">Bài tập: luyện tập, phản hồi, chấm sau. Kiểm tra: lịch thi, thời lượng, giám sát và chính sách công bố kết quả.</div></div>`;body.appendChild(note)};
  const oldTeacherAssignmentsV10=teacherAssignments;teacherAssignments=async function(){const r=await oldTeacherAssignmentsV10();const head=document.querySelector('#page .page-head');if(head&&!document.querySelector('#page .edu-lifecycle-v10'))head.insertAdjacentHTML('afterend',lifecycleV10('test'));return r};

  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();const input=document.getElementById('globalSearchV7');if(input){input.focus();input.select()}}if(e.key==='Escape'&&document.querySelector('#modalRoot .modal-backdrop'))closeModal()});
  installAuthV10();setTimeout(()=>{if(ME){applyRoleClassV10();decorateCurrentV10()}},30);
})();
