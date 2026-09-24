# Lời giải theo đề, không dùng API

## Dành cho giáo viên

1. Vào **Bài giao → Theo dõi → Công bố & chữa bài → Nhập lời giải**.
2. Bấm **Tải mẫu của đề này**. File JSON chứa nội dung, đáp án, mã câu, khối/chủ đề nhận diện từ đề và hướng dẫn soạn lời giải. File không chứa bài làm hoặc danh tính học sinh. Nếu câu có ảnh, gửi kèm đề gốc: mẫu không chứa ảnh gốc.
3. Soạn lời giải hoặc gửi mẫu kèm đề cho trợ lý đang dùng, yêu cầu trả lại file JSON hoàn chỉnh. Giữ nguyên `assignmentId`, `examFingerprint`, `questionId`, `number`, `question`; điền `solution` và để `null` ở câu chưa giải đủ dữ kiện. Kiểm tra khối lớp và kiến thức đã học khi soạn.
4. Nhập file, bấm **Xem trước**. Kiểm tra nội dung câu, kết quả, từng bước và hình. Hệ thống chỉ kiểm tra cấu trúc và đối chiếu đáp án khai báo; không chứng nhận tính đúng của toàn bộ lời giải.
5. Xác nhận đã đọc, bấm **Lưu lời giải**. Bản mới chưa hiển thị cho học sinh. Chọn **Hiện đáp án**, **Hiện lời giải & hình minh họa**, thời điểm công bố rồi bấm **Lưu lựa chọn công bố**.

Có thể dán văn bản thay cho file: bắt đầu mỗi lời giải bằng `Câu 1.`, `Câu 2.`. Đánh số liên tục theo thứ tự gốc của cả đề, không theo thứ tự đã đảo của học sinh và không đánh lại từ 1 ở mỗi phần. Nội dung đầu file phải là câu đầu tiên muốn nhập, chẳng hạn `Câu 12.` nếu chỉ bổ sung câu 12. Văn bản thường không tự suy diễn hình hoặc đáp án; dùng JSON để mang theo hình và mô phỏng.

File hỗ trợ: JSON, TXT, MD, UTF-8, tối đa 1 MB/lượt. Có thể nhập nhiều lượt: các câu đã có nhưng không nằm trong lượt mới được giữ nguyên; câu nhập lại sẽ thay thế phiên bản trước. Word/PDF: sao chép phần lời giải chữ hoặc chuẩn bị JSON, không đổi đuôi file.

### Hình và mô phỏng

`solution.visual` dùng thư viện mô hình có sẵn, chạy hoàn toàn trong trình duyệt: hình học điểm/đoạn/đường tròn, đồ thị bậc nhất/bậc hai, chuyển động thẳng biến đổi đều, dao động điều hòa, sóng. Giáo viên không cần nhập từng tham số trong giao diện; dữ liệu đi cùng bộ lời giải. Ngoài những dạng đã hỗ trợ, để `visual=null`, không bịa mô hình.

LaTeX được đặt trong `\( ... \)` hoặc `\[ ... \]`. Trong JSON, dấu gạch chéo phải escape thành `\\`. Không chấp nhận HTML/SVG/JavaScript chạy trực tiếp từ file.

## Vận hành

- Đặt `AI_SOLUTIONS_DISABLED=true` trên máy chủ để tắt gọi API có phí. Không cần xóa khóa cũ. Endpoint công bố từ chối yêu cầu bật AI trong chế độ này; luồng nhập không gọi nhà cung cấp.
- Dữ liệu nằm trong PostgreSQL, bảng `prepared_solution_sets`; bài giao giữ `prepared_solution_id`. Phiên bản trước được giữ để đối chiếu, không thay điểm, đáp án hoặc bài làm.
- Preview chỉ đọc, chưa lưu. Save khóa bài giao và kiểm tra lại mã xác nhận xem trước; nếu cửa sổ khác vừa nhập hoặc đề thay đổi sẽ trả 409. Save luôn tắt AI cho bài giao và ẩn lời giải đến khi giáo viên công bố lại.
- Các API nhập/tải mẫu chỉ dành cho giáo viên sở hữu lớp. Học sinh chỉ thấy lời giải của bài làm thuộc mình, đã chấm, trong thời điểm được công bố; ghép theo ID để không lệch khi đảo câu.
- Khi chưa có lượt làm, đề có thể còn thay đổi: dấu kiểm tra nội dung chặn công bố bản lời giải không khớp. Khi đã có lượt làm, lời giải gắn với bản đề chốt của bài giao.
- Phí lưu trữ/máy chủ vẫn theo gói hosting. Chức năng này không tự sinh lời giải cho một đề mới và không chuyển sang API trả phí.

## Kiểm thử

`node --test --test-concurrency=1 tests/*.test.js`

Bao gồm nhập từng phần, kiểm tra mã câu/đáp án, từ chối file sai, quyền sở hữu, xung đột phiên bản, lưu kín, chấm rồi công bố, lịch đóng thi, thu hồi quyền xem, thứ tự đảo câu, phục hồi sau khởi động và thao tác mô phỏng.
