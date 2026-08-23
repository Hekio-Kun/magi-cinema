# Movie Theater Management System — Frontend

Frontend dùng React, TypeScript và Vite. Mã nguồn Vite nằm trong thư mục `frontend` bên trong repository frontend:

```text
movie-theater-management-system/
└── frontend/             # repository frontend
    ├── README.md
    └── frontend/         # ứng dụng Vite, có package.json
```

## Yêu cầu môi trường

- Node.js `20.19+`, `22.13+` hoặc `24+`.
- Khuyến nghị dùng đúng Node `22.13.0` được ghi trong `frontend/.nvmrc`.
- npm `10+`.
- Backend đang chạy và có thể truy cập từ trình duyệt.

Kiểm tra phiên bản:

```bash
node --version
npm --version
```

Nếu dùng nvm:

```bash
cd frontend
nvm install
nvm use
```

## Cài đặt lần đầu

Nếu đang đứng tại repository frontend, đi vào thư mục ứng dụng:

```bash
cd frontend
```

Nếu đang đứng tại thư mục tổng `movie-theater-management-system`, đường dẫn tương ứng là:

```bash
cd frontend/frontend
```

Cài đúng phiên bản dependency trong `package-lock.json`:

```bash
npm ci
```

Không sao chép hoặc commit `node_modules`. Sau khi pull thay đổi có liên quan đến `package.json` hoặc `package-lock.json`, hãy chạy lại `npm ci`.

## Cấu hình backend

Tạo file cấu hình development riêng từ file mẫu:

PowerShell:

```powershell
Copy-Item .env.example .env.development.local
```

Bash:

```bash
cp .env.example .env.development.local
```

Mặc định:

```env
VITE_API_URL=http://localhost:8080
```

Đổi giá trị này nếu backend chạy ở host hoặc port khác. Không thêm dấu `/` ở cuối URL.

Vite chỉ đọc biến có tiền tố `VITE_`. Sau khi sửa file môi trường, phải dừng và chạy lại dev server. File `.env.production` chỉ được dùng khi build ở production mode; `npm run dev` không đọc file đó.

## Chạy development

```bash
npm run dev
```

Ứng dụng mặc định chạy tại `http://localhost:3000`.

## Kiểm tra trước khi push

```bash
npm run check
```

Lệnh này chạy lần lượt:

```text
typecheck → production build
```

Lint được giữ thành một bước riêng để nhóm có thể xử lý dần các cảnh báo và rule React tồn đọng mà không chặn việc xác nhận ứng dụng có thể biên dịch:

```bash
npm run typecheck
npm run lint
npm run build
```

Xem thử bundle production sau khi build:

```bash
npm run preview
```

## Build bằng Docker

Từ thư mục chứa `Dockerfile`:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t movie-theater-frontend .
docker run --rm -p 3000:80 movie-theater-frontend
```

Docker dùng Node `22.13`, `npm ci` và chạy toàn bộ `npm run check` trước khi tạo image.
Nginx đã hỗ trợ refresh trực tiếp các route SPA như `/admin` hoặc `/movies/1`.

Để chạy cả PostgreSQL, backend và frontend trong workspace hiện tại, đứng tại thư mục
repository frontend (thư mục chứa `docker-compose.yml`) rồi chạy:

```bash
docker compose up --build
```

Compose build frontend với `VITE_API_URL=/api`; Nginx chuyển tiếp REST API và WebSocket
sang service backend. Cấu trúc workspace cần đặt hai repository `frontend` và `backend`
cạnh nhau như trong dự án hiện tại.

## Đồng bộ nhánh develop trên máy khác

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
cd frontend
nvm use
npm ci
npm run check
```

Xác nhận local đang đúng commit remote:

```bash
git rev-parse HEAD
git rev-parse origin/develop
```

Hai hash phải giống nhau nếu local `develop` không có commit riêng.

## Lỗi thường gặp

### `Could not read package.json` hoặc `ENOENT`

Bạn đang chạy npm sai thư mục. Thư mục hiện tại phải chứa `package.json`, tức là thư mục ứng dụng `frontend/frontend` khi nhìn từ thư mục tổng.

### Vite hoặc ESLint báo phiên bản Node không được hỗ trợ

Chạy `nvm use` trong thư mục ứng dụng hoặc cài Node `22.13+`. Node 18 và các bản Node 20 thấp hơn `20.19` không đáp ứng dependency hiện tại.

### Trang mở được nhưng API báo `ERR_CONNECTION_REFUSED`

Kiểm tra:

- Backend có đang chạy không.
- `VITE_API_URL` trong `.env.development.local` có đúng host và port không.
- Đã khởi động lại Vite sau khi sửa biến môi trường chưa.
- Backend đã cho phép CORS từ `http://localhost:3000` chưa.

### Máy cũ chạy được nhưng máy mới báo thiếu package

Xóa việc phụ thuộc vào `node_modules` cũ bằng cách chạy lại:

```bash
npm ci
```

Nếu mã nguồn import một package mới, package đó phải được thêm vào `package.json` và thay đổi tương ứng trong `package-lock.json` phải được commit cùng code.
