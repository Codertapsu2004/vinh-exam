'use strict';
// Never expose provider messages: they may contain keys, headers or question text.
function providerError(status,body={},retryAfter,provider='openai'){
 const raw=body.error||{}, code=String(raw.code||''), type=String(raw.type||'');
 if(provider==='groq')return groqError(status,raw,retryAfter);
 let kind='AI_PROVIDER_ERROR',message='Dịch vụ AI chưa xử lý được yêu cầu. Quản trị viên cần kiểm tra kết nối.',pause=true,automatic=false;
 if(code==='credit_balance_exhausted'){kind='AI_CREDITS';message='Tài khoản OpenAI API đã hết số dư. Cần bổ sung số dư trong Billing rồi bấm Kiểm tra & thử lại.';}
 else if(['organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded'].includes(code)){kind='AI_SPEND_LIMIT';message='Tài khoản hoặc dự án OpenAI API đã chạm hạn mức sử dụng. Cần kiểm tra Limits rồi thử lại.';}
 else if(code==='insufficient_quota'||type==='insufficient_quota'){kind='AI_QUOTA';message='OpenAI API báo không đủ hạn mức (insufficient_quota). Cần kiểm tra số dư và giới hạn trong Billing / Limits; chờ thêm sẽ không tự khắc phục.';}
 else if(code==='ip_not_authorized'){kind='AI_IP';message='OpenAI đang chặn địa chỉ mạng của máy chủ. Quản trị viên cần kiểm tra danh sách IP được phép.';}
 else if(status===401){kind='AI_AUTH';message='Khóa API không hợp lệ, đã hết hạn hoặc bị thu hồi. Quản trị viên cần kiểm tra khóa trên máy chủ.';}
 else if(status===403){kind='AI_ACCESS';message='OpenAI từ chối quyền truy cập. Cần kiểm tra quyền của khóa, dự án và model đang dùng.';}
 else if(status===404||code==='model_not_found'){kind='AI_MODEL';message='Model AI không tồn tại hoặc tài khoản chưa có quyền dùng model này.';}
 else if(status===429){kind='AI_RATE_LIMIT';message='OpenAI đang giới hạn tốc độ gửi yêu cầu. Hệ thống tạm dừng và sẽ thử lại sau thời gian chờ.';automatic=true;}
 else if(status>=500){kind='AI_UNAVAILABLE';message='Dịch vụ OpenAI đang lỗi hoặc quá tải. Hệ thống tạm dừng và sẽ thử lại sau thời gian chờ.';automatic=true;}
 else if(code==='invalid_json_schema'||String(raw.param||'').startsWith('text.format')){kind='AI_SCHEMA';message='Cấu trúc yêu cầu tạo lời giải chưa được OpenAI chấp nhận. Đây là lỗi tích hợp cần sửa ở máy chủ.';}
 else if(/image/.test(code)){kind='AI_IMAGE';message='OpenAI không đọc được ảnh của câu này. Cần kiểm tra định dạng và nội dung ảnh đề.';pause=false;}
 else if(status===400){kind='AI_REQUEST';message='OpenAI từ chối cấu hình yêu cầu (HTTP 400). Quản trị viên cần kiểm tra định dạng yêu cầu và model.';}
 const seconds=Number(retryAfter),date=Date.parse(retryAfter);
 const delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Number.isFinite(date)?date-Date.now():60000;
 return Object.assign(Error(message),{code:kind,httpStatus:status,providerCode:/^[a-z_]{1,70}$/.test(code)?code:'unknown',pause,automatic,retryAfterMs:Math.max(60000,Math.min(delay,24*3600000)),needsReview:!pause});
}
function retryDelay(value,fallback=60000){
 if(!value)return fallback;
 const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>0)return Math.max(1000,seconds*1000);
 if(/^\s*(?:\d+(?:\.\d+)?\s*(?:ms|s|m|h|d)\s*)+$/i.test(value)){
  const factors={ms:1,s:1000,m:60000,h:3600000,d:86400000};
  return Math.max(1000,[...value.matchAll(/(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gi)].reduce((sum,x)=>sum+Number(x[1])*factors[x[2].toLowerCase()],0));
 }
 const date=Date.parse(value);return Number.isFinite(date)?Math.max(1000,date-Date.now()):fallback;
}
function quotaDetails(message){
 const bucket=[['ITPM',/input tokens per minute|\bITPM\b/i],['OTPM',/output tokens per minute|\bOTPM\b/i],['TPD',/tokens per day|\bTPD\b/i],['RPD',/requests per day|\bRPD\b/i],['TPM',/tokens per minute|\bTPM\b/i],['RPM',/requests per minute|\bRPM\b/i]].find(([,pattern])=>pattern.test(message))?.[0]||'unknown';
 const number=label=>{const value=message.match(new RegExp('\\b'+label+'\\s*[:=]?\\s*(\\d[\\d,]*(?:\\.\\d+)?)','i'))?.[1];const n=value?Number(value.replace(/,/g,'')):NaN;return Number.isFinite(n)&&n>=0&&n<=1e12?n:null;};
 return {bucket,limit:number('limit'),used:number('used'),requested:number('requested')};
}
function groqError(status,raw,retryAfter){
 const providerCode=String(raw.code||''),internal=String(raw.message||'');
 const quota=quotaDetails(internal);
 let code='AI_PROVIDER_ERROR',message='Groq chưa xử lý được yêu cầu. Cần kiểm tra cấu hình kết nối.',pause=true,automatic=false,delay=60000;
 const oversized=quota.limit>0&&quota.requested!==null&&quota.requested>quota.limit;
 if(status===413||providerCode==='context_length_exceeded'||/request too large|maximum.*images/i.test(internal)||(status===429&&oversized)){
  code='AI_INPUT_LIMIT';pause=false;
  message='Yêu cầu của câu này vượt giới hạn Groq; chờ thêm không làm yêu cầu nhỏ đi. Cần rút gọn nội dung hoặc ảnh. Hệ thống sẽ xử lý các câu khác.';
 }else if(status===429){
  const daily=['TPD','RPD'].includes(quota.bucket);
  code=daily?'AI_DAILY_LIMIT':'AI_RATE_LIMIT';automatic=true;
  message=daily?'Đã hết hạn mức Groq trong ngày. Lời giải đã tạo được giữ lại; hệ thống sẽ tiếp tục sau thời gian chờ.':'Groq đang giới hạn tốc độ. Hệ thống giữ tiến độ và sẽ tự tiếp tục.';
  if(quota.bucket==='TPM'||quota.bucket==='ITPM'||quota.bucket==='OTPM')message='Groq đang giới hạn lượng nội dung xử lý mỗi phút. Hệ thống giữ tiến độ và sẽ tự tiếp tục.';
  const wait=internal.match(/try again in\s+([\d.]+(?:ms|s|m|h|d)(?:[\d.]+(?:ms|s|m|h|d))*)/i)?.[1];
  delay=retryDelay(retryAfter||wait,daily?24*3600000:60000);
 }else if(status===401){code='AI_AUTH';message='Khóa Groq không hợp lệ hoặc đã bị thu hồi. Cần kiểm tra GROQ_API_KEY trên máy chủ.';}
 else if(status===403){code='AI_ACCESS';message='Groq từ chối quyền truy cập. Cần kiểm tra tài khoản và quyền sử dụng model.';}
 else if(status===404||providerCode==='model_decommissioned'){code='AI_MODEL';message='Model Groq chưa khả dụng hoặc đã ngừng phục vụ. Cần kiểm tra model trong tài khoản Groq.';}
 else if(providerCode==='json_validate_failed'){code='AI_OUTPUT';pause=false;message='AI trả lời chưa đúng cấu trúc lời giải. Câu này cần kiểm tra hoặc thử lại.';}
 else if(/image/.test(providerCode)){code='AI_IMAGE';pause=false;message='Groq chưa đọc được hình gốc. Cần kiểm tra ảnh của câu này.';}
 else if(status>=500){code='AI_UNAVAILABLE';automatic=true;message='Groq đang quá tải. Hệ thống tạm chờ rồi tự tiếp tục.';delay=retryDelay(retryAfter);}
 else if(status===400){code='AI_REQUEST';message='Groq từ chối cấu hình yêu cầu. Cần kiểm tra model và định dạng API trên máy chủ.';}
 // Only whitelisted quota names and numeric counters can leave this function.
 return Object.assign(Error(message),{code,httpStatus:status,providerCode:/^[a-z_]{1,70}$/.test(providerCode)?providerCode:'unknown',pause,automatic,retryAfterMs:delay,needsReview:!pause,quota});
}
function networkError(error,provider='openai'){return Object.assign(Error(error?.name==='TimeoutError'?'AI phản hồi quá lâu. Hệ thống tạm dừng rồi thử lại.':`Máy chủ chưa kết nối được tới ${provider==='groq'?'Groq':'OpenAI'}. Hệ thống tạm dừng rồi thử lại.`),{code:error?.name==='TimeoutError'?'AI_TIMEOUT':'AI_NETWORK',pause:true,automatic:true,retryAfterMs:60000});}
module.exports={providerError,networkError};
