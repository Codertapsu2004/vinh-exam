'use strict';
// Never expose provider messages: they may contain keys, headers or question text.
function providerError(status,body={},retryAfter){
 const raw=body.error||{}, code=String(raw.code||''), type=String(raw.type||'');
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
function networkError(error){return Object.assign(Error(error?.name==='TimeoutError'?'AI phản hồi quá lâu. Hệ thống tạm dừng rồi thử lại.':'Máy chủ chưa kết nối được tới OpenAI. Hệ thống tạm dừng rồi thử lại.'),{code:error?.name==='TimeoutError'?'AI_TIMEOUT':'AI_NETWORK',pause:true,automatic:true,retryAfterMs:60000});}
module.exports={providerError,networkError};
