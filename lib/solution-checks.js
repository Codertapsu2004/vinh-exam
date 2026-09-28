'use strict';
// A bounded arithmetic parser, never eval/Function. This checks arithmetic only,
// not whether the expression is the correct mathematical model of the question.
function evaluate(expression){
 if(typeof expression!=='string'||expression.length>400)throw Error('Biểu thức quá dài.');
 const tokens=expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|sin|cos|abs|pi|[()+\-*/^]|\S/gi)||[];
 if(tokens.length>200)throw Error('Biểu thức quá dài.');
 let i=0,depth=0;
 const finite=n=>{if(!Number.isFinite(n))throw Error('Kết quả không hữu hạn.');return n;};
 function atom(){
  if(++depth>40)throw Error('Biểu thức quá sâu.');
  const token=tokens[i++];let n;
  if(token==='('){n=sum();if(tokens[i++]!==')')throw Error('Thiếu dấu ngoặc.');}
  else if(token==='pi')n=Math.PI;
  else if(['sqrt','sin','cos','abs'].includes(token)){if(tokens[i++]!=='(')throw Error('Thiếu dấu ngoặc.');n=Math[token](sum());if(tokens[i++]!==')')throw Error('Thiếu dấu ngoặc.');}
  else if(token&&/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token))n=Number(token);
  else throw Error('Biểu thức không được hỗ trợ.');
  depth--;return finite(n);
 }
 function power(){let n=atom();if(tokens[i]==='^'){i++;n=finite(n**unary());}return n;}
 function unary(){if(tokens[i]==='+'||tokens[i]==='-'){const sign=tokens[i++];if(++depth>40)throw Error('Biểu thức quá sâu.');const n=unary();depth--;return sign==='-'?-n:n;}return power();}
 function product(){let n=unary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],r=unary();n=finite(op==='*'?n*r:n/r);}return n;}
 function sum(){let n=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],r=product();n=finite(op==='+'?n+r:n-r);}return n;}
 const result=sum();if(i!==tokens.length)throw Error('Biểu thức không được hỗ trợ.');return result;
}
function checkCalculations(items){
 if(items===undefined)return {items:[],valid:true}; // Older/imported solutions.
 if(!Array.isArray(items)||items.length>20)throw Error('Danh sách phép tính không hợp lệ.');
 const checked=items.map(item=>{
  if(!item||typeof item.expression!=='string'||typeof item.expected!=='number'||!Number.isFinite(item.expected))throw Error('Phép tính không hợp lệ.');
  let actual=null,valid=false;
  try{actual=evaluate(item.expression);valid=Math.abs(actual-item.expected)<=1e-8*Math.max(1,Math.abs(actual),Math.abs(item.expected));}catch{}
  return {expression:item.expression.slice(0,400),expected:item.expected,actual,valid};
 });
 return {items:checked,valid:checked.every(x=>x.valid)};
}
module.exports={evaluate,checkCalculations};
