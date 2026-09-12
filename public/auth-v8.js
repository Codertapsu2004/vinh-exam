(()=>{
  const loginShell=document.getElementById('login');
  const card=loginShell?.querySelector('.login-card');
  if(!loginShell||!card||card.dataset.authV8==='1')return;
  card.dataset.authV8='1';
  let registerRoleV8='student';
  const subjectsV8=['Toán','Vật lí','Hóa học','Sinh học','Ngữ văn','Tiếng Anh','Tin học','Khác'];

  card.innerHTML=`
    <div class="brand"><div class="logo">V</div><div><div>VINH EXAM</div><div class="hint">Assessment Workspace</div></div></div>
    <div class="auth-tabs-v8"><button id="authLoginTabV8" class="auth-tab-v8 active" onclick="switchAuthV8('login')">Đăng nhập</button><button id="authRegisterTabV8" class="auth-tab-v8" onclick="switchAuthV8('register')">Đăng ký</button></div>
    <section id="authLoginPanelV8" class="auth-panel-v8 active">
      <h2 class="auth-title-v8">Chào mừng trở lại</h2><p class="auth-sub-v8">Đăng nhập để tiếp tục học tập, ra đề và quản lý các ca thi.</p>
      <div class="field"><label>Tên đăng nhập</label><input id="loginName" autocomplete="username" placeholder="Nhập tên đăng nhập"></div>
      <div class="field"><label>Mật khẩu</label><input id="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu"></div>
      <button id="loginBtn" class="btn primary block" onclick="login()">Đăng nhập</button>
      <div class="login-extra-v8">Chưa có tài khoản? <button class="auth-tab-v8" style="padding:0;background:none;color:#4f6df5" onclick="switchAuthV8('register')">Tạo tài khoản mới</button></div>
    </section>
    <section id="authRegisterPanelV8" class="auth-panel-v8">
      <h2 class="auth-title-v8">Tạo tài khoản VINH EXAM</h2><p class="auth-sub-v8">Chọn đúng vai trò để hệ thống chuẩn bị không gian học tập hoặc làm việc phù hợp.</p>
      <div class="role-picker-v8">
        <button id="roleStudentV8" type="button" class="role-card-v8 active" onclick="setRegisterRoleV8('student')"><span class="role-icon-v8">◉</span><div><b>Tôi là Học sinh</b><span>Nhận bài, vào thi, xem kết quả và phúc khảo.</span></div></button>
        <button id="roleTeacherV8" type="button" class="role-card-v8 teacher" onclick="setRegisterRoleV8('teacher')"><span class="role-icon-v8">✦</span><div><b>Tôi là Giáo viên</b><span>Tạo lớp, ra đề, tổ chức và giám sát ca thi.</span></div></button>
      </div>
      <div id="registerMessageV8" class="auth-message-v8"></div>
      <div class="register-grid-v8">
        <div class="register-divider-v8">Tài khoản</div>
        <div class="field"><label>Họ và tên <span class="required-v8">*</span></label><input id="regNameV8" autocomplete="name" placeholder="Nguyễn Văn An"></div>
        <div class="field"><label>Tên đăng nhập <span class="required-v8">*</span></label><input id="regLoginV8" autocomplete="username" placeholder="nguyenvanan"><div class="field-hint-v8">4–32 ký tự, không dấu; dùng chữ thường, số, . _ -</div></div>
        <div class="field"><label>Email</label><input id="regEmailV8" type="email" autocomplete="email" placeholder="email@example.com"></div>
        <div class="field"><label>Số điện thoại</label><input id="regPhoneV8" inputmode="tel" autocomplete="tel" placeholder="09xxxxxxxx"></div>
        <div class="field"><label>Mật khẩu <span class="required-v8">*</span></label><input id="regPasswordV8" type="password" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" oninput="passwordStrengthV8()"><div id="passwordMeterV8" class="password-meter-v8"><i></i></div><div class="field-hint-v8">Có ít nhất 1 chữ và 1 số.</div></div>
        <div class="field"><label>Nhập lại mật khẩu <span class="required-v8">*</span></label><input id="regPassword2V8" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu"></div>
        <div class="register-divider-v8">Hồ sơ</div>
        <div class="field"><label>Tỉnh / thành phố</label><input id="regProvinceV8" placeholder="Hà Nội"></div>
        <div class="field"><label>Giới tính</label><select id="regGenderV8"><option value="">Không chọn</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></div>
        <div class="field"><label>Ngày sinh</label><input id="regBirthV8" type="date"></div>
        <div class="register-role-fields-v8" id="registerRoleFieldsV8"></div>
        <label class="confirm-v8 wide"><input id="regConfirmV8" type="checkbox"><span>Tôi xác nhận thông tin trên là đúng và đồng ý sử dụng tài khoản theo quy định của lớp học / đơn vị sử dụng VINH EXAM.</span></label>
      </div>
      <div class="register-footer-v8"><button type="button" class="btn ghost" onclick="switchAuthV8('login')">← Đã có tài khoản</button><button id="registerBtnV8" type="button" class="btn primary" onclick="submitRegistrationV8()">Tạo tài khoản</button></div>
    </section>`;

  function heroCopyV8(mode){
    const h=loginShell.querySelector('.login-hero h1'),p=loginShell.querySelector('.login-hero p');
    if(!h||!p)return;
    if(mode==='register'){h.textContent='Một tài khoản cho toàn bộ hành trình học và thi.';p.textContent='Học sinh có không gian làm bài riêng. Giáo viên có đầy đủ công cụ tạo lớp, ra đề, giao bài, giám sát và chấm thi.'}
    else{h.textContent='Tạo đề, giao bài, theo dõi và chấm trên một hệ thống.';p.textContent='VINH EXAM tập trung vào quy trình thật của giáo viên và học sinh: lớp học, ngân hàng câu hỏi, phòng thi autosave và giám sát tập trung.'}
  }

  window.switchAuthV8=mode=>{
    const register=mode==='register';
    loginShell.classList.toggle('registering-v8',register);
    document.getElementById('authLoginTabV8')?.classList.toggle('active',!register);
    document.getElementById('authRegisterTabV8')?.classList.toggle('active',register);
    document.getElementById('authLoginPanelV8')?.classList.toggle('active',!register);
    document.getElementById('authRegisterPanelV8')?.classList.toggle('active',register);
    heroCopyV8(mode);
    setTimeout(()=>document.getElementById(register?'regNameV8':'loginName')?.focus(),30);
  };

  window.setRegisterRoleV8=role=>{
    registerRoleV8=role==='teacher'?'teacher':'student';
    document.getElementById('roleStudentV8')?.classList.toggle('active',registerRoleV8==='student');
    document.getElementById('roleTeacherV8')?.classList.toggle('active',registerRoleV8==='teacher');
    const root=document.getElementById('registerRoleFieldsV8');if(!root)return;
    root.innerHTML=registerRoleV8==='student'?`
      <div class="field"><label>Trường đang học</label><input id="regSchoolV8" placeholder="THPT / THCS..."></div>
      <div class="field"><label>Khối <span class="required-v8">*</span></label><select id="regGradeV8"><option value="">Chọn khối</option>${[6,7,8,9,10,11,12].map(x=>`<option value="${x}">Khối ${x}</option>`).join('')}</select></div>
      <div class="field wide"><label>Lớp</label><input id="regClassV8" placeholder="VD: 11A1"></div>`:`
      <div class="field"><label>Đơn vị công tác</label><input id="regWorkplaceV8" placeholder="Trường / trung tâm / tự do"></div>
      <div class="field"><label>Số năm kinh nghiệm</label><input id="regExperienceV8" type="number" min="0" max="60" value="0"></div>
      <div class="field wide"><label>Môn giảng dạy <span class="required-v8">*</span></label><div class="subject-grid-v8">${subjectsV8.map(s=>`<label class="subject-chip-v8"><input type="checkbox" name="regSubjectV8" value="${s}"><span>${s}</span></label>`).join('')}</div></div>
      <div class="field wide"><label>Bằng cấp / chuyên môn</label><input id="regDegreeV8" placeholder="VD: Cử nhân Vật lí, Kỹ sư Viễn thông..."></div>`;
  };

  window.passwordStrengthV8=()=>{
    const p=document.getElementById('regPasswordV8')?.value||'',m=document.getElementById('passwordMeterV8');if(!m)return;
    m.className='password-meter-v8';
    const score=[p.length>=8,/[A-Za-z]/.test(p),/\d/.test(p),/[^A-Za-z0-9]/.test(p),p.length>=12].filter(Boolean).length;
    if(score>=4)m.classList.add('good');else if(score>=2)m.classList.add('mid');
    m.querySelector('i').style.width=score>=4?'100%':score>=2?'60%':p?'25%':'0';
  };

  function registerMessageV8(message,type='bad'){
    const el=document.getElementById('registerMessageV8');if(!el)return;
    el.textContent=message;el.className=`auth-message-v8 show ${type}`;
  }

  window.submitRegistrationV8=async()=>{
    const password=document.getElementById('regPasswordV8')?.value||'',confirm=document.getElementById('regPassword2V8')?.value||'';
    if(password!==confirm)return registerMessageV8('Hai mật khẩu chưa khớp.');
    if(!document.getElementById('regConfirmV8')?.checked)return registerMessageV8('Hãy xác nhận thông tin đăng ký trước khi tiếp tục.');
    const body={
      role:registerRoleV8,name:document.getElementById('regNameV8')?.value,login:document.getElementById('regLoginV8')?.value,
      email:document.getElementById('regEmailV8')?.value,phone:document.getElementById('regPhoneV8')?.value,password,
      province:document.getElementById('regProvinceV8')?.value,gender:document.getElementById('regGenderV8')?.value,birthDate:document.getElementById('regBirthV8')?.value
    };
    if(registerRoleV8==='student')Object.assign(body,{school:document.getElementById('regSchoolV8')?.value,grade:document.getElementById('regGradeV8')?.value,className:document.getElementById('regClassV8')?.value});
    else Object.assign(body,{workplace:document.getElementById('regWorkplaceV8')?.value,experienceYears:Number(document.getElementById('regExperienceV8')?.value||0),degree:document.getElementById('regDegreeV8')?.value,subjects:[...document.querySelectorAll('input[name="regSubjectV8"]:checked')].map(x=>x.value)});
    const btn=document.getElementById('registerBtnV8');if(btn){btn.disabled=true;btn.textContent='Đang tạo tài khoản…'}
    try{
      const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(body)});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Không thể tạo tài khoản');
      registerMessageV8('Tạo tài khoản thành công. Đang mở không gian của bạn…','ok');
      ME=d.user;setTimeout(()=>{showApp();toast(`Chào ${d.user.name}! Tài khoản đã sẵn sàng.`)},250);
    }catch(e){registerMessageV8(e.message||'Không thể tạo tài khoản')}
    finally{if(btn){btn.disabled=false;btn.textContent='Tạo tài khoản'}}
  };

  setRegisterRoleV8('student');
  document.getElementById('password')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
  document.getElementById('loginName')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
})();
