# Chữa bài AI và quyền công bố

## Luồng sử dụng

1. Giáo viên mở bài đã nộp, chấm phần tự luận và chọn: Hiện điểm, Hiện đáp án, Lời giải AI & hình minh họa tự động.
2. Bấm **Lưu điểm & lựa chọn công bố**. Nếu chỉ muốn chấm, dùng **Chỉ lưu điểm**. Các lựa chọn công bố áp dụng cho ca thi; chỉ bài có trạng thái đã chấm mới được xem.
3. Với đề đã chấm tự động, vào **Bài giao → Công bố & chữa bài**, chọn các mục rồi lưu. Có thể hẹn sau giờ đóng ca hoặc thu hồi từng quyền.
4. Lớp, môn, chủ đề được nhận diện từ thông tin đề/lớp khi có đủ dữ liệu. Nếu không biết lớp, hệ thống yêu cầu chọn một lần; giáo viên không chọn mô hình hoặc nhập tham số. Có thể thêm giới hạn kiến thức đã học để phù hợp tiến độ riêng của lớp.
5. Mỗi câu được tạo lời giải có kiến thức dùng, các bước, công thức LaTeX, kết luận và điểm dễ nhầm. AI tự chọn hình hữu ích dựa trên đề và ảnh gốc. Học sinh mở lời giải tại câu tương ứng, kéo thời gian/chạy/tạm dừng mô phỏng nếu câu có chuyển động.

## Kết nối để chạy AI thật

Máy chủ Railway cần biến bí mật `OPENAI_API_KEY` của tài khoản API được cấp quyền và có hạn mức sử dụng. Thêm trực tiếp tại dịch vụ **vinh-exam-v2 → Variables**, sau đó triển khai lại dịch vụ. Không đưa khóa vào mã nguồn, trình duyệt, GitHub hoặc tin nhắn. Hệ thống hiện gọi cố định `https://api.openai.com/v1/responses`; không chuyển dữ liệu tới URL tùy ý.

- `OPENAI_MODEL`: mặc định `gpt-5.4`, phải là model hỗ trợ Responses, hình đầu vào, Structured Outputs và reasoning medium.
- `AI_DAILY_QUESTION_LIMIT`: mặc định 120 câu mới/ngày/giáo viên (ngày UTC). Giới hạn tính theo câu đã xếp hàng, mỗi câu gồm tối đa một lần tạo và một lần kiểm tra. Thử lại thủ công tối đa 3 lần/câu. Không phải trần tiền theo USD.
- `AI_SOLUTIONS_DISABLED=true`: tạm dừng tạo mới. Quyền xem các lời giải đã tạo vẫn do giáo viên điều khiển.

Nếu chưa có khóa, web hiện **Chờ kết nối AI**. Điểm và quyền công bố vẫn lưu được; không tạo lời giải giả. Tác vụ chờ được tiếp tục khi máy chủ đã kết nối và bài có lượt đã chấm. Việc gọi AI sử dụng hạn mức API của tài khoản đã cấu hình.

## Kiến trúc và chất lượng

- Dùng snapshot câu hỏi của ca thi. Không sửa điểm, đáp án gốc hoặc nội dung đề khi AI trả lời khác khóa.
- Bộ lời giải dùng chung cho ca, lưu PostgreSQL, định danh theo nội dung + phạm vi kiến thức + model + phiên bản prompt. Học sinh xem lại không gọi AI lại.
- Worker lấy từng câu bằng khóa cơ sở dữ liệu, lưu tiến độ và kết quả sau mỗi câu. Tác vụ gián đoạn quá 10 phút được đánh dấu để thử lại. Tắt quyền AI dừng lấy thêm câu; tác vụ đã gửi nhà cung cấp có thể hoàn tất nhưng không được hiện khi quyền xem đã tắt.
- Nhà cung cấp nhận nội dung câu, phương án, đáp án chuẩn, lời giải gốc, ảnh câu và ngữ cảnh môn/lớp/chủ đề. Không gửi tên học sinh, bài làm cá nhân, điểm, tài khoản hoặc danh sách lớp. API sử dụng `store:false`; điều này không thay thế chính sách lưu giữ của nhà cung cấp.
- AI giải rồi có lượt kiểm tra riêng về tính đúng, khóa đáp án, phù hợp lớp/phạm vi và sự nhất quán của hình. Mã còn đối chiếu đáp án trắc nghiệm/số và kiểm tra cấu trúc, số hữu hạn, miền vẽ. Chỉ trạng thái sẵn sàng được đưa tới API học sinh. Câu thiếu dữ kiện/mâu thuẫn bị giữ ở **Cần kiểm tra**.
- Đây là hỗ trợ AI, không phải chứng nhận đúng toàn bộ chương trình GDPT hoặc bảo đảm lời giải luôn đúng. Chưa có kho SGK/chuẩn đầu ra có trích dẫn theo từng bài; phạm vi dựa trên lớp, chủ đề, giới hạn giáo viên cung cấp và năng lực model. Cần kiểm thử lời giải thật với đề thực tế sau khi kết nối API.

## Hình và mô phỏng hiện hỗ trợ

- Hình học phẳng: điểm, đoạn thẳng, đường tròn, nhãn; cùng tỉ lệ hai trục để giữ góc và hình tròn. Có thể minh họa cấu trúc Venn đơn giản.
- Đồ thị đa thức bậc tối đa hai.
- Chuyển động thẳng gia tốc không đổi, tối đa bốn vật.
- Dao động điều hòa và sóng điều hòa truyền theo một chiều.

Hình dùng dữ liệu có cấu trúc, được vẽ bằng SVG có kiểm soát. Không thực thi HTML/JavaScript hoặc công thức tùy ý do AI sinh. Không phải câu nào cũng cần mô phỏng; dạng ngoài thư viện trả lời giải và giữ hình gốc, không gắn một mô phỏng không liên quan. Chuyển động chạy tối đa 12 giây theo thời gian phát lại, dừng khi đổi trang/ẩn cửa sổ, hỗ trợ giảm chuyển động.

## Kiểm thử

`node --test --test-concurrency=1 tests/*.test.js`

Các bài mới kiểm tra giao diện chấm/công bố, hiện/ẩn lời giải, tương tác mô phỏng không ghi đáp án; giao dịch lưu điểm với chính sách; phân quyền giáo viên/học sinh; chờ kết nối; lưu và dùng lại kết quả; cổng công bố sau giờ đóng ca; loại câu cần kiểm tra khỏi phản hồi học sinh; dữ liệu gửi nhà cung cấp và JSON schema.

Kiểm thử nhà cung cấp dùng phản hồi mô phỏng có kiểm soát, không chứng minh chất lượng lời giải của model thật. Chỉ xác nhận gọi AI thật sau khi có khóa hợp lệ và kiểm thử trực tiếp.

Tài liệu API đối chiếu:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/models/gpt-5.4
