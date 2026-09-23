# Rà soát nghiệp vụ Toán – Vật lý, 23/09/2026

## Đã triển khai trong bản cập nhật

- Sửa trực tiếp đề đã xuất bản, giữ cùng mã đề. Kiểm tra phiên bản khi lưu để tránh ghi đè thay đổi từ cửa sổ khác.
- Chụp nội dung đề cho ca đã có bài làm. Việc sửa đề không đổi câu hỏi, đáp án hay thang điểm của các ca này. Ca mới hoặc chưa có lượt làm dùng nội dung cập nhật.
- Cấu hình trước xuất bản và khi giao bài: thời lượng, lịch mở/đóng, số lượt làm, đảo câu trong từng phần, hướng dẫn, chế độ giám sát, lịch xem điểm và đáp án riêng biệt, quyền xem lời giải.
- Công bố ngay sau khi chấm xong, sau khi đóng ca, hoặc giáo viên tự công bố bằng cách cập nhật cài đặt. Kiểm soát tại máy chủ, gồm cả API kết quả, xem lại, lịch sử, bảng tổng quan và thông báo điểm.
- Học sinh đọc điều kiện trước khi bắt đầu tính giờ, tiếp tục lượt đang làm hoặc làm lại trong giới hạn. Lịch sử giữ các lượt, bảng tổng quan lấy lượt mới nhất.
- Trình biên tập hai cột, danh sách câu gọn, xem trước theo yêu cầu; hình ảnh, lời giải và mô phỏng được thu gọn. Bản xem file nhập cũng thu gọn từng câu và tài liệu gốc.
- Nhận diện tiêu đề, môn/lớp, thời lượng và thông tin chung trước câu hỏi; không mặc định đáp án A nếu thiếu khóa. Giữ ảnh nhúng DOCX đã gắn theo câu qua bước phân tích. Đề cũ có tiêu đề ở câu đầu được sửa bằng thao tác “Tách thành thông tin đề” rồi lưu.
- Mô phỏng có tham số gắn vào câu thật: đồ thị bậc hai, dao động điều hòa, tam giác vuông. Giáo viên chọn hiện trong bài hoặc chỉ ở phần chữa bài. Hiệu ứng dao động chạy khi người dùng bấm, dừng khi ẩn/rời trang, tôn trọng giảm chuyển động.
- Trắc nghiệm bỏ trống không bị tính như chọn A. Đề thiếu đáp án hoặc dữ liệu không hợp lệ bị chặn trước xuất bản.

## Kiểm chứng

Chạy `node --test --test-concurrency=1 tests/*.test.js`: 13 kiểm thử đạt.

Các kiểm thử API chạy trên PostgreSQL cô lập bằng PGlite, đi qua đăng ký, phân quyền, tạo đề, xuất bản, giao bài, lưu đáp án, nộp và công bố. Bao gồm sửa đề giữ nguyên kết quả cũ, xung đột phiên bản, khóa công bố trên các đường đọc, giới hạn lượt làm, thứ tự câu ổn định, thiếu đáp án và nhập DOCX có ảnh.

Kiểm thử giao diện bằng JSDOM dùng gói JavaScript thực tế: giữ nội dung khi chuyển câu, lưu lỗi chặn xuất bản, điền metadata, mô phỏng trong câu học sinh không ghi vào đáp án, lưu bài và chế độ giảm chuyển động. Đây không thay thế kiểm tra trực quan tài khoản giáo viên/học sinh trong trình duyệt thật.

## Phạm vi còn cần phát triển

- OCR cho PDF scan, công thức Word dạng OMML và nhận diện cấu trúc từ tài liệu trình bày phức tạp chưa được giải quyết đầy đủ. Cần xem lại câu, đáp án, công thức và hình trước xuất bản.
- Mô phỏng do giáo viên chọn và đặt tham số; chưa tự chuyển một hình hoặc đề bất kỳ thành mô phỏng. Cần kiểm tra thông tin mô hình có vô tình gợi đáp án khi chọn hiện trong bài thi hay không.
- Câu trả lời ngắn chấm số theo sai số; chưa chấm tương đương biểu thức đại số hoặc quy đổi đơn vị tự động.
- Tự luận vẫn chấm bởi giáo viên; rubric theo từng bước, mục tiêu kiến thức và phân tích lỗi sai theo chủ đề là các hạng mục tiếp theo.
- Giám sát chuyển tab/toàn màn hình chỉ cung cấp tín hiệu để giáo viên xem xét, không kết luận gian lận.
- Chưa có giao diện khôi phục từng phiên bản đề. Snapshot hiện bảo vệ các ca đã có bài làm; không thay thế chính sách sao lưu cơ sở dữ liệu của hệ thống.

## Điểm cần biết khi vận hành

Ca cũ giữ lựa chọn công bố hiện có. Cấu hình mới mặc định chờ giáo viên công bố. Thay đổi thời lượng áp dụng cho lượt bắt đầu sau; gia hạn lượt đang làm qua màn hình theo dõi. Đổi lịch đóng hoặc chính sách công bố có thể thay đổi thời điểm học sinh xem kết quả, vì vậy giao diện hiển thị các lựa chọn ngay trong cài đặt ca.
