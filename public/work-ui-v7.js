(()=>{
  const baseTeacherRouteV7=teacherRoute;
  const baseStudentRouteV7=studentRoute;
  const baseAdminRouteV7=adminRoute;
  const baseShowAppV7=showApp;
  const baseOpenMonitorV7=openMonitor;

  const teacherNavV7=[
    ['TỔNG QUAN',[['home','⌂','Tổng quan']]],
    ['RA ĐỀ',[['exams','▦','Kho đề thi'],['questions','◈','Ngân hàng câu hỏi'],['imports','⇧','Nhập Word / PDF'],['versions','⎇','Phiên bản đề']]],
    ['TỔ CHỨC THI',[['assignments','↗','Giao bài / Ca thi'],['monitor','◉','Giám sát trực tiếp'],['grading','✓','Chấm bài'],['gradebook','▤','Bảng điểm']]],
    ['LỚP HỌC',[['classes','♙','Lớp học'],['class-tools','⌘','Công cụ lớp'],['reviews','↻','Phúc khảo']]],
    ['HỆ THỐNG',[['notifications','◉','Thông báo'],['account','⚙','Tài khoản'],['support','?','Hỗ trợ'],['sessions','◌','Phiên đăng nhập']]]
  ];
  const studentNavV7=[
    ['HỌC TẬP',[['home','⌂','Tổng quan'],['classes','⌘','Lớp học'],['history','◫','Lịch sử làm bài'],['reviews','↻','Phúc khảo']]],
    ['TÀI KHOẢN',[['notifications','◉','Thông báo'],['account','⚙','Tài khoản'],['support','?','Hỗ trợ'],['sessions','◌','Phiên đăng nhập']]]
  ];
  const adminNavV7=[
    ['HỆ THỐNG',[['home','⌂','Tổng quan'],['users','♙','Tài khoản'],['audit','≡','Nhật ký hệ thống'],['security','⛨','Bảo mật']]],
    ['VẬN HÀNH',[['support','?','Hỗ trợ'],['notifications','◉','Thông báo'],['account','⚙','Tài khoản'],['sessions','◌','Phiên đăng nhập']]]
  ];
  navs.teacher=teacherNavV7; navs.student=studentNavV7; navs.admin=adminNavV7;

  renderNav=function(){
    const nav=$('#nav'); if(!nav||!ME)return;
    nav.innerHTML=navs[ME.role].map(([section,items])=>`<div class="nav-group-v7"><div class="nav-section">${section}</div>${items.map(([key,icon,label])=>`<button class="nav-btn" data-route="${key}" onclick="route('${key}')"><span class="nav-ico-v7">${icon}</span><span>${label}</span></button>`).join('')}</div>`).join('')+`<div class="nav-profile-v7"><div class="mini-avatar-v7">${esc((ME.name||'V')[0])}</div><div><b>${esc(ME.name||'')}</b><span>${roleName(ME.role)}</span></div></div>`;
  };

  function installTopbarV7(){
    const top=$('#app .topbar'); if(!top||top.dataset.v7==='1')return; top.dataset.v7='1';
    const brand=top.querySelector('.brand');
    if(brand){brand.innerHTML=`<div class="logo">V</div><div class="brand-copy-v7"><strong>VINH EXAM</strong><small>Assessment Workspace</small></div>`;}
    const actions=top.querySelector('.top-actions');
    if(actions){
      const search=document.createElement('div'); search.className='global-search-v7';
      search.innerHTML=`<span>⌕</span><input id="globalSearchV7" placeholder="Tìm đề thi, câu hỏi, lớp học..."><kbd>Enter</kbd>`;
      top.insertBefore(search,actions);
      const input=search.querySelector('input'); input.addEventListener('keydown',e=>{if(e.key==='Enter')globalSearchV7(input.value)});
      if(ME?.role==='teacher') actions.insertAdjacentHTML('afterbegin',`<button class="btn primary top-create-v7" onclick="route('exams')">＋ Tạo đề</button>`);
    }
  }

  showApp=function(){baseShowAppV7();installTopbarV7();renderNav();markNav('home');};

  const labelModeV7=cfg=>({off:'Không giám sát',monitor:'Theo dõi',strict:'Nghiêm ngặt'}[cfg?.mode||'off']||'Không giám sát');
  const modeClassV7=cfg=>cfg?.mode==='strict'?'bad':cfg?.mode==='monitor'?'warn':'';

  async function teacherMonitorHubV7(){
    const d=await api('/teacher/assignments'); const now=Date.now(); const rows=d.assignments||[];
    const active=rows.filter(x=>new Date(x.open_at)<=now&&new Date(x.close_at)>=now);
    const upcoming=rows.filter(x=>new Date(x.open_at)>now);
    const closed=rows.filter(x=>new Date(x.close_at)<now);
    page('Giám sát trực tiếp','Theo dõi ca thi, cảnh báo hành vi và tiến độ học sinh trong một màn hình',`<button class="btn primary" onclick="route('assignments')">＋ Tạo ca thi</button>`,
      `<div class="stats stats-v7"><div class="stat"><small>Ca đang mở</small><strong>${active.length}</strong></div><div class="stat"><small>Sắp diễn ra</small><strong>${upcoming.length}</strong></div><div class="stat"><small>Đã kết thúc</small><strong>${closed.length}</strong></div><div class="stat"><small>Tổng ca thi</small><strong>${rows.length}</strong></div></div>
      <div class="monitor-hub-grid-v7">${rows.length?rows.map(a=>{const open=new Date(a.open_at).getTime()<=now&&new Date(a.close_at).getTime()>=now;const cfg=a.proctor_config||{};return `<article class="monitor-card-v7 ${open?'live':''}"><div class="monitor-card-top-v7"><span class="badge ${open?'ok':''}">${open?'● Đang mở':new Date(a.open_at)>now?'Sắp mở':'Đã đóng'}</span><span class="badge ${modeClassV7(cfg)}">${labelModeV7(cfg)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.class_name)} · ${esc(a.exam_title)}</p><div class="monitor-metrics-v7"><div><b>${a.attempts??0}</b><span>đã vào</span></div><div><b>${a.students??0}</b><span>học sinh</span></div><div><b>${a.duration}</b><span>phút</span></div></div><div class="monitor-card-foot-v7"><small>${fmt(a.open_at)} → ${fmt(a.close_at)}</small><button class="btn ${open?'primary':'soft'}" onclick="openMonitor('${a.id}')">Mở giám sát →</button></div></article>`}).join(''):empty('Chưa có ca thi','Tạo một ca thi để bắt đầu giám sát.')}</div>`
    );
  }

  function decorateTeacherHomeV7(){
    const head=$('#page .page-head'); if(!head||$('#workflowV7'))return;
    head.insertAdjacentHTML('afterend',`<div id="workflowV7" class="workflow-v7"><button onclick="route('exams')"><span>✎</span><b>Tạo đề</b><small>Soạn / chỉnh sửa</small></button><button onclick="route('imports')"><span>⇧</span><b>Nhập PDF</b><small>Phân tích cấu trúc</small></button><button onclick="route('assignments')"><span>↗</span><b>Giao bài</b><small>Lập lịch ca thi</small></button><button onclick="route('monitor')"><span>◉</span><b>Giám sát</b><small>Theo dõi trực tiếp</small></button></div>`);
  }

  teacherRoute=async function(k,...a){
    if(k==='monitor')return teacherMonitorHubV7();
    const out=await baseTeacherRouteV7(k,...a); if(k==='home')decorateTeacherHomeV7(); return out;
  };
  studentRoute=async function(k,...a){return baseStudentRouteV7(k,...a)};
  adminRoute=async function(k,...a){return baseAdminRouteV7(k,...a)};

  openMonitor=async function(id){const out=await baseOpenMonitorV7(id);markNav('monitor');return out};

  window.globalSearchV7=async function(raw){
    const q=String(raw||'').trim().toLowerCase(); if(!q)return;
    if(ME.role==='teacher'){
      try{
        const [ex,qu,cl,as]=await Promise.all([api('/teacher/exams'),api('/teacher/questions'),api('/teacher/classes'),api('/teacher/assignments')]);
        const exams=(ex.exams||[]).filter(x=>(x.title+' '+x.subject).toLowerCase().includes(q)).slice(0,8);
        const questions=(qu.questions||[]).filter(x=>(x.prompt+' '+x.topic+' '+x.subject).toLowerCase().includes(q)).slice(0,8);
        const classes=(cl.classes||[]).filter(x=>(x.name+' '+x.subject).toLowerCase().includes(q)).slice(0,8);
        const assignments=(as.assignments||[]).filter(x=>(x.title+' '+x.exam_title+' '+x.class_name).toLowerCase().includes(q)).slice(0,8);
        page('Tìm kiếm',`Kết quả cho “${esc(raw)}”`,`<button class="btn ghost" onclick="route('home')">Đóng tìm kiếm</button>`,
          `<div class="search-results-v7"><section class="panel"><div class="panel-head"><h3>Đề thi</h3><span>${exams.length}</span></div><div class="panel-body compact-list-v7">${exams.length?exams.map(x=>`<button onclick="examEditor('${x.id}')"><span class="search-ico-v7">▦</span><div><b>${esc(x.title)}</b><small>${esc(x.subject)} · ${x.question_count||0} câu</small></div><em>›</em></button>`).join(''):empty('Không có kết quả')}</div></section>
          <section class="panel"><div class="panel-head"><h3>Câu hỏi</h3><span>${questions.length}</span></div><div class="panel-body compact-list-v7">${questions.length?questions.map(x=>`<button onclick="questionModal('${x.id}')"><span class="search-ico-v7">◈</span><div><b>${esc(x.prompt).slice(0,90)}</b><small>${esc(x.topic||x.subject||'')}</small></div><em>›</em></button>`).join(''):empty('Không có kết quả')}</div></section>
          <section class="panel"><div class="panel-head"><h3>Lớp học</h3><span>${classes.length}</span></div><div class="panel-body compact-list-v7">${classes.length?classes.map(x=>`<button onclick="route('classes')"><span class="search-ico-v7">♙</span><div><b>${esc(x.name)}</b><small>${esc(x.subject||'')} · ${x.students||0} học sinh</small></div><em>›</em></button>`).join(''):empty('Không có kết quả')}</div></section>
          <section class="panel"><div class="panel-head"><h3>Ca thi</h3><span>${assignments.length}</span></div><div class="panel-body compact-list-v7">${assignments.length?assignments.map(x=>`<button onclick="openMonitor('${x.id}')"><span class="search-ico-v7">◉</span><div><b>${esc(x.title)}</b><small>${esc(x.class_name)} · ${fmt(x.open_at)}</small></div><em>›</em></button>`).join(''):empty('Không có kết quả')}</div></section></div>`);
      }catch(e){toast(e.message)}
    }else if(ME.role==='student'){
      try{const d=await api('/student/dashboard');const rows=(d.assignments||[]).filter(x=>(x.title+' '+x.exam_title+' '+x.class_name).toLowerCase().includes(q));page('Tìm kiếm',`Kết quả cho “${esc(raw)}”`,'',`<div class="panel"><div class="table-wrap">${studentAssignmentTable(rows)}</div></div>`)}catch(e){toast(e.message)}
    }else toast('Tìm kiếm nhanh hiện ưu tiên khu vực học tập và giáo viên');
  };

  setTimeout(()=>{if(ME){renderNav();installTopbarV7();}},0);
})();
