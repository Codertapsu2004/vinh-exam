/* One writer per attempt. Edits made during a request are sent next, never lost. */
(function (root) {
  function createAnswerSaver({ answers, send, onState = () => {}, rowVersion = 0 }) {
    let revision = 0, saved = 0, running = null, conflict = false;
    async function drain() {
      if (conflict) throw Error('Bài đang được sửa ở một cửa sổ khác. Hãy mở lại bài để đồng bộ.');
      while (saved < revision) {
        const snapshotRevision = revision;
        const snapshot = JSON.parse(JSON.stringify(answers()));
        onState('saving');
        try {
          const result = await send(snapshot, rowVersion);
          rowVersion = result.rowVersion;
          saved = snapshotRevision;
          onState(saved === revision ? 'saved' : 'saving', result);
        } catch (error) {
          conflict = error.code === 'ANSWER_CONFLICT';
          onState('error', error);
          throw error;
        }
      }
    }
    return {
      touch() { revision++; onState('dirty'); },
      get dirty() { return saved < revision; },
      get rowVersion() { return rowVersion; },
      async flush() {
        if (running) await running;
        if (saved === revision) return;
        running = drain();
        try { await running; } finally { running = null; }
      }
    };
  }
  root.createAnswerSaver = createAnswerSaver;
  if (typeof module === 'object' && module.exports) module.exports = { createAnswerSaver };
})(typeof window === 'object' ? window : globalThis);
