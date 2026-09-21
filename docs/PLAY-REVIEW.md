# Bản cập nhật PLAY

Bản gốc: `a401806de4f82122343a80f5780deaefc0d5ba8b`.

## Giao diện và thao tác

- Đăng nhập, đăng ký, thanh điều hướng, tổng quan giáo viên, kho đề, bảng dữ liệu và phòng làm bài dùng chung màu PLAY. Minh họa tờ đề được vẽ bằng CSS, không có canvas chạy liên tục.
- Menu giáo viên còn 8 mục. Nhập đề, phiên bản, mã lớp, phúc khảo và quản lý thiết bị được đặt trong Công cụ; dữ liệu và các nghiệp vụ hiện có được giữ lại.
- Kho đề có thẻ màu, tìm kiếm, lọc trạng thái, sắp xếp và phân trang 12 đề. Lọc và chuyển trang không gọi lại API.
- Đăng ký chỉ hỏi các trường cần cho tài khoản: vai trò, tên, tên đăng nhập, mật khẩu, khối lớp hoặc môn dạy.
- Nút có trạng thái chờ, trường nhập có nhãn, hộp thoại có quản lý tiêu điểm, hỗ trợ bàn phím và chế độ giảm chuyển động. Có bố cục điện thoại trong CSS; chưa xác minh trực quan trong trình duyệt.

## Hiệu năng

Đo từ mã nguồn/build, không phải số đo Core Web Vitals:

| Chỉ số | Trước | PLAY |
|---|---:|---:|
| Tệp CSS/JS riêng của ứng dụng khi khởi động | 29 | 2 |
| Tổng CSS/JS chưa nén | 297.254 byte | 220.929 byte |
| CSS/JS PLAY truyền bằng gzip | — | 55.095 byte |

Phép so sánh không tính HTML, công thức MathJax, DOMPurify và ảnh tài liệu. Không suy diễn thành phần trăm tăng tốc của website thật.

Loại khỏi quá trình khởi động các lớp work-ui/commercial/flowstate/visual cũ, gồm hiệu ứng canvas bị ẩn, tải lặp commercial-v10 và các bộ theo dõi DOM dùng cho trang trí. Mọi chức năng được đăng ký trước `boot()`. MathJax chỉ tải khi có công thức; DOMPurify chỉ tải khi xem Word. Tệp có tên theo nội dung được cache dài hạn; HTML luôn kiểm tra lại phiên bản. Luồng giám sát không tạo truy vấn chồng khi truy vấn trước chưa xong.

## Độ tin cậy

- Xếp hàng lưu đáp án: sửa khi một yêu cầu đang chạy sẽ tạo bản lưu kế tiếp; không báo đã lưu khi vẫn còn thay đổi chưa ghi nhận.
- Phiên bản dòng ngăn bản lưu cũ ghi đè bản mới ở cửa sổ khác. API cũ không gửi phiên bản vẫn được chấp nhận để tương thích phiên đang mở; người dùng cần tải lại sau triển khai.
- Nộp bài thủ công chờ lưu thành công; mất kết nối giữ trạng thái chưa lưu và cho thử lại. Khi hết giờ, máy chủ chấm bản đã lưu thành công. Không hứa lưu được thay đổi chưa gửi trong lúc mất mạng.
- Khóa dòng khi nộp; bộ kết thúc bài hết giờ kiểm tra phiên bản trước khi ghi điểm.
- Điểm và đáp án tuân theo quyền công bố cả ở API mới lẫn các API học sinh cũ. Không rơi về màn kết quả cũ khi API công bố lỗi.
- Đọc PDF bằng bản sao Uint8Array để tránh lỗi `bad XRef entry` của bộ đọc cũ khi nhận Node Buffer. Kiểm thử dùng PDF hợp lệ đã tái hiện lỗi trước bản sửa.
- Không tạo đề từ kết quả rà soát nếu bước lưu rà soát thất bại.

## Đã kiểm tra

`npm test`: 7/7 bài kiểm thử qua trên Node.js 24.19.0. Bao gồm ghi đáp án trong lúc yêu cầu trước đang chạy, mất mạng/thử lại, xung đột hai cửa sổ, đăng nhập không gửi lặp, lọc kho đề, rời phòng thi khi chưa lưu, xử lý lỗi điều hướng, và một luồng API từ đăng ký đến kết quả. Luồng API còn kiểm tra phân quyền, hạn làm bài, khóa điểm/đáp án chưa công bố, nhập Word có ảnh, nhập PDF, tải lại tệp gốc đúng byte, MIME/gzip/cache của bundle.

`npm run build` và `git diff --check` thành công. Mã máy chủ đã ghép từ các route fragment được kiểm tra cú pháp khi chạy bộ kiểm thử.

## Cần xác minh trước khi đưa vào sử dụng

Trình duyệt từ xa chặn địa chỉ chạy nội bộ (`ERR_BLOCKED_BY_CLIENT`). Chưa có ảnh chụp giao diện thực tế, chưa đo tốc độ trên điện thoại và chưa thử tải đồng thời trên Railway.

Trên môi trường xem thử được phép truy cập, kiểm tra bố cục 390 px/820 px/1440 px; mở đề có công thức và hình; nhập một Word/PDF thực tế; làm thử trắc nghiệm, đúng/sai, số và tự luận; thử mất mạng; xác minh toàn màn hình/giám sát trên trình duyệt hỗ trợ. PDF scan vẫn cần rà soát thủ công; bản cập nhật này không thêm OCR.

## Triển khai và quay lại

Mã nguồn chuẩn bị trên nhánh riêng. Chưa cập nhật `main` và chưa gọi triển khai production. Railway đang có thay đổi cấu hình chờ từ trước; không bấm áp dụng toàn bộ thay đổi đó khi triển khai bản PLAY. Cần đối chiếu thay đổi chờ và chỉ triển khai commit đã duyệt.

Giữ điểm vào `node server-hotfix.js`, kiểm tra `/api/health` và tệp CSS/JS trả đúng MIME sau triển khai. Các migration mới chỉ thêm index, không xóa hay đổi dữ liệu. Nếu cần quay lại, triển khai commit nền ở đầu tài liệu; các index mới có thể giữ nguyên.
