const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAnswerSaver } = require('../public/autosave');

test('serializes writes and persists edits made while an earlier request is in flight', async () => {
  let answers={q:0}, release, active=0, maximum=0;
  const writes=[], states=[];
  const saver=createAnswerSaver({answers:()=>answers,onState:s=>states.push(s),send:async(snapshot,version)=>{
    maximum=Math.max(maximum,++active);writes.push({snapshot,version});
    if(writes.length===1)await new Promise(resolve=>release=resolve);
    active--;return {rowVersion:version+1,savedAt:new Date().toISOString()};
  }});
  saver.touch();const first=saver.flush();
  answers.q=2;saver.touch();const second=saver.flush();
  assert.equal(saver.dirty,true);release();await Promise.all([first,second]);
  assert.deepEqual(writes,[{snapshot:{q:0},version:0},{snapshot:{q:2},version:1}]);
  assert.equal(maximum,1);assert.equal(saver.dirty,false);assert.equal(saver.rowVersion,2);assert.equal(states.at(-1),'saved');
});
test('a failed write remains dirty, throws to the submit flow, and can retry', async()=>{
  let fail=true;const saver=createAnswerSaver({answers:()=>({q:'answer'}),send:async()=>{if(fail)throw Error('offline');return {rowVersion:1};}});
  saver.touch();await assert.rejects(saver.flush(),/offline/);assert.equal(saver.dirty,true);
  fail=false;await saver.flush();assert.equal(saver.dirty,false);
});
test('another-tab conflict never retries by silently overwriting the server',async()=>{
  let calls=0;const saver=createAnswerSaver({answers:()=>({q:2}),send:async()=>{calls++;throw Object.assign(Error('conflict'),{code:'ANSWER_CONFLICT'});}});
  saver.touch();await assert.rejects(saver.flush(),/conflict/);await assert.rejects(saver.flush(),/cửa sổ khác/);assert.equal(calls,1);assert.equal(saver.dirty,true);
});
