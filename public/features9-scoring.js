(()=>{
const baseOpenImportV9=window.openImportV3;
function decorateScoringV9(){
  const btn=$('.analysis-score-v6 .btn');
  if(btn){btn.textContent='Nhập điểm từng phần ↓';btn.removeAttribute('onclick');btn.onclick=()=>{$('#sectionEditorV6')?.scrollIntoView({behavior:'smooth',block:'start'});toast('Nhập tổng điểm cho từng phần. VINH EXAM sẽ tự chia đều cho các câu trong phần.')}}
  $$('.section-score-box-v6 label').forEach(x=>x.textContent='Tổng điểm phần');
  const editor=$('#sectionEditorV6');
  if(editor&&!$('#scoreRuleV9'))editor.insertAdjacentHTML('beforebegin',`<div id="scoreRuleV9" class="score-rule-v9"><b>Chia điểm theo từng phần</b><span>Bạn tự nhập tổng điểm cho từng phần. Hệ thống tự chia đều số điểm đó cho các câu trong phần.</span><span><strong>Đúng/Sai 4 ý:</strong> đúng 1 ý = 10% · 2 ý = 25% · 3 ý = 50% · 4 ý = 100% điểm của câu.</span></div>`);
}
if(baseOpenImportV9)window.openImportV3=async id=>{const r=await baseOpenImportV9(id);setTimeout(decorateScoringV9,0);return r};
window.autoTenPointsV6=()=>{$('#sectionEditorV6')?.scrollIntoView({behavior:'smooth',block:'start'});toast('Hãy nhập tổng điểm cho từng phần theo cấu trúc đề của bạn.')};
const hint=$('#regLoginV8')?.closest('.field')?.querySelector('.field-hint-v8');if(hint)hint.textContent='2–40 ký tự; có thể dùng tiếng Việt, chữ, số, dấu cách và các ký hiệu thông dụng.';
if($('#regLoginV8'))$('#regLoginV8').placeholder='VD: vinh2004 hoặc vũ đức vinh';
})();