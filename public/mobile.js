function toggleMobileNav(force) {
  const side = document.querySelector('.sidebar'), scrim = document.getElementById('mobileScrim');
  const open = typeof force === 'boolean' ? force : !side.classList.contains('open');
  side.classList.toggle('open', open); scrim.classList.toggle('open', open);
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(open)); document.body.classList.toggle('nav-open', open);
}
document.addEventListener('click', e => { if (innerWidth <= 820 && e.target.closest('.nav-btn')) toggleMobileNav(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMobileNav(false); });
