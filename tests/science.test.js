const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const build = require('../scripts/build-client');
const root = path.join(__dirname, '..', 'public');
const response = data => ({ ok: true, status: 200, json: async () => data });
const tick = () => new Promise(resolve => setImmediate(resolve));

function client(fetch, reduced = false) {
  const files = build();
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://vinh.test', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const motions = [];
  dom.window.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  dom.window.Element.prototype.animate = function (frames, options) {
    const item = { target: this, frames, options, finished: Promise.resolve(), cancel() {} };
    motions.push(item); return item;
  };
  dom.window.fetch = async (url, options) => url === '/api/auth/me'
    ? { ok: false, status: 401, json: async () => ({}) } : fetch(url, options);
  dom.window.EventSource = class { close() {} };
  dom.window.eval(fs.readFileSync(path.join(root, 'dist', files.js), 'utf8'));
  return { dom, window: dom.window, document: dom.window.document, motions };
}

test('wave feedback preserves native radio/true-false answers and server save payload', async () => {
  let saved;
  const c = client(async (url, options) => {
    if (url.endsWith('/proctor')) return response({ config: { mode: 'off' } });
    if (url.endsWith('/save')) { saved = JSON.parse(options.body); return response({ rowVersion: 1, savedAt: new Date().toISOString() }); }
    if (url === '/api/student/attempt/a') return response({ attempt: {
      id: 'a', status: 'in_progress', answers: {}, rowVersion: 0,
      deadlineAt: new Date(Date.now() + 600000).toISOString(), serverNow: new Date().toISOString(),
      title: 'Động học', examTitle: 'Vật lí', questions: [
        { id: 's', type: 'single', text: '72 km/h = ?', options: ['10 m/s', '20 m/s'], points: 1 },
        { id: 'tf', type: 'tf', text: 'Đúng hay sai?', statements: ['1 h = 3600 s'], points: 1 }
      ]
    } });
    throw Error('Unexpected request ' + url);
  });
  try {
    await tick(); c.window.eval("ME={id:'s',role:'student',name:'Thử'}"); await c.window.openAttempt('a');
    const input = c.document.querySelector('input[value="1"]'); input.checked = true;
    input.dispatchEvent(new c.window.Event('change', { bubbles: true }));
    const tf = c.document.querySelector('[data-tf]'); tf.value = 'false';
    tf.dispatchEvent(new c.window.Event('change', { bubbles: true }));
    await c.window.saveAttempt();
    assert.deepEqual(saved.answers, { s: 1, tf: [false] });
    assert.equal(c.motions.length, 2); assert(c.motions.every(a => a.options.duration === 450));
    assert.equal(c.document.querySelectorAll('.science-wave-feedback').length, 2);
    assert.match(c.document.querySelector('#saveState').textContent, /Đã lưu/);
  } finally { c.dom.window.close(); }
});

test('published review keeps answer labels, images, escaped text and teacher publication policy', async () => {
  let showAnswers = true, showExplanations = true;
  const c = client(async url => {
    if (url === '/api/student/result/a/published') return response({
      result: { title: 'Bài thi', exam_title: 'Toán', status: 'graded', score: 0, max_score: 1 },
      policy: { showScore: true, showAnswers, showExplanations },
      review: { answers: { q: 0 }, questions: [{ id: 'q', type: 'single', text: 'Chọn đáp án', options: ['Sai', 'Đúng'], answer: 1, explanation: '<img src=x onerror=alert(1)>\nLời chữa của giáo viên', images: [{ assetId: 'asset-1', alt: 'Hình đề' }] }] }
    });
    throw Error('Unexpected ' + url);
  });
  try {
    await tick(); c.window.eval("ME={id:'s',role:'student',name:'Thử'}"); await c.window.showResult('a');
    assert.match(c.document.querySelector('.science-answer-comparison').textContent, /A\. Sai/);
    assert.match(c.document.querySelector('.science-answer-comparison').textContent, /B\. Đúng/);
    assert.match(c.document.querySelector('.science-review-question .badge').textContent, /Cần xem lại/);
    assert.equal(c.document.querySelector('.question-images-v4 img').getAttribute('src'), '/api/question-assets/asset-1');
    assert.equal(c.document.querySelector('.science-explanation img'), null);
    const detail = c.document.querySelector('.science-solution'); assert.equal(detail.open, false);
    detail.open = true; detail.dispatchEvent(new c.window.Event('toggle')); await tick();
    assert(c.motions.some(a => a.options.duration === 600));
    showExplanations = false; await c.window.showResult('a');
    assert.equal(c.document.querySelector('.science-solution'), null);
    assert.doesNotMatch(c.document.querySelector('#page').textContent, /Lời chữa của giáo viên/);
    showAnswers = false; await c.window.showResult('a');
    assert.equal(c.document.querySelector('.science-review-question'), null);
    assert.match(c.document.querySelector('#page').textContent, /Đáp án chưa được công bố/);
  } finally { c.dom.window.close(); }
});

test('reduced motion keeps public exercise and solution usable without writes or animations', async () => {
  const c = client(async url => { throw Error('Exercise must not call ' + url); }, true);
  try {
    await tick(); c.document.getElementById('scienceTry').focus(); c.document.getElementById('scienceTry').click();
    const input = c.document.querySelector('[name=scienceDemoAnswer][value="5"]'); input.checked = true;
    input.dispatchEvent(new c.window.Event('change', { bubbles: true }));
    assert.match(c.document.getElementById('scienceDemoStatus').textContent, /Chính xác/);
    const details = c.document.querySelector('.science-demo-solution'); details.open = true;
    details.dispatchEvent(new c.window.Event('toggle')); await tick();
    assert.match(details.textContent, /BC = 5 cm/); assert.equal(c.motions.length, 0);
    c.window.closeModal(); assert.equal(c.document.querySelector('.modal'), null);
    assert.equal(c.document.activeElement.id, 'scienceTry');
  } finally { c.dom.window.close(); }
});
