# Chữa bài tự động và quyền công bố

## Luồng sử dụng

1. Giáo viên vào **Bài giao → Theo dõi → Công bố & chữa bài**; hoặc mở màn hình chấm tự luận.
2. Bật **Tạo và kiểm tra lời giải bằng AI**, xác nhận khối lớp, môn và chủ đề. Có thể bổ sung kiến thức đã học hoặc trích đoạn tài liệu tham chiếu. Không phải chọn hình hay nhập tham số mô phỏng.
3. Bấm **Lưu lựa chọn công bố** hoặc **Lưu điểm & lựa chọn công bố**. AI bắt đầu khi ca có ít nhất một bài đã chấm. Chỉ muốn chấm thì dùng **Chỉ lưu điểm**.
4. Mở **Xem trước lời giải AI** để kiểm tra từng câu. Bật tạo AI không tự bật quyền xem đáp án/lời giải. Nếu quyền xem đã bật từ trước, các câu mới sẵn sàng sẽ được công bố theo quyền đó; bỏ chọn quyền xem nếu muốn giữ riêng để duyệt.
5. Chọn riêng **Điểm**, **Đáp án**, **Lời giải & hình minh họa** và lưu để công bố. Lời giải yêu cầu quyền xem đáp án. Chỉ bài đã chấm được xem, ngay sau chấm hoặc sau giờ đóng ca theo thiết lập. Bỏ chọn và lưu để thu hồi quyền xem.
6. Học sinh xem lời giải ở từng câu; kéo thanh thời gian, chạy hoặc tạm dừng nếu câu có mô phỏng. Hình được chọn tự động từ dữ kiện và thư viện đang hỗ trợ.

Lớp/môn/chủ đề được nhận diện từ thông tin đề và lớp khi đủ dữ liệu. Nếu chưa biết khối lớp, giáo viên chọn một lần. Tính năng **Đã có lời giải? Nhập bổ sung** vẫn là lựa chọn phụ, không bắt buộc để AI tự giải.

## Kết nối Groq Free trên Railway

Tạo khóa tại https://console.groq.com/keys bằng tài khoản Groq ở gói Free. Trong dịch vụ **vinh-exam-v2 → Variables**, cấu hình:

| Biến | Giá trị |
| --- | --- |
| `AI_PROVIDER` | `groq` |
| `AI_FREE_ONLY` | `true` |
| `AI_SOLUTIONS_DISABLED` | `false` |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` |
| `GROQ_API_KEY` | Khóa bí mật tạo trong tài khoản Groq |

Triển khai lại sau khi thêm khóa. Không gửi khóa qua tin nhắn, đưa vào mã nguồn, GitHub hoặc trình duyệt. Máy chủ gọi cố định `https://api.groq.com/openai/v1/chat/completions` và không nhận URL nhà cung cấp tùy ý.

`AI_FREE_ONLY=true` chặn OpenAI và không có cơ chế tự chuyển sang nhà cung cấp trả phí. Tuy nhiên, cờ này không đọc hay khóa gói thanh toán của tài khoản Groq: chủ tài khoản cần giữ gói Free, không nâng cấp sang gói trả phí. Hạn mức miễn phí do Groq quy định và có thể thay đổi. Chi phí máy chủ Railway độc lập với chi phí API AI.

Chưa có khóa thì web hiện **Chờ kết nối AI**; vẫn lưu được yêu cầu và quyền công bố. Không tạo lời giải giả. Yêu cầu đang chờ được xử lý khi có khóa hợp lệ và bài đã chấm. Nếu chuyển từ tác vụ OpenAI cũ, giáo viên bấm lưu lựa chọn một lần để tạo tác vụ bằng kết nối Groq hiện tại; worker không chạy tác vụ của model cũ qua model mới.

Các cấu hình khác:

- `AI_DAILY_QUESTION_LIMIT`: mặc định 120 câu mới/ngày/giáo viên, tính theo câu được xếp hàng. Đây là giới hạn của ứng dụng, không bảo đảm đủ hạn mức Groq cho 120 câu. Mỗi câu cần một lượt tạo và một lượt kiểm tra; thử lại nội dung thủ công tối đa ba lần.
- `AI_SOLUTIONS_DISABLED=true`: tạm dừng tạo lời giải. Các quyền công bố kết quả đã lưu vẫn hoạt động.
- Tích hợp OpenAI cũ vẫn được giữ để tương thích, mặc định khi không đặt `AI_PROVIDER`; cần `OPENAI_API_KEY`, `OPENAI_MODEL` (mặc định `gpt-5.4`) và không bật `AI_FREE_ONLY`. Không sử dụng nhánh này trong cấu hình Groq Free ở trên.

## Hạn mức và phục hồi

- Khi Groq giới hạn tốc độ hoặc hạn mức ngày, giao diện hiện nguyên nhân và thời điểm tự tiếp tục. Worker tuân thủ `Retry-After` hoặc thời gian chờ nhà cung cấp trả về; không gọi liên tục trong lúc chờ.
- Thời gian chờ Groq không còn bị nâng lên tối thiểu 60 giây: dùng thời gian nhà cung cấp yêu cầu, tối thiểu một giây; worker kiểm tra mỗi năm giây. Khi Groq báo lượng yêu cầu lớn hơn toàn bộ hạn mức, câu được chuyển sang **Cần kiểm tra** thay vì thử lại cùng yêu cầu vô hạn.
- Hướng dẫn dành cho model Groq được rút gọn, dùng chỉ dẫn tiếng Anh để giảm token; lời giải và nhận xét vẫn phải bằng tiếng Việt. Lượt kiểm tra giữ ảnh gốc và các tiêu chí kiến thức, lập luận, đáp án, đơn vị, hình vẽ.
- Bản nháp được lưu PostgreSQL trước lượt kiểm tra. Nếu hết hạn mức ở lượt kiểm tra, lần tiếp tục chỉ kiểm tra bản nháp đã lưu, không yêu cầu tạo lại. Bản nháp chưa kiểm tra không được gửi cho học sinh.
- Tiến độ, lời giải sẵn sàng và thời điểm chờ tồn tại qua lần khởi động lại máy chủ. Lỗi hạn mức/kết nối không trừ số lần thử lại nội dung.
- Khóa sai, thiếu quyền hoặc model không khả dụng sẽ tạm dừng toàn bộ worker. Sau khi xử lý nguyên nhân, bấm **Kiểm tra & thử lại**; đổi cấu hình khóa/model và khởi động lại cũng đặt lại trạng thái kết nối.
- Câu thiếu ảnh, vượt giới hạn đầu vào hoặc có nội dung chưa xác minh được được giữ ở **Cần kiểm tra**; các câu khác vẫn tiếp tục. Groq hiện được giới hạn ở tối đa ba ảnh/câu và 19 MiB dữ liệu ảnh base64; worker còn giới hạn 16 MiB ảnh gốc. Giới hạn token của tài khoản có thể thấp hơn dung lượng ảnh này.
- Thanh tiến độ tính số câu có lời giải sẵn sàng. Không biến lỗi kết nối thành thông báo đã giải xong.

## Kiến trúc và chất lượng

- Dùng snapshot câu hỏi của ca thi. AI không sửa điểm, đáp án chuẩn hoặc nội dung đề.
- Lời giải dùng chung cho ca, lưu PostgreSQL theo nội dung, phạm vi kiến thức, model và phiên bản prompt. Học sinh xem lại không gọi AI lại.
- Worker khóa từng câu trong cơ sở dữ liệu và lưu sau mỗi bước. Tác vụ gián đoạn quá 10 phút được đánh dấu để giáo viên thử lại. Tắt tạo AI dừng lấy câu mới; tác vụ đã gửi nhà cung cấp có thể hoàn tất. Quyền công bố kiểm soát việc học sinh được nhận lời giải.
- Chỉ gửi nội dung câu, phương án, đáp án chuẩn, lời giải gốc, ảnh và ngữ cảnh môn/lớp/chủ đề. Không gửi tên học sinh, bài làm cá nhân, điểm, tài khoản hoặc danh sách lớp. Nhánh OpenAI đặt `store:false`; nhánh Groq không gửi trường này. Chính sách lưu giữ của từng nhà cung cấp vẫn áp dụng.
- AI tạo bản nháp, sau đó có lượt kiểm tra riêng về lập luận, khóa đáp án, phạm vi lớp và sự phù hợp của hình. Mã còn đối chiếu đáp án trắc nghiệm/số, kiểm tra cấu trúc, số hữu hạn, miền vẽ và các phép tính số được AI khai báo.
- Bộ kiểm tra số học dùng parser giới hạn, không dùng `eval` hoặc `Function`. Nó kiểm tra phép tính, không chứng minh rằng biểu thức đã mô hình hóa đúng đề, mọi đơn vị đều đúng hay mọi bước lập luận đều hợp lệ.
- Chỉ câu ở trạng thái sẵn sàng được trả trong API học sinh khi đúng quyền và thời điểm công bố. Câu mâu thuẫn đáp án, thiếu dữ kiện hoặc chưa qua kiểm tra được giữ lại để giáo viên xem.
- Chưa có kho SGK/chuẩn đầu ra được tra cứu và trích dẫn tự động. Phạm vi dựa trên khối lớp, chủ đề và tài liệu giáo viên cung cấp; không phải chứng nhận đúng toàn bộ chương trình hoặc bảo đảm lời giải luôn đúng. Cần kiểm tra chất lượng bằng đề thật sau khi kết nối khóa.

## Hình và mô phỏng đang hỗ trợ

- Hình học phẳng: điểm, đoạn thẳng, đường tròn và nhãn, hai trục cùng tỉ lệ; có thể biểu diễn cấu trúc Venn đơn giản.
- Đồ thị đa thức bậc tối đa hai.
- Chuyển động thẳng gia tốc không đổi, tối đa bốn vật.
- Dao động điều hòa và sóng điều hòa truyền theo một chiều.

Hình vẽ bằng SVG từ dữ liệu có cấu trúc; không thực thi HTML/JavaScript do AI tạo. Câu không cần hình hoặc nằm ngoài thư viện vẫn có thể có lời giải và giữ ảnh gốc. Chuyển động phát lại tối đa 12 giây, dừng khi đổi trang/ẩn cửa sổ, hỗ trợ chế độ giảm chuyển động.

## Kiểm thử và chẩn đoán

Chạy `node --test --test-concurrency=1 tests/*.test.js` và `npm run build`.

Kiểm thử bao gồm quyền công bố độc lập với tạo AI, chấm tự luận, phân quyền, thời điểm công bố, mô phỏng, cấu trúc gửi Groq, không chuyển sang API trả phí, kiểm tra số học, lưu bản nháp qua hạn mức/khởi động lại và ngăn bản nháp lọt vào phản hồi học sinh. Nhật ký chỉ ghi mã phân loại, HTTP, bước tạo/kiểm tra, số token, số ảnh/ký tự và các số hạn mức đã lọc; không ghi khóa, nội dung đề, lời giải hoặc nguyên văn lỗi nhà cung cấp.

Các kiểm thử API dùng phản hồi mô phỏng có kiểm soát. Chúng không chứng minh model thật giải đúng hay khóa có quyền sử dụng model. Chỉ xác nhận hoạt động thực tế sau khi có khóa hợp lệ và chạy trực tiếp một đề mẫu.

Tài liệu nhà cung cấp dùng để đối chiếu tích hợp:

- https://console.groq.com/docs/model/qwen/qwen3.8-27b
- https://console.groq.com/docs/vision
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/billing-faqs
- https://developers.openai.com/api/docs/guides/structured-outputs
