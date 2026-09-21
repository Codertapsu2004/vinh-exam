(() => {
  window.switchAuthV8 = tab => {
    const register = tab === 'register';
    $('#loginForm').classList.toggle('hidden', register); $('#registerForm').classList.toggle('hidden', !register);
    $('#authLoginTab').setAttribute('aria-selected', String(!register)); $('#authRegisterTab').setAttribute('aria-selected', String(register));
    $(register ? '#registerName' : '#loginName').focus();
  };
  window.setRegisterRoleV8 = () => {
    const teacher = $('input[name="registerRole"]:checked').value === 'teacher';
    $('#registerGradeField').classList.toggle('hidden', teacher); $('#registerSubjectField').classList.toggle('hidden', !teacher);
  };
  window.togglePassword = (id, button) => {
    const input = document.getElementById(id), show = input.type === 'password';
    input.type = show ? 'text' : 'password'; button.textContent = show ? 'Ẩn' : 'Hiện'; button.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  };
  login = async function () {
    const btn = $('#loginBtn'); if (btn.disabled || !$('#loginForm').reportValidity()) return;
    const error = $('#authError'); btn.disabled = true; btn.textContent = 'Đang đăng nhập…'; error.classList.add('hidden');
    try { ME = (await api('/auth/login', {method:'POST',body:JSON.stringify({login:$('#loginName').value.trim(),password:$('#password').value})})).user; $('#password').value = ''; showApp(); }
    catch (e) { error.textContent = e.message; error.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Vào lớp học ↗'; }
  };
  $('#loginForm').addEventListener('submit', event => { event.preventDefault(); login(); });
  $('#registerForm').addEventListener('submit', async event => {
    event.preventDefault(); const btn = $('#registerBtn'), error = $('#registerError'); if (btn.disabled) return; error.classList.add('hidden');
    if ($('#registerPassword').value !== $('#registerConfirm').value) { error.textContent = 'Hai mật khẩu chưa khớp.'; error.classList.remove('hidden'); $('#registerConfirm').focus(); return; }
    btn.disabled = true; btn.textContent = 'Đang tạo tài khoản…';
    try { ME = (await api('/auth/register', {method:'POST',body:JSON.stringify({role:$('input[name="registerRole"]:checked').value,name:$('#registerName').value,login:$('#registerLogin').value,password:$('#registerPassword').value,grade:$('#registerGrade').value,subjects:[$('#registerSubject').value]})})).user; $('#registerForm').reset(); showApp(); }
    catch (e) { error.textContent = e.message; error.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Tạo tài khoản ↗'; }
  });
})();
