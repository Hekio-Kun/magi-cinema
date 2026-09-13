# Biên bản xác thực audit — 11/09/2026 (cập nhật 13/09/2026)

## Đã chạy

Backend (JDK 21):

```text
mvn -q test -Dtest=!Hcm26CplJsJava02Team4MovieTheaterApplicationTests
158 tests, 0 failures, 0 errors
BUILD SUCCESS
```

Bao gồm test auth/OTP mới, giữ quyền seeder sau restart, overflow/stock/lock booking, pagination, seat stale state, callback thanh toán lặp/sai số tiền và test nghiệp vụ hiện có. `Hcm26CplJsJava02Team4MovieTheaterApplicationTests` bị loại vì `contextLoads` cần PostgreSQL và chạy migration/seed; chưa dùng database thật trong audit.

Frontend:

```text
npm run typecheck   PASS
npm run lint        PASS (0 errors, 0 warnings)
npm run build       PASS (Vite 8.0.16)
npm test            5 pass, 0 fail
```

Phần ledger thanh toán được kiểm thử riêng trong `PaymentTransactionServiceTest` và `PaymentServiceCallbackTest`; cả 6 test đều pass trong lần chạy Maven trên.

Infrastructure:

```text
docker compose -f docker-compose.yml config --quiet       PASS
docker compose -f backend/docker-compose.yml config --quiet PASS
docker compose -f frontend/docker-compose.yml config --quiet PASS
git diff --check                                        PASS (sau khi trim EOF)
```

## Chưa chạy được

Docker Engine/Desktop không kết nối được trong phiên audit, nên chưa build image, chưa chạy `nginx -t`, chưa kiểm tra WebSocket/REST qua reverse proxy và chưa chạy smoke test container. Chưa chạy gateway sandbox, SMTP, Cloudinary, Google Sheets, Gemini, PostgreSQL concurrency stress, migration rehearsal, coverage report hay browser E2E.

## Ghi chú thay đổi

Working tree có thay đổi `backend/backend/pom.xml` từ trước phiên audit; không chỉnh nội dung đó. Các file source/test/docs khác là kết quả audit hiện tại. Chưa commit, deploy hoặc thay đổi dữ liệu database.
