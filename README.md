# VINH EXAM · Không gian dạy và học

Website tạo đề, giao bài, làm bài và chấm điểm bằng tiếng Việt. Giao diện sáng, nền trắng–xám và điểm nhấn xanh, dành cho giáo viên và học sinh. Dữ liệu tài khoản, lớp và bài làm lưu trong PostgreSQL.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên và PostgreSQL. Bộ kiểm thử hiện được xác minh bằng Node.js 24.

```sh
npm ci
npm start
```

Thiết lập `DATABASE_URL`, `DATABASE_SSL` khi máy chủ PostgreSQL yêu cầu SSL và `NODE_ENV=production` khi triển khai HTTPS. `PORT` mặc định 3000. Giữ `SEED_ON_BOOT=false` trên hệ thống thật; không đưa mật khẩu hay chuỗi kết nối vào Git.

Điểm vào vẫn là `node server-hotfix.js`, phù hợp cấu hình Railway hiện tại. Khi khởi động, ứng dụng tạo CSS/JavaScript có tên theo nội dung, nén gzip, rồi chạy migration và máy chủ. Không cần thay lệnh khởi động trên Railway.

## Kiểm tra

```sh
npm ci --include=dev
npm test
npm run build
```

Các kiểm thử dùng JSDOM, API Express thật và PostgreSQL biệt lập qua PGlite. Không kết nối cơ sở dữ liệu production. Các tệp Word/PDF trong kiểm thử là dữ liệu tự tạo. PGlite chạy một kết nối và không thay thế kiểm thử tải nhiều người trên PostgreSQL production.

Chi tiết phiên bản giao diện và nghiệp vụ: [docs/WORKSPACE-REVIEW.md](docs/WORKSPACE-REVIEW.md).
