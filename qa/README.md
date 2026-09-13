# Magi Cinema hybrid QA

Bộ này kết hợp kiểm thử trình duyệt bằng Playwright và kiểm thử tải API bằng k6.

## Phạm vi

- `functional.spec.ts`: đăng nhập, duyệt suất chiếu, mở sơ đồ ghế, tạo/hủy booking `PENDING` bằng gateway giả lập và đọc lịch sử đặt vé.
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

## 🚀 Giả lập 1.000 người truy cập đồng thời (Virtual Bot Swarm)

Để giả lập 1.000 người dùng online cùng lúc (kết nối WebSocket presence và duyệt web như người thật, làm huy hiệu trên Admin Dashboard nhảy lên `🟢 1000 trực tuyến`):

```powershell
cd qa

# Chạy mặc định 1.000 bots:
npm run swarm

# Hoặc tùy chọn số lượng bot:
npm run swarm:100     # 100 bots
npm run swarm:500     # 500 bots
npm run swarm:1000    # 1.000 bots

# Hoặc dùng script PowerShell:
.\run-swarm.ps1 -Bots 1000
```

> **Lưu ý:** Toàn bộ 1.000 bot ảo chỉ tiêu thụ khoảng **~50MB RAM** trên máy tính của bạn. Nhấn **Ctrl + C** trong terminal bất cứ lúc nào để ngắt kết nối toàn bộ bot một cách an toàn.
