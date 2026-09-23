(() => {
  const paths = {home:'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',exams:'M5 3h10l4 4v14H5zM9 11h6M9 15h6M9 7h2',classes:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',questions:'M8 8a4 4 0 0 1 8 0c0 3-4 3-4 6M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',assignments:'M21 3 8 16M21 3l-6 18-4-8-8-4z',grading:'m4 12 5 5L20 6',gradebook:'M4 20V10M10 20V4M16 20v-7M22 20H2',history:'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',tools:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'};
  const icon = key => `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[key] || paths.tools}"/></svg>`;
  navs.teacher = [['Không gian của bạn',[['home','','Tổng quan'],['exams','','Kho đề'],['classes','','Lớp học'],['assignments','','Bài đã giao'],['grading','','Chấm bài'],['gradebook','','Bảng điểm']]],['Thư viện',[['questions','','Câu hỏi'],['tools','','Công cụ']]]];
  navs.student = [['Học tập',[['home','','Bài của bạn'],['classes','','Lớp học'],['history','','Kết quả'],['tools','','Tiện ích']]]];
  navs.admin = [['Quản lý',[['home','','Tổng quan'],['users','','Tài khoản'],['audit','','Nhật ký'],['security','','Bảo mật'],['tools','','Công cụ']]]];
  renderNav = function () {
    $('#nav').innerHTML = navs[ME.role].map(([label, items]) => `<div class="nav-section">${label}</div>${items.map(([key,,title]) => `<button class="nav-btn" data-route="${key}" onclick="route('${key}')"><span>${icon(key)}</span><span>${title}</span></button>`).join('')}`).join('');
  };
  const baseMarkNav = markNav;
  markNav = key => { baseMarkNav(key); $$('.nav-btn').forEach(b => b.setAttribute('aria-current', b.dataset.route === key ? 'page' : 'false')); };
  for(const role of ['teacher','student','admin']) {
    if(role==='teacher'){const old=teacherRoute;teacherRoute=(key,...args)=>key==='tools'?toolsPage():old(key,...args);}
    if(role==='student'){const old=studentRoute;studentRoute=(key,...args)=>key==='tools'?toolsPage():old(key,...args);}
    if(role==='admin'){const old=adminRoute;adminRoute=(key,...args)=>key==='tools'?toolsPage():old(key,...args);}
  }
  const baseLogout=logout;
  logout=async()=>{if(window.__attempt?.saver?.dirty){try{await saveAttempt()}catch{toast('Bài chưa được lưu. Kiểm tra kết nối trước khi đăng xuất.');return}}return baseLogout()};
  const baseRoute = route;
  route = async function (key, ...args) {
    if (window.__attempt?.saver?.dirty) {
      try { await saveAttempt(); } catch { toast('Bài chưa được lưu. Hãy kiểm tra kết nối trước khi rời trang.'); return; }
    }
    clearTimeout(saveTimer); window.__attempt = null; document.body.classList.remove('exam-active');
    window.__vinhExamMonitorES?.close(); window.__vinhExamMonitorES = null;
    CURRENT = key; const bar = document.createElement('div'); bar.className = 'play-loading'; bar.setAttribute('role','progressbar'); bar.setAttribute('aria-label','Đang tải'); document.body.append(bar);
    try { return await baseRoute(key, ...args); }
    finally { bar.remove(); }
  };
  function toolsPage() {
    const common = [['account','Tài khoản','Thông tin cá nhân và mật khẩu'],['sessions','Thiết bị đăng nhập','Kiểm tra và thu hồi phiên đăng nhập'],['support','Hỗ trợ','Gửi và theo dõi yêu cầu hỗ trợ']];
    const items = ME.role === 'teacher' ? [['imports','Nhập Word / PDF','Tải đề có sẵn, rà soát và tạo đề nháp'],['class-tools','Công cụ lớp','Mã tham gia và danh sách học sinh'],['versions','Phiên bản đề','Xem lại các lần lưu đề'],['reviews','Phúc khảo','Xem yêu cầu từ học sinh'],...common] : ME.role === 'student' ? [['reviews','Phúc khảo','Gửi yêu cầu xem lại kết quả'],...common] : common;
    page('Công cụ','','',`<div class="tool-grid">${items.map(([key,title,desc]) => `<button class="tool-card" onclick="route('${key}')"><strong>${title} ↗</strong><small>${desc}</small></button>`).join('')}</div>`);
  }
  const paper = `<div class="paper-art" aria-hidden="true"><div class="paper-back"></div><div class="paper-front"><small>VINH EXAM / VẬT LÍ</small><b>F = ma</b><div class="paper-lines"><i></i><i></i><i></i></div><span class="paper-check">✓</span></div><span class="paper-star">✳</span><span class="paper-note">CỨ THỬ ĐI!</span></div>`;
  teacherHome = async function () {
    const d = await api('/teacher/dashboard');
    page('Góc dạy học',`Chào ${esc(ME.name)}. Hôm nay mình bắt đầu từ đâu?`,'',`<section class="play-hero"><div><div class="eyebrow">MỖI BÀI HỌC, MỘT BƯỚC TIẾN</div><h2>Học thật.<br>Tiến thật.</h2><div class="head-actions"><button class="btn primary" onclick="newExam()">Tạo đề mới ＋</button><button class="btn ghost" onclick="route('imports')">Nhập Word / PDF ↗</button></div></div>${paper}</section><div class="stats"><div class="stat"><small>Lớp đang dạy</small><strong>${d.stats.classes}</strong></div><div class="stat"><small>Đề trong kho</small><strong>${d.stats.exams}</strong></div><div class="stat"><small>Bài đang mở</small><strong>${d.stats.active}</strong></div><div class="stat"><small>Đang chờ chấm</small><strong>${d.stats.pending}</strong></div></div><section class="panel"><div class="panel-head"><h3>Bài đã giao gần đây</h3><button class="btn ghost" onclick="route('assignments')">Xem tất cả ↗</button></div><div class="table-wrap">${assignmentTable(d.recent,true)}</div></section>`);
  };
  assignmentTable = function (rows,compact=false) {
    if(!rows?.length)return empty('Chưa có bài được giao','Tạo lớp và xuất bản đề để bắt đầu.');
    const now=Date.now();
    return `<table class="table"><thead><tr><th>Bài đã giao</th><th>Lớp</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.map(a=>{
      const test=(a.assignment_kind||'test')==='test',state=now<Date.parse(a.open_at)?['Sắp mở','warn']:now>Date.parse(a.close_at)?['Đã đóng','']:['Đang mở','ok'];
      return `<tr><td><strong>${esc(a.title)}</strong><div class="muted">${test?'Kiểm tra':'Bài tập'} · ${esc(a.exam_title||'')}</div></td><td>${esc(a.class_name||'')}</td><td>${fmt(a.open_at)}<div class="muted">đến ${fmt(a.close_at)}</div></td><td><span class="badge ${state[1]}">${state[0]}</span></td><td class="actions">${test?`<button class="btn soft" onclick="openMonitor('${a.id}')">Theo dõi</button>`:`<button class="btn soft" onclick="route('grading')">Chấm bài</button>`}${!compact?`<button class="btn ghost" onclick="policyV3('${a.id}',${!!a.show_score},${!!a.show_answers},${!!a.show_explanations})">Công bố</button><button class="btn ghost" onclick="editAssignment('${a.id}')">Sửa</button>${test?`<button class="btn ghost" onclick="proctorSettingsV6('${a.id}')">Giám sát</button>`:''}`:''}</td></tr>`;
    }).join('')}</tbody></table>`;
  };
  let exams = [], examPage = 0;
  teacherExams = async function () {
    exams = (await api('/teacher/exams')).exams; examPage = 0;
    page('Kho đề','Những bài kiểm tra mang dấu ấn của bạn.',`<button class="btn ghost" onclick="route('imports')">Nhập Word / PDF ↗</button><button class="btn primary" onclick="newExam()">Tạo đề mới ＋</button>`,`<div class="exam-filters"><input id="examSearch" type="search" placeholder="Tìm tên đề, môn học…" aria-label="Tìm đề thi"><select id="examStatus" aria-label="Trạng thái"><option value="">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select><select id="examSort" aria-label="Sắp xếp"><option value="recent">Mới nhất</option><option value="title">Tên A → Z</option></select></div><div id="examCards"></div>`);
    for (const id of ['examSearch','examStatus','examSort']) document.getElementById(id).addEventListener(id === 'examSearch' ? 'input' : 'change', () => { examPage = 0; renderExams(); });
    renderExams();
  };
  function renderExams() {
    const query = $('#examSearch').value.trim().toLocaleLowerCase('vi'), status = $('#examStatus').value;
    let filtered = exams.filter(e => (!status || e.status === status) && `${e.title} ${e.subject || ''}`.toLocaleLowerCase('vi').includes(query));
    if ($('#examSort').value === 'title') filtered.sort((a,b) => a.title.localeCompare(b.title,'vi'));
    const pages = Math.ceil(filtered.length / 12); examPage = Math.max(0,Math.min(examPage,pages-1));
    const rows = filtered.slice(examPage*12,examPage*12+12);
    $('#examCards').innerHTML = rows.length ? `<div class="exam-grid">${rows.map(e => `<article class="exam-card"><div class="exam-card-cover"><span>${esc(e.subject || 'Đề kiểm tra')}</span><span aria-hidden="true">${/l[iíý]/i.test(e.subject || '') ? 'F = ma' : '∑'}</span></div><div class="exam-card-body"><h3>${esc(e.title)}</h3>${badge(e.status)}<div class="exam-meta"><span>${e.question_count} câu hỏi</span><span>${e.duration} phút</span><span>${e.max_score} điểm</span></div><div class="exam-card-foot"><button class="btn primary" onclick="examEditor('${e.id}')">${e.status==='draft'?'Soạn tiếp':'Sửa đề'} ↗</button>${e.status==='published'?`<button class="btn ghost" onclick="cloneExam('${e.id}')">Nhân bản</button>`:''}</div></div></article>`).join('')}</div><div class="page-count"><span>${filtered.length} đề · Trang ${examPage+1}/${pages}</span>${pages>1?`<div class="head-actions"><button class="btn ghost" onclick="changeExamPage(-1)" ${examPage===0?'disabled':''}>← Trước</button><button class="btn ghost" onclick="changeExamPage(1)" ${examPage===pages-1?'disabled':''}>Sau →</button></div>`:''}</div>` : `<div class="panel">${empty(exams.length?'Không tìm thấy đề phù hợp':'Đề đầu tiên đang chờ bạn.',exams.length?'Thử tên khác hoặc đổi bộ lọc.':'Tạo đề mới hoặc nhập tệp Word / PDF để bắt đầu.')}</div>`;
  }
  window.changeExamPage = delta => { examPage += delta; renderExams(); };
  const basePage = page;
  page = function (...args) { window.MathJax?.typesetClear?.([$('#page')]); basePage(...args); if (!$('#questions')) document.body.classList.remove('exam-active'); };
  let modalFocus = null;
  const baseModal = modal, baseClose = closeModal;
  modal = function (...args) {
    const focus = document.activeElement; baseModal(...args); modalFocus = focus;
    const dialog = $('#modalRoot .modal'); dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    const heading = dialog.querySelector('.modal-head strong'); heading.id = 'dialogTitle'; dialog.setAttribute('aria-labelledby','dialogTitle');
    dialog.querySelector('.close').setAttribute('aria-label','Đóng');
    dialog.querySelector('input:not([type=hidden]),select,textarea,button')?.focus();
  };
  closeModal = function () { baseClose(); if (modalFocus?.isConnected) modalFocus.focus(); modalFocus = null; };
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const dialog = $('#modalRoot .modal'); if (!dialog) return;
    const items = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.addEventListener('beforeunload', event => { if (window.__attempt?.saver?.dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('online', () => { if (window.__attempt?.saver?.dirty) saveAttempt().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.__attempt?.saver?.dirty) saveAttempt().catch(() => {}); });
})();
