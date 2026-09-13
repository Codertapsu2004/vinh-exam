function toggleMobileNav(force){const side=document.querySelector('.sidebar'),scrim=document.getElementById('mobileScrim');if(!side||!scrim)return;const open=typeof force==='boolean'?force:!side.classList.contains('open');side.classList.toggle('open',open);scrim.classList.toggle('open',open)}
document.addEventListener('click',e=>{if(window.innerWidth<=820&&e.target.closest('.nav-btn'))toggleMobileNav(false)});
(function(){
  ['/features9.css','/commercial-v10.css'].forEach(href=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;document.head.appendChild(css)});
  document.addEventListener('DOMContentLoaded',()=>{
    const a=document.createElement('script');a.src='/features9.js';
    a.onload=()=>{const b=document.createElement('script');b.src='/features9-scoring.js';b.onload=()=>{const c=document.createElement('script');c.src='/commercial-v10.js';document.body.appendChild(c)};document.body.appendChild(b)};
    document.body.appendChild(a)
  })
})();
