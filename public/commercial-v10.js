(()=>{
  const AUTH=document.getElementById('login');
  let flowRafV10=0,flowResizeV10=null;

  function wordRevealV10(el){
    if(!el)return;const text=(el.textContent||'').trim();if(!text)return;
    el.innerHTML=text.split(/\s+/).map((w,i)=>`<span class="auth-word-v10" style="animation-delay:${480+i*70}ms">${esc(w)}${i<text.split(/\s+/).length-1?'&nbsp;':''}</span>`).join('');
  }
  function installAuthV10(){
    if(!AUTH||AUTH.dataset.commercialV10==='1')return;AUTH.dataset.commercialV10='1';
    const canvas=document.createElement('canvas');canvas.className='auth-flow-canvas-v10';canvas.setAttribute('aria-hidden','true');
    const scrim=document.createElement('div');scrim.className='auth-flow-scrim-v10';scrim.setAttribute('aria-hidden','true');
    AUTH.prepend(scrim);AUTH.prepend(canvas);
    const hero=AUTH.querySelector('.login-hero');
    if(hero){
      const proof=document.createElement('div');proof.className='auth-proof-v10';proof.innerHTML='<span>✓ Lớp học & bài tập</span><span>✓ Kiểm tra & giám sát</span><span>✓ Chấm điểm & phân tích</span>';
      hero.appendChild(proof);wordRevealV10(hero.querySelector('h1'));
    }
    runFlowV10(canvas);
    const originalSwitch=window.switchAuthV8;
    if(originalSwitch)window.switchAuthV8=function(mode){originalSwitch(mode);setTimeout(()=>wordRevealV10(AUTH.querySelector('.login-hero h1')),20)};
  }

  function runFlowV10(canvas){
    if(!canvas||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    let w=0,h=0,dpr=1,t=0;
    const blobs=[
      {h:190,r:.34,s:.00045,ox:.18,oy:.14},{h:220,r:.30,s:.00037,ox:.72,oy:.18},{h:265,r:.28,s:.00031,ox:.67,oy:.70},{h:315,r:.25,s:.00041,ox:.23,oy:.73}
    ];
    const resize=()=>{const b=canvas.getBoundingClientRect();dpr=Math.min(1.6,window.devicePixelRatio||1);w=Math.max(1,Math.floor(b.width*dpr));h=Math.max(1,Math.floor(b.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}};
    flowResizeV10=resize;window.addEventListener('resize',resize,{passive:true});resize();
    const draw=ts=>{t=ts;resize();ctx.fillStyle='#04050c';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';
      blobs.forEach((b,i)=>{const phase=t*b.s+i*1.7;const x=(b.ox+.13*Math.sin(phase*1.7)+.06*Math.sin(phase*.7))*w;const y=(b.oy+.16*Math.cos(phase*1.25)+.05*Math.sin(phase*1.1))*h;const rad=Math.min(w,h)*(b.r+.03*Math.sin(phase));const g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`hsla(${b.h},95%,60%,.72)`);g.addColorStop(.35,`hsla(${b.h+18},92%,54%,.34)`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2)});
      ctx.globalCompositeOperation='source-over';const vg=ctx.createRadialGradient(w*.5,h*.45,0,w*.5,h*.45,Math.max(w,h)*.68);vg.addColorStop(0,'rgba(4,5,12,.08)');vg.addColorStop(.55,'rgba(4,5,12,.28)');vg.addColorStop(1,'rgba(4,5,12,.78)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);flowRafV10=requestAnimationFrame(draw)};
    flowRafV10=requestAnimationFrame(draw);
  }

  function applyRoleClassV10(){if(!ME)return;document.body.dataset.vxRole=ME.role;document.title=`VINH EXAM · ${roleName(ME.role)}`}
  const oldShowAppV10=showApp;
  showApp=function(){if(flowRafV10)cancelAnimationFrame(flowRafV10);if(flowResizeV10)window.removeEventListener('resize',flowResizeV10);oldShowAppV10();applyRoleClassV10();setTimeout(()=>decorateCurrentV10(),0)};

  function lifecycleV10(kind='test'){
    const names=kind==='homework'?['Nháp','Đã giao','Đang nhận bài','Đã hết hạn','Đã chấm / Trả bài']:['Nháp','Đã lên lịch','Đang mở','Đã đóng','Đã chấm / Công bố'];
    return `<div class="edu-lifecycle-v10">${names.map((x,i)=>`<span ${i===2?'class="active"':''}>${i+1}. ${x}</span>`).join('')}</div>`;
  }
  function decorateCurrentV10(){
    if(!ME||!document.getElementById('page'))return;
    if(ME.role==='teacher'&&CURRENT==='home'&&!document.getElementById('eduCommercialV10')){
      const host=document.querySelector('#page .page-head');if(host)host.insertAdjacentHTML('afterend',`<div id="eduCommercialV10" class="edu-principles-v10"><div><b>Ra đề có kiểm soát</b><span>Nháp → rà soát → xuất bản. Đề đã xuất bản không sửa ngược lịch sử bài thi.</span></div><div><b>Tổ chức đúng mục đích</b><span>Bài tập để luyện tập & phản hồi; Kiểm tra để giới hạn thời gian, số lượt và giám sát.</span></div><div><b>Công bố có chủ đích</b><span>Điểm, đáp án và lời giải được cấu hình riêng thay vì mặc định hiện ngay.</span></div></div>`)
    }
  }

  const oldRouteV10=route;
  route=async function(k,...a){const r=await oldRouteV10(k,...a);setTimeout(()=>decorateCurrentV10(),0);return r};

  const oldOpenAssignmentModalV10=openAssignmentModal;
  openAssignmentModal=async function(){await oldOpenAssignmentModalV10();const body=document.querySelector('#modalRoot .modal-body');if(!body||body.querySelector('.education-flow-note-v10'))return;const note=document.createElement('div');note.className='education-flow-note-v10';note.innerHTML=`<div style="margin:12px 0 2px;padding:12px 14px;border-radius:14px;background:#f7f8ff;border:1px solid #e3e7ff"><b style="font-size:11px">Nghiệp vụ hoạt động học tập</b><div style="font-size:10px;color:#69738a;margin-top:5px;line-height:1.55">Bài tập: ưu tiên luyện tập, phản hồi và chấm sau. Kiểm tra: ưu tiên lịch thi, thời lượng, giám sát và chính sách công bố kết quả.</div></div>`;body.appendChild(note)};

  const oldTeacherAssignmentsV10=teacherAssignments;
  teacherAssignments=async function(){const r=await oldTeacherAssignmentsV10();const head=document.querySelector('#page .page-head');if(head&&!document.querySelector('#page .edu-lifecycle-v10'))head.insertAdjacentHTML('afterend',lifecycleV10('test'));return r};

  document.addEventListener('keydown',e=>{
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();const input=document.getElementById('globalSearchV7');if(input){input.focus();input.select()}}
    if(e.key==='Escape'&&document.querySelector('#modalRoot .modal-backdrop'))closeModal();
  });

  installAuthV10();
  setTimeout(()=>{if(ME){applyRoleClassV10();decorateCurrentV10()}},30);
})();
