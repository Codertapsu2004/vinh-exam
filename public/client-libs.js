/* Heavy document libraries are loaded only when needed. */
(() => {
  const pending = new Map();
  function load(src, ready) {
    if (ready()) return Promise.resolve();
    if (!pending.has(src)) pending.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); pending.delete(src); reject(Error('Không tải được công cụ hiển thị. Hãy kiểm tra kết nối.')); };
      document.head.append(script);
    }));
    return pending.get(src);
  }
  window.ensureSanitizer = () => load('https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js', () => !!window.DOMPurify);
  let mathQueue = Promise.resolve();
  window.renderMath = nodes => {
    const roots = nodes.filter(node => node?.isConnected);
    if (!roots.some(node => /\$|\\\(|\\\[/.test(node.textContent))) return Promise.resolve();
    mathQueue = mathQueue.catch(() => {}).then(async () => {
      if (!window.MathJax) window.MathJax = {tex:{inlineMath:[['$','$'],['\\(','\\)']],displayMath:[['$$','$$'],['\\[','\\]']]},svg:{fontCache:'global'},startup:{typeset:false}};
      await load('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', () => !!window.MathJax?.typesetPromise);
      await window.MathJax.startup.promise;
      const connected = roots.filter(node => node.isConnected);
      if (connected.length) await window.MathJax.typesetPromise(connected);
    });
    return mathQueue.catch(() => {});
  };
})();
