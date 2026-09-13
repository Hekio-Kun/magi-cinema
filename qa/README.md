# Magi Cinema hybrid QA

Bộ này kết hợp kiểm thử trình duyệt bằng Playwright và kiểm thử tải API bằng k6.

## Phạm vi

- `functional.spec.ts`: đăng nhập, duyệt suất chiếu, mở sơ đồ ghế và đọc lịch sử đặt vé.
- `seat-contention.spec.ts`: hai khách cùng giữ một ghế, kiểm tra chỉ một phiên thắng; đồng thời mở WebSocket và xác nhận nhận được `SEAT_STATUS_CHANGED`.
- `rbac.spec.ts`: khách hàng bị từ chối các endpoint quản trị, tài khoản quản lý được phép đọc booking và thống kê.
- `k6/load.js`: các kịch bản `browse`, `seat-contention`, `authz` để kiểm tra tải, giữ ghế và phân quyền.

## Chạy local

Khởi động backend ở `http://localhost:8080` và frontend ở `http://localhost:3000`, sau đó:

```powershell
cd qa
npm install
npx playwright install chromium
Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm run test:ui
```

Các test dùng tài khoản demo có mật khẩu `password`; đặt `BOT_USER_PREFIX`, `CONTENTION_USER_A` và `CONTENTION_USER_B` nếu database local của bạn dùng tên khác.

Để chạy cả hai lớp:

```powershell
npm run test:hybrid
```

Muốn chỉ chạy tải API, cần cài k6:

```powershell
$env:K6_SCENARIO = 'browse'
k6 run k6/load.js
$env:K6_SCENARIO = 'seat-contention'
k6 run k6/load.js
```

Các biến thường dùng:

```powershell
$env:UI_BASE_URL = 'http://localhost:3000'
$env:API_BASE_URL = 'http://localhost:8080'
$env:K6_TARGET_VUS = '50'
$env:K6_HOLD = '2m'
```

Mặc định mọi test có side effect đều bị chặn khi `API_BASE_URL` không phải local. Chỉ bật `ALLOW_REMOTE_BOT_TEST=true` hoặc `ALLOW_REMOTE_LOAD=true` sau khi đã dùng database kiểm thử riêng. Bộ test không gọi thanh toán MoMo/ZaloPay thật và không tạo booking thanh toán thành công tự động.
