(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SolutionModels=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const str=(x,n=500)=>{if(typeof x!=='string'||x.length>n)throw Error('Nhãn hình không hợp lệ');return x;};
  const num=(x,min=-1e6,max=1e6)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('Số liệu hình không hợp lệ');return x;};
  const arr=(x,max)=>{if(!Array.isArray(x)||x.length>max)throw Error('Cấu trúc hình không hợp lệ');return x;};
  function normalize(raw){
    if(raw===null||raw===undefined)return null;
    const v={kind:raw.kind,caption:str(raw.caption),xLabel:str(raw.xLabel,60),yLabel:str(raw.yLabel,60)};
    for(const k of ['xMin','xMax','yMin','yMax'])v[k]=num(raw[k]);
    if(v.xMax-v.xMin<1e-6||v.yMax-v.yMin<1e-6)throw Error('Miền vẽ không hợp lệ');
    if(v.kind==='diagram'){
      v.points=arr(raw.points,40).map(p=>({id:str(p.id,30),x:num(p.x),y:num(p.y),label:str(p.label,80)}));
      const ids=new Set(v.points.map(p=>p.id));if(ids.size!==v.points.length)throw Error('Điểm hình bị trùng');
      v.segments=arr(raw.segments,60).map(s=>{if(!ids.has(s.from)||!ids.has(s.to))throw Error('Đoạn nối thiếu điểm');return {from:s.from,to:s.to,dashed:s.dashed===true,label:str(s.label,80)};});
      v.circles=arr(raw.circles,12).map(c=>({x:num(c.x),y:num(c.y),r:num(c.r,1e-6),label:str(c.label,80)}));
      if(!v.points.length&&!v.circles.length)throw Error('Hình trống');
    }else if(v.kind==='plot'){
      v.curves=arr(raw.curves,5).map(c=>({label:str(c.label,80),a:num(c.a),b:num(c.b),c:num(c.c)}));if(!v.curves.length)throw Error('Đồ thị trống');
    }else if(v.kind==='motion'){
      v.timeEnd=num(raw.timeEnd,0.001,1e5);v.bodies=arr(raw.bodies,4).map(b=>({label:str(b.label,60),x0:num(b.x0),v0:num(b.v0),acceleration:num(b.acceleration)}));if(!v.bodies.length)throw Error('Chưa có vật chuyển động');
    }else if(v.kind==='harmonic'||v.kind==='wave'){
      v.amplitude=num(raw.amplitude,1e-6);v.period=num(raw.period,1e-6);v.phase=num(raw.phase,-1000,1000);v.timeEnd=num(raw.timeEnd,0.001,1e5);if(v.kind==='wave'){v.wavelength=num(raw.wavelength,1e-6);if(![1,-1].includes(raw.direction))throw Error('Chiều truyền sóng không hợp lệ');v.direction=raw.direction;}
    }else throw Error('Dạng hình chưa hỗ trợ');
    if(['motion','harmonic'].includes(v.kind)&&(v.xMin>0||v.xMax<v.timeEnd))throw Error('Miền thời gian chưa bao quát mô phỏng');
    if(v.kind==='harmonic'&&(v.xMax-v.xMin)/v.period>20)throw Error('Quá nhiều chu kỳ trong một hình');
    if(v.kind==='wave'&&(v.xMax-v.xMin)/v.wavelength>20)throw Error('Quá nhiều bước sóng trong một hình');
    if(['harmonic','wave'].includes(v.kind)&&(v.yMin>-v.amplitude||v.yMax<v.amplitude))throw Error('Miền li độ chưa đủ biên độ');
    return v;
  }
  const colors=['#18715d','#6653b8','#cf7135','#2876a8','#ab4973'];
  function drawing(raw,t=0){
    const v=normalize(raw),W=540,H=300,left=48,right=510,top=28,bottom=260;
    let sx=(right-left)/(v.xMax-v.xMin),sy=(bottom-top)/(v.yMax-v.yMin);
    // Equal scales preserve angles/circles in geometry.
    if(v.kind==='diagram')sx=sy=Math.min(sx,sy);
    const dx=(right-left-sx*(v.xMax-v.xMin))/2,dy=(bottom-top-sy*(v.yMax-v.yMin))/2;
    const X=x=>left+dx+(x-v.xMin)*sx,Y=y=>bottom-dy-(y-v.yMin)*sy,coord=(x,y)=>`${X(x).toFixed(3)},${Y(y).toFixed(3)}`;
    let out='';
    if(v.kind==='diagram'){
      for(const c of v.circles)out+=`<circle cx="${X(c.x)}" cy="${Y(c.y)}" r="${c.r*sx}" fill="none" stroke="${colors[0]}" stroke-width="2"/><text x="${X(c.x)}" y="${Y(c.y+c.r)-7}">${esc(c.label)}</text>`;
      for(const s of v.segments){const a=v.points.find(p=>p.id===s.from),b=v.points.find(p=>p.id===s.to);out+=`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="${colors[0]}" stroke-width="2" ${s.dashed?'stroke-dasharray="5 5"':''}/><text x="${X((a.x+b.x)/2)+6}" y="${Y((a.y+b.y)/2)-7}">${esc(s.label)}</text>`;}
      for(const p of v.points)out+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="${colors[0]}"/><text x="${X(p.x)+7}" y="${Y(p.y)-8}">${esc(p.label)}</text>`;
    }else{
      for(let i=0;i<=4;i++){const x=v.xMin+(v.xMax-v.xMin)*i/4,y=v.yMin+(v.yMax-v.yMin)*i/4;out+=`<path d="M${X(x)} ${top}V${bottom} M${left} ${Y(y)}H${right}" stroke="#dae7e0" fill="none"/><text x="${X(x)}" y="280" text-anchor="middle">${+x.toPrecision(4)}</text><text x="40" y="${Y(y)+4}" text-anchor="end">${+y.toPrecision(4)}</text>`;}
      out+=`<text x="510" y="298" text-anchor="end">${esc(v.xLabel)}</text><text x="48" y="17">${esc(v.yLabel)}</text>`;
      const curves=v.kind==='plot'?v.curves:v.kind==='motion'?v.bodies.map(b=>({label:b.label,a:b.acceleration/2,b:b.v0,c:b.x0})):[];
      const fns=v.kind==='wave'?[x=>v.amplitude*Math.cos(2*Math.PI*t/v.period-v.direction*2*Math.PI*x/v.wavelength+v.phase)]:v.kind==='harmonic'?[x=>v.amplitude*Math.cos(2*Math.PI*x/v.period+v.phase)]:curves.map(c=>x=>c.a*x*x+c.b*x+c.c);
      fns.forEach((f,k)=>{const pts=Array.from({length:241},(_,i)=>{const x=v.xMin+(v.xMax-v.xMin)*i/240;return coord(x,f(x));}).join(' ');out+=`<svg x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" viewBox="${left} ${top} ${right-left} ${bottom-top}" overflow="hidden"><polyline points="${pts}" stroke="${colors[k]}" stroke-width="2.5" fill="none"/>${!['plot','wave'].includes(v.kind)?`<circle cx="${X(t)}" cy="${Y(f(t))}" r="5" fill="${colors[k]}"/>`:''}</svg>`;});
    }
    return out;
  }
  function values(v,t){if(v.kind==='wave')return `t = ${t.toFixed(2)} s · T = ${v.period} s · λ = ${v.wavelength} (${v.xLabel})`;if(v.kind==='harmonic')return `t = ${t.toFixed(2)} · x = ${(v.amplitude*Math.cos(2*Math.PI*t/v.period+v.phase)).toFixed(3)} (${v.yLabel})`;if(v.kind==='motion')return v.bodies.map(b=>`${b.label}: x = ${(b.x0+b.v0*t+b.acceleration*t*t/2).toFixed(3)}`).join(' · ');return '';}
  function render(raw){let v;try{v=normalize(raw);}catch{return ''}if(!v)return '';const motion=['harmonic','motion','wave'].includes(v.kind);return `<figure class="ai-visual" data-ai-visual="${esc(JSON.stringify(v))}"><figcaption>${esc(v.caption)}</figcaption><svg class="ai-visual-svg" viewBox="0 0 540 300" role="img" aria-label="${esc(v.caption)}">${drawing(v)}</svg>${v.kind==='plot'?`<div class="ai-legend">${v.curves.map((c,i)=>`<span style="color:${colors[i]}">${esc(c.label)}</span>`).join('')}</div>`:''}${motion?`<div class="ai-motion-controls"><button type="button" class="btn soft" data-ai-play>Chạy mô phỏng</button><label>Thời gian <input type="range" data-ai-time aria-label="Thời gian mô phỏng" min="0" max="${v.timeEnd}" step="${v.timeEnd/500}" value="0"></label><button type="button" class="btn ghost" data-ai-reset>Đặt lại</button></div><output class="ai-motion-values">${esc(values(v,0))}</output>`:''}</figure>`;}
  return {normalize,drawing,render,values};
});
