(()=>{
  const login=document.getElementById('login');
  if(!login||login.dataset.flowstateV11==='1')return;
  login.dataset.flowstateV11='1';
  login.classList.add('flowstate-v11');

  const hero=login.querySelector('.login-hero');
  const cardWrap=login.querySelector('.login-card-wrap');
  const card=login.querySelector('.login-card');

  function revealWords(el,{base=480,stagger=85,y=26,duration=720}={}){
    if(!el)return;const text=(el.textContent||'').trim();if(!text)return;
    const words=text.split(/\s+/);
    el.innerHTML=words.map((w,i)=>`<span class="flow-word-v11" style="--fw-delay:${base+i*stagger}ms;--fw-y:${y}px;--fw-duration:${duration}ms">${esc(w)}${i<words.length-1?'&nbsp;':''}</span>`).join('');
  }
  function revealHeroCopy(){
    revealWords(hero?.querySelector('h1'),{base:480,stagger:85,y:26,duration:720});
    revealWords(hero?.querySelector('p'),{base:1150,stagger:22,y:14,duration:600});
  }

  function openAuth(mode='login'){
    login.classList.add('auth-open-v11');
    if(typeof window.switchAuthV8==='function') window.switchAuthV8(mode==='register'?'register':'login');
    setTimeout(()=>document.getElementById(mode==='register'?'regNameV8':'loginName')?.focus(),160);
  }
  function closeAuth(){login.classList.remove('auth-open-v11')}
  window.openFlowAuthV11=openAuth;
  window.closeFlowAuthV11=closeAuth;

  const nav=document.createElement('header');
  nav.className='flow-nav-v11';
  nav.innerHTML=`
    <button class="flow-brand-v11" type="button" style="border:0;background:none;cursor:pointer;padding:0" onclick="closeFlowAuthV11()" aria-label="VINH EXAM">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 9c2.5 0 2.5 4.2 5 4.2S10 9 12 9s2.5 4.2 5 4.2S19.5 9 21.5 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.5 15c2.5 0 2.5 4.2 5 4.2S10 15 12 15s2.5 4.2 5 4.2S19.5 15 21.5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".5"/></svg>
      <span>VINH EXAM<small>Assessment Workspace</small></span>
    </button>
    <nav class="flow-nav-links-v11" aria-label="Điều hướng giới thiệu">
      <button type="button" onclick="flowInfoV11('teacher')">Giáo viên</button>
      <button type="button" onclick="flowInfoV11('student')">Học sinh</button>
      <button type="button" onclick="flowInfoV11('proctor')">Giám sát</button>
      <button type="button" onclick="flowInfoV11('product')">Sản phẩm</button>
    </nav>
    <div class="flow-nav-actions-v11"><button type="button" class="flow-glass-btn-v11" onclick="openFlowAuthV11('login')">Đăng nhập</button><button type="button" class="flow-white-btn-v11" onclick="openFlowAuthV11('register')">Bắt đầu</button></div>`;
  login.appendChild(nav);

  if(hero){
    hero.querySelector('.eyebrow')?.replaceChildren(document.createTextNode('Nền tảng dạy học & kiểm tra trực tuyến'));
    const h=hero.querySelector('h1'); if(h) h.textContent='Dạy học sâu hơn. Kiểm tra thông minh hơn.';
    const p=hero.querySelector('p'); if(p) p.textContent='Từ lớp học, ra đề, giao bài đến giám sát và chấm điểm — một không gian tập trung, rõ ràng và đẹp để giáo viên lẫn học sinh đều muốn sử dụng mỗi ngày.';
    revealHeroCopy();
    const cta=document.createElement('div');
    cta.className='flow-cta-bar-v11';
    cta.innerHTML=`<div class="flow-cta-copy-v11"><b>Sẵn sàng tạo lớp hoặc vào học?</b><span>Đăng ký miễn phí · Không cần cài đặt · Dữ liệu lưu trên máy chủ</span></div><button type="button" class="flow-white-btn-v11" onclick="openFlowAuthV11('register')">Bắt đầu ngay →</button>`;
    hero.appendChild(cta);
  }

  const footer=document.createElement('footer');
  footer.className='flow-footer-v11';
  footer.textContent='© 2026 VINH EXAM — engineered for focused learning.';
  login.appendChild(footer);

  if(card){
    const close=document.createElement('button'); close.type='button';close.className='flow-auth-close-v11';close.innerHTML='×';close.setAttribute('aria-label','Đóng');close.onclick=closeAuth;card.prepend(close);
  }
  cardWrap?.addEventListener('click',e=>{if(e.target===cardWrap)closeAuth()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&login.classList.contains('auth-open-v11'))closeAuth()});

  window.flowInfoV11=(type)=>{
    const info={
      teacher:['Không gian Giáo viên','Tạo lớp, xây ngân hàng câu hỏi, nhập PDF/Word, soạn đề, giao bài, tổ chức ca thi, chấm và theo dõi kết quả.'],
      student:['Không gian Học sinh','Vào lớp, xem Bài tập và Kiểm tra tách riêng, làm bài có autosave, xem điểm, nhận phản hồi và phúc khảo.'],
      proctor:['Giám sát ca thi','Theo dõi tiến độ, chuyển tab, fullscreen và nhật ký cảnh báo theo thời gian thực — nhưng luôn để giáo viên là người kết luận.'],
      product:['Một hệ thống, một luồng công việc','Từ Nháp → Xuất bản → Giao → Làm bài → Chấm → Công bố. Không tạo nút trang trí không có nghiệp vụ phía sau.']
    }[type]||['VINH EXAM','Nền tảng thi trực tuyến dành cho giáo viên và học sinh.'];
    const badge=hero?.querySelector('.eyebrow'),h=hero?.querySelector('h1'),p=hero?.querySelector('p');
    if(badge)badge.textContent='VINH EXAM · PRODUCT TOUR';if(h)h.textContent=info[0];if(p)p.textContent=info[1];revealHeroCopy();
  };

  function illustrationSvg(){return `<svg class="flow-illustration-v11" viewBox="0 0 220 140" aria-hidden="true">
    <defs><linearGradient id="gV11" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24d5ff" stop-opacity=".85"/><stop offset=".48" stop-color="#646cff" stop-opacity=".88"/><stop offset="1" stop-color="#ef57d4" stop-opacity=".72"/></linearGradient></defs>
    <circle cx="171" cy="34" r="19" class="g1" opacity=".85"/><circle cx="46" cy="105" r="10" fill="#24d5ff" opacity=".48"/>
    <path class="stroke" d="M27 91c23-32 49-43 75-31 17 8 27 30 48 29 18-1 29-14 44-35" opacity=".58"/>
    <rect x="58" y="27" width="108" height="82" rx="17" class="glass"/>
    <rect x="73" y="43" width="53" height="7" rx="3.5" fill="rgba(255,255,255,.78)"/><rect x="73" y="57" width="75" height="5" rx="2.5" fill="rgba(255,255,255,.22)"/>
    <rect x="73" y="73" width="32" height="22" rx="7" fill="#24d5ff" opacity=".26"/><rect x="111" y="73" width="37" height="22" rx="7" fill="#ef57d4" opacity=".18"/>
    <path class="stroke" d="M81 85l6-6 5 4 7-9M120 86l6-5 5 3 9-8" opacity=".9"/>
  </svg>`}
  function decorateWorkspace(){
    document.querySelectorAll('#app .hero').forEach(x=>{if(!x.querySelector('.flow-illustration-v11'))x.insertAdjacentHTML('beforeend',illustrationSvg())});
    document.querySelectorAll('#app .empty').forEach(x=>{if(!x.dataset.v11){x.dataset.v11='1';x.setAttribute('role','status')}});
  }
  const pageEl=document.getElementById('page');
  if(pageEl)new MutationObserver(()=>requestAnimationFrame(decorateWorkspace)).observe(pageEl,{childList:true,subtree:true});
  setTimeout(decorateWorkspace,80);
})();