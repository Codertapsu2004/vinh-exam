/* Science: small interaction feedback, using the existing answer/save lifecycle. */
(() => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const byElement = new WeakMap();
  function stopMotion() { for (const animation of animations) animation.cancel(); animations.clear(); }
  function animate(element, frames, duration) {
    if (!element || motionPreference?.matches || document.hidden || !element.animate) return;
    byElement.get(element)?.cancel();
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)' });
    byElement.set(element, animation); animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  }
  motionPreference?.addEventListener?.('change', event => { if (event.matches) stopMotion(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });

  function wave(element) {
    if (!element || motionPreference?.matches) return;
    let svg = element.querySelector('.science-wave-feedback');
    if (!svg) {
      svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 320 64');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('science-wave-feedback');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M0 32Q20 4 40 32T80 32T120 32T160 32T200 32T240 32T280 32T320 32');
      svg.append(path); element.append(svg);
    }
    animate(svg, [{ opacity: 0, transform: 'translateX(-35%)' }, { opacity: .32, offset: .35 }, { opacity: 0, transform: 'translateX(35%)' }], 450);
  }
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.disabled) return;
    if (input.matches('#questions input[type=radio]') && input.checked) wave(input.closest('.option'));
    if (input.matches('#questions select[data-tf]') && input.value !== '') wave(input.closest('.option'));
  });

  const constructionMark = () => `<svg class="science-construction" viewBox="0 0 140 60" aria-hidden="true"><path d="M10 48H130M24 56V5" class="science-axis"/><path d="M24 48L67 10L119 48Z" pathLength="1" class="science-draw-path"/><path d="M67 10V48" pathLength="1" class="science-draw-path science-fine"/></svg>`;
  const scene = () => `<div class="science-scene" aria-hidden="true"><span class="science-scene-label">TOÁN / VẬT LÍ</span><svg viewBox="0 0 360 150"><path class="science-axis" d="M15 76H345M40 138V10M110 70V82M180 70V82M250 70V82M320 70V82"/><path class="science-sine" d="M40 76C63 10 86 10 110 76S157 142 180 76S227 10 250 76S297 142 320 76"/><path class="science-parabola" d="M58 20Q180 226 302 20"/><circle cx="180" cy="76" r="5"/></svg><span class="science-scene-caption">Một vấn đề. Nhiều cách nhìn.</span></div>`;

  // Format only the published review returned by the existing policy endpoint.
  const valueText = (question, value) => {
    if (value === undefined || value === null || value === '') return 'Chưa trả lời';
    if (question.type === 'single') {
      const index = Number(value);
      return Number.isInteger(index) && question.options?.[index] !== undefined ? `${String.fromCharCode(65 + index)}. ${question.options[index]}` : String(value);
    }
    if (question.type === 'tf' && Array.isArray(value)) return value.map((item, index) => `${String.fromCharCode(97 + index)}) ${item === true ? 'Đúng' : item === false ? 'Sai' : 'Chưa trả lời'}`).join(' · ');
    return String(value);
  };
  function outcome(question, value) {
    if (question.type === 'essay' || question.answer === undefined || question.answer === null) return 'neutral';
    if (value === undefined || value === null || value === '') return 'missed';
    if (question.type === 'single') return Number(value) === Number(question.answer) ? 'correct' : 'revisit';
    if (question.type === 'tf' && Array.isArray(question.answer)) return question.answer.length && question.answer.every((item, i) => value?.[i] === item) ? 'correct' : 'revisit';
    if (question.type === 'number') return Number.isFinite(Number(value)) && Math.abs(Number(value) - Number(question.answer)) <= Math.max(0, Number(question.tolerance) || 0) ? 'correct' : 'revisit';
    return 'neutral';
  }
  function gallery(question) {
    const images = Array.isArray(question.images) ? question.images.filter(image => image?.assetId) : [];
    return images.length ? `<div class="question-images-v4">${images.map((image, index) => `<figure><img loading="lazy" src="/api/question-assets/${encodeURIComponent(image.assetId)}" alt="${esc(image.alt || `Hình ${index + 1}`)}">${image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : '';
  }
  window.renderScienceReview = (review, policy) => {
    if (!policy?.showAnswers || !review?.questions?.length) return empty('Chưa có nội dung được công bố');
    const states = { correct: ['Đúng', 'ok'], revisit: ['Cần xem lại', 'warn'], missed: ['Chưa trả lời', ''], neutral: ['Bài làm', ''] };
    return `<div class="science-review-list">${review.questions.map((question, index) => {
      const answer = review.answers?.[question.id];
      const [label, status] = states[outcome(question, answer)];
      return `<article class="science-review-question"><div class="science-review-heading"><span class="science-question-index">Câu ${index + 1}</span><span class="badge ${status}">${label}</span></div><h3>${esc(question.text)}</h3>${gallery(question)}<div class="science-answer-comparison"><div><span>Bài làm của bạn</span><p>${esc(valueText(question, answer))}</p></div>${question.answer !== undefined && question.type !== 'essay' ? `<div><span>Đáp án</span><p>${esc(valueText(question, question.answer))}</p></div>` : ''}</div>${policy.showExplanations && question.simulation && window.renderQuestionSimulation ? renderQuestionSimulation(question.simulation) : ''}${policy.showExplanations && question.explanation ? `<details class="science-solution"><summary><span>Lời giải</span><span class="science-summary-action">Mở / thu gọn <span aria-hidden="true">＋</span></span></summary><div class="science-solution-body">${constructionMark()}<div class="science-explanation">${esc(question.explanation)}</div></div></details>` : ''}</article>`;
    }).join('')}</div>`;
  };
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!details.matches?.('details.science-solution') || !details.open) return;
    details.querySelectorAll('.science-draw-path').forEach(path => animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 600));
    const body = details.querySelector('.science-solution-body');
    if (body) window.renderMath?.([body]);
  }, true);

  const basePage = page;
  page = function (...args) {
    stopMotion(); basePage(...args);
    const root = $('#page');
    root.querySelectorAll('#questions .option').forEach(option => option.classList.add('science-answer'));
    root.querySelectorAll('#questions input[type=radio]').forEach(input => {
      const label = input.closest('label');
      if (!label) return;
      const letter = document.createElement('span');
      letter.className = 'science-answer-letter'; letter.setAttribute('aria-hidden', 'true');
      letter.textContent = String.fromCharCode(65 + Number(input.value));
      input.after(letter);
    });
    const teacherHero = root.querySelector('.play-hero');
    if (teacherHero) {
      teacherHero.classList.add('science-home-hero');
      teacherHero.querySelector('h2').textContent = 'Việc cần xử lý hôm nay';
      const art = teacherHero.querySelector('.paper-art');
      if (art) art.outerHTML = scene();
    }
    if (ME?.role === 'student' && root.querySelector('.hero') && root.querySelector('.stats') && !root.querySelector('#questions')) {
      const hero = root.querySelector('.hero'); hero.classList.add('science-home-hero');
      const heading = hero.querySelector('h2'); if (heading) heading.textContent = 'Hôm nay, mình học gì?';
      const eyebrow = hero.querySelector('.eyebrow'); if (eyebrow) eyebrow.textContent = 'GÓC HỌC TẬP CỦA ' + ME.name;
      const copy = document.createElement('div'); while (hero.firstChild) copy.append(hero.firstChild);
      hero.append(copy); hero.insertAdjacentHTML('beforeend', scene());
    }
  };

  const baseClose = closeModal;
  closeModal = function () { stopMotion(); return baseClose(); };
})();
