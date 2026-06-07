# Wordie Office Web Add-in

Hai đề cuối khóa Office Add-in trên route `/tests` đọc và chấm trực tiếp tài liệu Word đang mở bằng `Office.js`.

## Luồng học viên

1. Học viên đăng nhập website và bấm một đề có nhãn `Office Web Add-in · Cuối khóa`.
2. Backend local tạo lượt thi và tự mở Microsoft Word với tài liệu sideload.
3. Task Pane tự nhận lượt thi chưa nộp gần nhất và nạp nội dung đề vào Word.
4. Học viên làm bài trực tiếp trong Word rồi bấm **Đọc và nộp tài liệu Word** trong Task Pane.
5. Website đang mở tự polling và hiển thị điểm sau khi Word nộp thành công.

Không cần tải file `.docx` lên lại website. Việc đọc và gửi kết quả được thực hiện trực tiếp qua Office.js.

## Chạy local

1. Chạy backend tại `http://localhost:4000`.
2. Chạy `npm run dev` trong thư mục `FE`. Vite đã được cấu hình HTTPS tại `https://localhost:5173` và proxy `/api` sang backend.
3. Chạy `npm run office:start`. Công cụ Microsoft sẽ sideload manifest và mở một tài liệu Word đặc biệt có gắn add-in.
4. Mở Task Pane Wordie trong tài liệu vừa được tạo, đăng nhập, chọn một đề có nhãn `Office Web Add-in · Cuối khóa`.
5. Bấm **Nạp nội dung đề vào Word**, hoàn thành yêu cầu, rồi bấm **Đọc và nộp tài liệu Word**.

Kiểm tra manifest bằng `npm run office:validate`. Dừng phiên sideload bằng `npm run office:stop`.

Manifest yêu cầu HTTPS vì Microsoft Office không cho Task Pane production chạy từ HTTP. Khi đổi host hoặc port, cập nhật `SourceLocation`, `SupportUrl` và `AppDomain` trong manifest.

## Dữ liệu chấm

Task Pane dùng `Word.run()` và `context.sync()` để thu thập:

- Nội dung toàn tài liệu.
- Text, built-in style và trạng thái bold của từng paragraph.
- Nội dung các bảng.

Snapshot được gửi tới endpoint nộp bài thực hành hiện có. Các bài mô phỏng cũ vẫn gửi HTML từ CKEditor như trước.

## Mở Word từ website đã deploy

Website production không thể trực tiếp chạy `WINWORD.EXE` trên máy học viên. Wordie dùng Office URI Scheme để yêu cầu Windows mở một tài liệu Word đã nhúng Add-in:

```text
ms-word:ofe|u|https://your-vercel-domain.vercel.app/wordie-exam.docx
```

Thiết lập biến môi trường trên Vercel:

```text
VITE_API_URL=https://your-render-api.onrender.com
VITE_WORD_EXAM_DOCUMENT_URL=https://your-vercel-domain.vercel.app/wordie-exam.docx
```

Máy học viên phải cài Wordie Add-in một lần trước khi làm bài. File `wordie-exam.docx` hiện tham chiếu catalog developer, nên có thể dùng ngay sau khi sideload manifest production trên từng máy Windows.

Với máy thuộc trường/tổ chức, nên triển khai Add-in bằng Microsoft 365 Centralized Deployment. Khi dùng cách này cần tạo lại `wordie-exam.docx` với Open XML reference dạng `EXCatalog`, thay vì `Registry/developer`.

Trình duyệt có thể hiện hộp thoại yêu cầu người dùng xác nhận mở Microsoft Word. Đây là giới hạn bảo mật của trình duyệt và không thể bỏ qua từ website.

Tài liệu `public/wordie-exam.docx` được tạo bởi `office-addin-debugging` và tham chiếu Add-in ID `7192b75f-6ce0-4d93-a38d-91731c0a1c4f`. Manifest cài trên máy học viên phải dùng đúng ID này và trỏ các URL Task Pane sang domain Vercel production.

Tạo manifest production sau khi biết domain Vercel:

```powershell
$env:WORDIE_WEB_URL="https://your-vercel-domain.vercel.app"
npm run office:manifest:production
npm exec -- office-addin-manifest validate wordie-office-addin.production.xml
```

Sau đó triển khai `wordie-office-addin.production.xml` bằng Microsoft 365 Centralized Deployment hoặc sideload một lần trên máy học viên.
