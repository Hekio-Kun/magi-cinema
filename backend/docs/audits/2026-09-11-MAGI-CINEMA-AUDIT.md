# Magi Cinema — Báo cáo audit và sửa lỗi 11/09/2026

Thực hiện theo `magi_cinema_audit_prompt.md`: kiểm chứng lỗi trên source hiện tại, sửa lỗi rõ ràng, ưu tiên tương thích API và giữ stack/ngôn ngữ UI. Các nhận định sơ bộ trong prompt được xem là giả thuyết cần kiểm chứng.

## Phạm vi và cách đọc

Quét tĩnh toàn bộ cây Java/TypeScript/TSX/CSS, controllers, repositories, configs, scripts và manifests; đọc sâu các luồng auth, đặt vé/giữ ghế/thanh toán, planner, promotion/membership, các màn quản trị lớn và triển khai Docker. Tại thời điểm kiểm tra, compiler backend xử lý 325 file Java; frontend có hơn 120 file source. Không tuyên bố đã chứng minh mọi dòng code hoặc mọi trạng thái runtime đều đúng.

Mỗi phát hiện chi tiết ghi **File → dòng → vấn đề → tác động → code sửa**. Phân biệt:

- **Đã sửa**: thay đổi đã có trong working tree.
- **Đề xuất**: thiết kế/code tham khảo, chưa áp dụng; đặc biệt các thay đổi cần migration dữ liệu, chính sách session hay đo hiệu năng.
- **Chưa chứng minh**: cần môi trường tích hợp/đo đạc; không coi suy đoán là lỗi đã tái hiện.

Báo cáo chi tiết:

| Phần | Nội dung |
|---|---|
| [Auth và bảo mật](2026-09-11-auth-security.md) | OTP, validation, password reset, JWT/RBAC, uploads, các nhận định bị bác bỏ |
| [Booking và nghiệp vụ backend](2026-09-11-booking-domain.md) | Tràn số, khóa booking/ghế/kho, callback, pagination, queries/index, đề xuất tách service |
| [Frontend](2026-09-11-frontend.md) | Lỗi runtime/TypeScript, auth event, payment URL, stale requests, effect cleanup, component hierarchy |
| [Hạ tầng và kiến trúc](2026-09-11-infrastructure-architecture.md) | Seeder quyền, Docker/Nginx/env, callback URL, migration, caching, API versioning, logging, testing |

## Ưu tiên xử lý

### 🔴 Critical — Đã sửa và rủi ro cần triển khai tiếp

1. **Tính giá/số lượng F&B bị tràn số**: đã thay phép nhân/cộng bằng checked arithmetic và trả validation error; ngăn tổng tiền sai và stock requirement bị bỏ qua. Chi tiết + code trong phần booking.
2. **Race khi đọc lại ghế/kho đã nằm trong persistence context**: bổ sung refresh sau khi lấy khóa; hoàn kho lấy khóa theo cùng thứ tự; lookup pending booking có khóa trước khi có thể hủy. Cần PostgreSQL concurrency test để xác nhận mọi interleaving, không xem mock test là bằng chứng toàn hệ thống không thể double-book.
3. **Password reset dùng mã 6 chữ số và chưa có throttling đầy đủ**: SecureRandom đã sửa; giới hạn thử, session reset gắn với user và chống brute-force là hạng mục bảo mật tiếp theo. Chưa thay API reset trong patch này.
4. **JWT cũ sau thay quyền/khóa tài khoản**: các quyền trong token có thể còn hiệu lực đến hết hạn ở endpoint chỉ dựa claims; cần kiểm tra trạng thái/session version hoặc revoke token tập trung. Chi tiết điều kiện và code đề xuất trong phần auth.

### 🟡 Medium — Các nhóm lỗi đã sửa

- Đăng ký/resend thiếu validation, email lưu không cùng dạng chuẩn hóa, OTP get/delete không nguyên tử; malformed JSON trước đây đi vào lỗi tổng quát.
- Quyền/mô tả STAFF và MANAGER đã chỉnh bị seed ghi đè sau restart.
- API phân trang phòng/ghế/suất-ghế không có trần kích thước hoặc guard page/size; sửa cùng metadata, giữ đủ số lượng caller sơ đồ ghế hiện tại.
- Log callback thanh toán toàn payload/chữ ký; đã bỏ payload khỏi log.
- Frontend có symbol/hàm không tồn tại, phân biệt response ví bằng trường optional, lỗi helper khi error là null và request cũ ghi đè dữ liệu mới.
- Docker không dùng API build arg; Nginx thiếu REST/WebSocket proxy; Compose phụ sai đường dẫn/thiếu env; callback fallback sai prefix; biến Google integration trong env mẫu chưa được nối vào Spring.

### 🟢 Low — Code quality và triển khai

- Tách modal sơ đồ ghế khỏi màn quản lý suất chiếu, xóa legacy modal không còn caller; dọn các warning lint còn lại trong phạm vi frontend.
- Bỏ Compose version obsolete, thêm backend .dockerignore, cập nhật hướng dẫn env/volume, phiên bản stack và lệnh check.
- Các service/component lớn còn lại có đề xuất phân tách trách nhiệm và code skeleton trong báo cáo chuyên phần. Không đổi toàn bộ kiến trúc khi chưa có regression/integration coverage tương ứng.

## Đối chiếu checklist trong tài liệu yêu cầu

| Hạng mục | Kết luận |
|---|---|
| Optional.get / NPE | Đã quét; các Optional.get tìm thấy có guard. Null đầu vào HTTP được đối chiếu @Valid, không báo NPE chỉ dựa một dòng service. Validation auth thực tế đã bổ sung. |
| Race booking/seat/stock | Có khóa từ trước nhưng còn stale persistence context, lookup pending thiếu khóa và thứ tự hoàn kho; đã sửa các điểm cụ thể. |
| OTP memory leak | ConcurrentHashMap đã có cleanup mỗi 5 phút; không đúng khi nói hoàn toàn không dọn. Vẫn mất OTP khi restart và không chia sẻ giữa instance. |
| Mix @Transactional | Có cả Jakarta và Spring, không tự động dẫn tới sai rollback; cần xem boundary/proxy/self-invocation. |
| SQL injection | Repositories dùng query parameters/Criteria. SQL nối chuỗi migration nhận tên bảng hằng và escape constraint; chưa thấy luồng nối user input vào SQL. |
| SecurityConfig / auth/me | Đối chiếu permitAll với chức năng public/callback và signature. auth/me trả claims của chính caller, signer key không có trong JWT; không gọi đó là lộ signer key. |
| Pagination | Movie/booking đã có trần; các API ghế/phòng đã thêm bounds. Contact/users và một số list khác cần paged contract mới. |
| Callback MoMo/ZaloPay | Có HMAC và so sánh chữ ký; không kết luận forge callback chỉ vì permitAll. Test signature/idempotency tích hợp còn cần bổ sung. |
| XSS / JWT localStorage | Không tìm thấy dangerouslySetInnerHTML/innerHTML/eval trong quét source. localStorage vẫn có rủi ro token theft nếu XSS xảy ra; chuyển cookie cần CSRF và kế hoạch tương thích. |
| Auth events | setAuthToken đã phát auth-change. LoginForm trước đó vốn đã notify riêng sau tải profile nên không đúng khi nói login luôn không cập nhật. |
| Effects/timers/WebSocket | Kiểm tra cleanup và stale response trên luồng chính; sửa guard ở các list/modal; không đánh đồng setState sau unmount với memory leak chắc chắn. |
| Errors / dead code | Sửa null helper, symbol thiếu, legacy modal và error feedback. Các catch có chủ ý (fallback/tác vụ best effort) phân biệt với nuốt lỗi nghiệp vụ. |
| God classes / mega components | Có phân tích, số dòng và phương án tách trong báo cáo; thực hiện extraction giới hạn ở modal ghế. |
| Imports / magic values / messages / docs | Quét và sửa trong các file liên quan; giữ public names, message và error code. Không refactor/dịch hàng loạt. |
| N+1 / eager / findAll / indexes | Có các điểm query cụ thể và code đề xuất; chưa đo SQL count/EXPLAIN để định lượng tốc độ. Dự án đã có một số index, không phải không có index. |
| Scheduled tasks / email | Có cleanup ghế và đồng bộ movie; email gửi đồng bộ. Outbox/retry và quản lý nhiều instance được đề xuất. |
| Bundle / renders / state | Có React.lazy theo route; file source lớn không đồng nghĩa cùng kích thước bundle. Chưa profiling để khẳng định thiếu memo là lỗi. |
| CORS / BCrypt / rate-limit | Wildcard request headers không tương đương wildcard origin. BCrypt cost 10 không tự động là bug; cần benchmark. Login/reset/OTP vẫn cần chống brute-force có chính sách. |
| Upload / IDOR / sensitive logs | Kiểm tra giới hạn upload, ownership ở service và logs; các vấn đề/cải tiến có điều kiện ghi trong phần auth/domain. |
| Migration/cache/versioning/state/i18n | Có kế hoạch và code; chưa thêm stack/library, chưa đổi API contract hay chạy migration trên DB người dùng. |
| Testing / health / OpenAPI / JSON logs | Có unit tests, chưa có số đo coverage; thiếu Actuator/structured logging và annotations OpenAPI được ghi đề xuất. |
| Env / Docker / gitignore / README | Backend env mẫu vốn tồn tại. Sửa cấu hình thực sự sai; Docker vốn đã multi-stage. Không xóa backup/database. |
| Dependencies | Rà manifests/imports; khai báo backend dư không đồng nghĩa package vô dụng. Chưa thực hiện kiểm toán CVE toàn bộ transitive dependencies. |

Hai lưu ý kỹ thuật tránh false positive:

- Spring hỗ trợ cả `jakarta.transaction.Transactional` và annotation của Spring; mặc định rollback trên runtime exception. Không cần thay import hàng loạt để “sửa rollback”. [Spring transaction documentation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- BCrypt work factor tối thiểu 10 vẫn được nêu cho hệ thống dùng bcrypt; lựa chọn cost phải dựa khả năng server. Không thay thuật toán/cost chỉ dựa năm 2026. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

`ApiResponse.code` kiểu int và entity User có Lombok builder + no-args constructor không tự chúng là bug. Giữ các contract đó.

## Kiểm tra và giới hạn

Kết quả cuối cùng được ghi ở [biên bản kiểm tra](2026-09-11-validation.md).

- Kiểm tra unit backend với JDK 21, không chạy `contextLoads` dùng cấu hình PostgreSQL thật.
- Lint, typecheck và production build frontend, kèm regression checks cho helper đã sửa.
- Kiểm tra cấu hình cả ba Compose bằng `config --quiet`; kiểm tra diff whitespace.
- Docker daemon chưa chạy: chưa build image, nginx runtime test hay kiểm thử WebSocket qua reverse proxy.
- Chưa thực hiện payment gateway, gửi email, import Google Sheets, migration dữ liệu, UI E2E có đăng nhập, stress test hoặc SQL profiling.

Thay đổi có sẵn trong `backend/backend/pom.xml` lúc bắt đầu (thứ tự annotation processors) được giữ nguyên; audit không sửa file này. Mã hiện ở working tree, chưa commit/deploy và không thay dữ liệu database.
