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
├── frontend/           # Ứng dụng giao diện người dùng (React 18 + TypeScript + Vite)
│   └── frontend/       # Giao diện Khách hàng, Nhân viên và Admin Dashboard
│
├── docker-compose.yml  # Đóng gói và chạy đồng bộ Database, Backend & Frontend
└── database_backup.sql # Dữ liệu khởi tạo mẫu
```

---

## 🛠️ Công nghệ sử dụng

### Backend
* **Ngôn ngữ & Framework**: Java 17/21, Spring Boot 3
* **Bảo mật & Xác thực**: Spring Security, JWT (JSON Web Tokens)
* **Cơ sở dữ liệu**: PostgreSQL, Spring Data JPA, Hibernate
* **Realtime**: WebSocket (Broadcast trạng thái chọn ghế theo thời gian thực)
* **Tích hợp bên thứ ba**: Cổng thanh toán MoMo & ZaloPay, Cloudinary (Lưu trữ ảnh), TMDB API

### Frontend
* **Core**: React 18, TypeScript, Vite
* **Styling**: Tailwind CSS, Shadcn UI / Radix Primitives, Lucide Icons
* **Routing & State**: React Router DOM, Axios HTTP Client

### DevOps
* **Docker & Docker Compose**
* **Nginx Web Server**

---

## 🚀 Hướng dẫn khởi chạy nhanh bằng Docker

1. **Khởi chạy toàn bộ hệ thống (DB, Backend, Frontend):**
   ```bash
   docker-compose up -d --build
   ```

2. **Truy cập ứng dụng:**
   * **Frontend Web App**: `http://localhost:3000`
   * **Backend REST API**: `http://localhost:8080`
   * **PostgreSQL Database**: `localhost:5433` (Database: `movietheater`, User: `postgres`, Password: `root`)

---

## 👥 Phân hệ người dùng

* **Khách hàng (Customer)**: Xem danh sách phim đang chiếu / sắp chiếu, xem trailer, chọn suất chiếu, chọn ghế theo sơ đồ thời gian thực, đặt bắp nước combo, áp dụng mã giảm giá và thanh toán qua MoMo/ZaloPay.
* **Nhân viên (Staff)**: Bán vé và combo trực tiếp tại quầy, quét mã QR đổi quà thành viên.
* **Quản trị viên (Admin)**: Quản lý phim, phòng chiếu, bảng giá vé, lịch chiếu thông minh, quản lý người dùng, phân quyền và báo cáo thống kê doanh thu biểu đồ.
