# Chức năng 1 — sổ giao dịch thanh toán và callback idempotency

## Phạm vi đã triển khai

Dự án lưu một bản ghi `payment_transactions` cho mỗi lệnh thanh toán vé online MoMo hoặc ZaloPay. Bản ghi giữ booking, cổng thanh toán, mã lệnh của cổng, mã giao dịch trả về, số tiền kỳ vọng/nhận được, trạng thái và thời điểm callback gần nhất.

Trạng thái được giới hạn ở:

- `INITIATED`: đã tạo lệnh thanh toán, đang chờ cổng gọi về.
- `SUCCESS`: đã xác thực callback và booking đã chuyển sang đã thanh toán.
- `FAILED`: cổng báo thất bại; lần chuyển đầu tiên giải phóng booking đang giữ.
- `INVALID`: chữ ký/booking/số tiền/mã giao dịch không hợp lệ.
- `DUPLICATE`: callback lặp hoặc một lần thanh toán khác đã xác nhận booking.

Dự án không có hoàn tiền vé, vì vậy không thêm trạng thái hoặc API refund. Booking sau khi thanh toán thất bại chỉ được giải phóng để người dùng thử lại theo luồng hiện có.

## Bảo vệ dữ liệu và callback

- Unique constraint trên cặp `(payment_method, provider_reference)` và `(payment_method, provider_transaction_id)`.
- Callback khóa pessimistic transaction và booking; callback lặp không gọi `confirmBookingPayment` lần thứ hai.
- Callback thành công phải khớp booking và số tiền đã lưu khi tạo lệnh.
- Mã giao dịch từ cổng không được tái sử dụng cho booking khác hoặc thay đổi giữa các callback.
- Callback đến trước lúc bản ghi tạo lệnh hoàn tất vẫn tạo được bản ghi ledger từ booking đang khóa.
- `@Version` bảo vệ cập nhật cạnh tranh ở cấp entity.

## API và giao diện

- `GET /payment/transactions/my`: lịch sử giao dịch cổng của người dùng đăng nhập.
- `GET /payment/transactions?page=1&size=20`: danh sách phân trang cho quyền `BOOKING_VIEW`.
- Tab **Chi tiêu** trong hồ sơ hiển thị mã lệnh, mã giao dịch cổng, số tiền, trạng thái và thời gian callback.
- Tab **Vé đã hủy** chỉ hiển thị booking `CANCELLED`, không gọi đây là lịch sử hoàn tiền.

## Kiểm thử

Đã thêm test cho callback thành công đầu tiên, callback lặp, sai số tiền và callback thất bại lặp. Backend chạy:

```text
mvn -q test -Dtest=!Hcm26CplJsJava02Team4MovieTheaterApplicationTests
158 tests, 0 failures, 0 errors — BUILD SUCCESS
```

Frontend `npm run check` (lint, typecheck, Vite production build) và `npm test` (5/5 regression tests) đều đạt. Test loader được bổ sung dependency `require` và `atob` cần thiết cho test auth hiện có.

## Giới hạn còn lại

Ledger này áp dụng cho thanh toán online MoMo/ZaloPay. Bán vé tại quầy dùng `CASH` hoặc `BANK_TRANSFER` vẫn được ghi trên booking hiện có, chưa tạo provider transaction vì không có callback từ cổng.
