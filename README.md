# 🎬 Magi Cinema — Movie Theater Management System

Hệ thống Quản lý và Đặt vé Rạp Chiếu Phim Hiện Đại (Full-stack Spring Boot & React Vite).

---

## 📂 Cấu trúc dự án (Monorepo)

Dự án được tổ chức thành 2 nhóm chính:

```text
magi-cinema/
├── backend/            # Máy chủ xử lý nghiệp vụ & REST API (Java Spring Boot 3)
│   ├── docs/           # Tài liệu kiến trúc, thuật toán, UAT
│   └── backend/        # Mã nguồn Spring Boot, JPA, Security, WebSocket
│
├── frontend/           # Ứng dụng giao diện người dùng (React 19 + TypeScript + Vite)
│   └── frontend/       # Giao diện Khách hàng, Nhân viên và Admin Dashboard
│
├── docker-compose.yml  # Đóng gói và chạy đồng bộ Database, Backend & Frontend
└── database_backup.sql # Dữ liệu khởi tạo mẫu
```

---

## 🛠️ Công nghệ sử dụng

### Backend
* **Ngôn ngữ & Framework**: Java 21, Spring Boot 3.3
* **Bảo mật & Xác thực**: Spring Security, JWT (JSON Web Tokens)
* **Cơ sở dữ liệu**: PostgreSQL, Spring Data JPA, Hibernate
* **Realtime**: WebSocket (Broadcast trạng thái chọn ghế theo thời gian thực)
* **Tích hợp bên thứ ba**: Cổng thanh toán MoMo & ZaloPay, Cloudinary (Lưu trữ ảnh), TMDB API

### Frontend
* **Core**: React 19, TypeScript 6, Vite 8
* **Styling**: Tailwind CSS 4, Base UI, Lucide Icons
* **Routing & State**: React Router DOM, Axios HTTP Client

### DevOps
* **Docker & Docker Compose**
* **Nginx Web Server**

---

## 🚀 Hướng dẫn khởi chạy nhanh bằng Docker

Yêu cầu: Docker Engine/Desktop đang chạy và Docker Compose. Chạy lệnh từ thư mục gốc `magi-cinema`.

1. **Tạo cấu hình riêng nếu chưa có:**
   ```powershell
   if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
   ```
   Điền `DB_PASSWORD=root` cho PostgreSQL local trong Compose và `JWT_SIGNER_KEY` ngẫu nhiên ít nhất 64 byte. Cấu hình SMTP, Cloudinary, TMDB và khóa sandbox của cổng thanh toán khi sử dụng các chức năng tương ứng. Không commit `.env`.

   Để tạo tài khoản quản trị lần đầu, đặt `ADMIN_SETUP_ENABLED=true`, điền `ADMIN_EMAIL`, `ADMIN_USERNAME` và `ADMIN_PASSWORD` mạnh (ít nhất 12 ký tự). Tắt lại `ADMIN_SETUP_ENABLED` sau khi khởi tạo.

2. **Chuẩn bị volume và khởi chạy:**
   ```bash
   docker volume create backend_postgres_data
   docker compose up -d --build
   ```
   Compose gốc dùng volume ngoài `backend_postgres_data`; lệnh create giữ nguyên volume nếu đã tồn tại. Database mẫu không được import tự động. Chỉ chạy một trong ba file Compose trong dự án tại một thời điểm để tránh trùng cổng.

3. **Truy cập ứng dụng:**
   * **Frontend Web App**: `http://localhost:3000`
   * **Backend REST API**: `http://localhost:8080`
   * **PostgreSQL Database**: `localhost:5433` (Database: `movietheater`, User: `postgres`, Password: `root`)

   Bản Docker gọi API cùng origin qua `/api`; Nginx bỏ tiền tố này khi chuyển tới Spring Boot. `/ws/seat-updates` được chuyển tiếp cho cập nhật ghế. Frontend vẫn có thể dùng API host riêng qua build argument `VITE_API_URL`.

   Callback từ MoMo/ZaloPay cần URL HTTPS công khai do bạn cấu hình: đường dẫn qua Nginx là `/api/payment/momo/ipn` và `/api/payment/zalopay/callback`; gọi thẳng Spring Boot dùng `/payment/...`. `localhost` chỉ là ví dụ cấu hình local, cổng thanh toán bên ngoài không truy cập được địa chỉ này.

## Chạy và kiểm tra mã nguồn

Backend cần JDK 21. Từ `backend/backend`:

```powershell
./mvnw.cmd spring-boot:run
```

Chạy unit test độc lập database:

```powershell
./mvnw.cmd test '-Dtest=!Hcm26CplJsJava02Team4MovieTheaterApplicationTests'
```

Test `contextLoads` hiện dùng cấu hình datasource và chạy migration/seed khi khởi động. Khi chạy toàn bộ `./mvnw.cmd test`, phải cấu hình PostgreSQL test riêng; không trỏ vào database có dữ liệu cần giữ.

Frontend cần Node theo `frontend/frontend/.nvmrc` hoặc `engines` trong `package.json`. Từ `frontend/frontend`:

```powershell
npm ci
if (-not (Test-Path .env.development.local)) { Copy-Item .env.example .env.development.local }
npm run dev
```

Trước khi push, chạy `npm run check` (lint, TypeScript, production build). Hướng dẫn chi tiết ở [frontend/README.md](frontend/README.md).

---

## 👥 Phân hệ người dùng

* **Khách hàng (Customer)**: Xem danh sách phim đang chiếu / sắp chiếu, xem trailer, chọn suất chiếu, chọn ghế theo sơ đồ thời gian thực, đặt bắp nước combo, áp dụng mã giảm giá và thanh toán qua MoMo/ZaloPay.
* **Nhân viên (Staff)**: Bán vé và combo trực tiếp tại quầy, quét mã QR đổi quà thành viên.
* **Quản trị viên (Admin)**: Quản lý phim, phòng chiếu, bảng giá vé, lịch chiếu thông minh, quản lý người dùng, phân quyền và báo cáo thống kê doanh thu biểu đồ.
