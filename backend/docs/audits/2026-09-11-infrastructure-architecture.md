# Audit hạ tầng, cấu hình và kiến trúc — 11/09/2026

Các đường dẫn tính từ gốc repository. Dòng tham chiếu theo source sau bản sửa. `Đã sửa` là thay đổi thực tế; `Đề xuất` là code định hướng, chưa áp dụng vào production. Mã trong đề xuất có thể cần ghép vào lớp hiện có và bổ sung test tích hợp.

### [SEVERITY: 🟡 Medium] — [Loại: Security/Bug] Quyền STAFF/MANAGER bị đặt lại khi restart — Đã sửa

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/config/ApplicationInitConfig.java` (dòng 164–233); `service/RoleService.java` trong cùng package (dòng 34–50).

**Vấn đề**: Màn hình phân quyền cho phép sửa STAFF/MANAGER nhưng seeder luôn ghi lại tập quyền mặc định mỗi lần khởi động.

**Chi tiết**: Quyền đã thu hồi, chẳng hạn BOOKING_MANAGE của STAFF, được cấp lại sau restart; mô tả vai trò cũng bị ghi đè. ADMIN/CUSTOMER/GUEST là vai trò không chỉnh được qua RoleService, nên vẫn giữ chính sách seed cũ của chúng.

**Fix**:
```java
var existingRole = roleRepository.findById(roleName);
if (existingRole.isPresent()
        && ("MANAGER".equals(roleName) || "STAFF".equals(roleName))) {
    return;
}
Role role = existingRole.orElseGet(() -> Role.builder().roleName(roleName).build());
```

**Kiểm tra**: `ApplicationInitConfigTest` kiểm tra quyền rỗng của MANAGER và tập quyền tùy chỉnh của STAFF được giữ nguyên, đồng thời lần cài mới vẫn seed đủ quyền STAFF.

### [SEVERITY: 🟡 Medium] — [Loại: Bug] Docker build bỏ qua API URL, Nginx thiếu proxy — Đã sửa

**File**: `frontend/frontend/Dockerfile` (dòng 7–10); `frontend/frontend/nginx.conf` (dòng 1–30); `docker-compose.yml` (dòng 36–41).

**Vấn đề**: Compose/README truyền `VITE_API_URL=/api` nhưng Dockerfile không khai báo ARG; bản production đọc localhost:8080 từ `.env.production`. Nginx chỉ phục vụ SPA, không có REST hay WebSocket proxy.

**Chi tiết**: Máy khách khác sẽ gọi localhost của chính máy đó. Nếu thực sự dùng `/api`, API trả HTML index thay vì JSON. URL WebSocket trong frontend đã hỗ trợ API URL tương đối; lỗi là thiếu proxy.

**Fix**:
```dockerfile
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run typecheck && npm run build
```
```nginx
# http context, default.conf của image nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
# bên trong server
resolver 127.0.0.11 valid=30s ipv6=off;
set $backend_origin http://backend:8080;
location ^~ /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass $backend_origin;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location ^~ /ws/ {
    proxy_pass $backend_origin;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600s;
}
```

Resolver là DNS của Docker; resolve khi có request giúp image vẫn khởi động được khi dùng API host riêng và chưa có service backend cùng mạng. Tiền tố `/api` chỉ nằm tại reverse proxy, không đổi contract Spring. `^~` giữ request API có đuôi `.png`/`.js` khỏi bị regex static assets bắt nhầm. Upgrade/Connection phải được chuyển rõ ràng theo [tài liệu Nginx](https://nginx.org/en/docs/http/websocket.html).

**Kiểm tra**: Các file Compose qua `docker compose ... config --quiet`. Docker daemon chưa chạy nên chưa thực thi `nginx -t`, build image hay kiểm tra WebSocket end-to-end; kiểm tra cấu hình Compose không thay thế các bước này.

### [SEVERITY: 🟡 Medium] — [Loại: Bug] Hai Compose phụ không chạy được theo hướng dẫn — Đã sửa

**File**: `backend/docker-compose.yml` (dòng 17–46); `frontend/docker-compose.yml` (dòng 24–28).

**Vấn đề**: Compose backend trỏ frontend vào `backend/frontend` không tồn tại; Compose frontend không đọc env backend nên thiếu JWT signer key. Compose backend cũng chưa đợi PostgreSQL healthy.

**Fix**:
```yaml
# backend/docker-compose.yml
frontend:
  build:
    context: ../frontend/frontend
    args:
      VITE_API_URL: /api
# backend service
# depends_on:
#   db:
#     condition: service_healthy
```
```yaml
# frontend/docker-compose.yml, backend service
env_file:
  - ../backend/.env
```

Đã thêm healthcheck PostgreSQL và cập nhật README. Không đổi tên/xóa volume database có sẵn.

### [SEVERITY: 🟡 Medium] — [Loại: Bug] Sai đường dẫn callback mặc định — Đã sửa

**File**: `backend/backend/src/main/resources/application.properties` (dòng 99); `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/controller/PaymentController.java` (dòng 18).

**Vấn đề**: Giá trị fallback ZaloPay trỏ localhost:8080/**api**/payment trong khi Spring map `/payment`.

**Fix**:
```properties
zalopay.callback-url=${ZALOPAY_CALLBACK_URL:http://localhost:8080/payment/zalopay/callback}
```

Đây chỉ là sửa đường dẫn local. Callback thật cần HTTPS công khai. Đi qua Nginx dùng `/api/payment/zalopay/callback`; đi thẳng Spring dùng `/payment/zalopay/callback`. Biến env đặt rỗng vẫn ghi đè fallback: người vận hành cần điền URL; không xem giá trị local là callback hoạt động được với cổng thanh toán.

### [SEVERITY: 🟡 Medium] — [Loại: Bug] Các biến trong env mẫu không được nối vào Spring — Đã sửa một phần

**File**: `backend/backend/src/main/resources/application.properties` (dòng 129–135); `backend/.env.example` (dòng cuối); `service/UserService.java` (dòng 104–112); `service/ContactService.java` (dòng 43–46) trong package backend.

**Vấn đề**: `GOOGLE_SHEETS_API_KEY`, `STAFF_IMPORT_SPREADSHEET_ID`, `STAFF_IMPORT_RANGE`, `GEMINI_API_KEY` có trong mẫu nhưng @Value đọc `app.*`; chưa có phép ánh xạ giữa hai tên.

**Fix**:
```properties
app.google-sheets.api-key=${GOOGLE_SHEETS_API_KEY:}
app.google-sheets.staff-import.spreadsheet-id=${STAFF_IMPORT_SPREADSHEET_ID:}
app.google-sheets.staff-import.range=${STAFF_IMPORT_RANGE:Câu trả lời biểu mẫu 1!A:K}
app.gemini.api-key=${GEMINI_API_KEY:}
```

Mẫu `STAFF_IMPORT_RANGE` đã có giá trị thay vì chuỗi rỗng. Không gọi Google Sheets/Gemini trong audit. ContactService vẫn có endpoint model hardcode ở dòng 46; wiring env không xác nhận model/capacity/API key hoạt động. Cần cấu hình `APP_GEMINI_MODEL_URL` cho model đã được nhóm chọn và kiểm chứng trước khi sử dụng tính năng này.

### [SEVERITY: 🟡 Medium] — [Loại: CodeQuality] Migration và seed chạy lại mỗi startup — Đề xuất

**File**: `backend/backend/src/main/resources/application.properties` (dòng 18–21); `config/ApplicationInitConfig.java` (dòng 69–92); `config/PromotionSchemaMigrationConfig.java` (dòng 16–90); `config/MovieSchemaMigrationConfig.java` (dòng 20–43).

**Vấn đề**: `ddl-auto=update` đi kèm nhiều ApplicationRunner DDL/DML không có lịch sử phiên bản, có cả drop constraint/column và cập nhật hàng loạt.

**Chi tiết**: Rủi ro thật là chạy lặp, thứ tự giữa runner, nhiều instance chạy DDL cùng lúc, schema drift và thao tác chuyển dữ liệu không theo dõi được. Không kết luận sai rằng Hibernate `update` tự động drop mọi cột cũ: thao tác drop cụ thể đang nằm trong custom runner. Bật `validate` một mình chưa vô hiệu hóa các runner này.

**Fix đề xuất, chỉ áp dụng sau baseline và rehearsal trên bản sao DB**:
```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```
```properties
# application-prod.properties sau khi có migration đầy đủ
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=false
```
```java
// Chỉ bọc runner legacy trong giai đoạn chuyển tiếp; giữ mặc định tương thích.
@ConditionalOnProperty(name = "app.schema.legacy-migrations-enabled",
        havingValue = "true", matchIfMissing = true)
@Configuration
class PromotionSchemaMigrationConfig { /* nội dung hiện tại */ }
```

Khi baseline đã được kiểm tra, tắt `app.schema.legacy-migrations-enabled` trên cả các config và các nhánh migration trong ApplicationInitConfig; chuyển từng DDL/DML hiện tại sang V*.sql, giữ seed roles/admin riêng. Không bật auto-baseline lên DB không xác định. [Hướng dẫn database initialization của Spring Boot](https://docs.spring.io/spring-boot/3.3/how-to/data-initialization.html) mô tả Flyway/Liquibase và schema initialization.

Tách trách nhiệm seeder theo cấu trúc:
```java
// Các tên lớp dưới là thiết kế đề xuất, chưa thêm vào source.
@Bean
ApplicationRunner applicationRunner(SystemRoleSeeder roles, AdminUserSeeder admin) {
    return args -> {
        roles.seedMissingRoles();
        admin.seedIfEnabled();
    };
}
```

### [SEVERITY: 🟡 Medium] — [Loại: Performance] HTTP integration chặn thread, có request chưa timeout — Đề xuất

**File**: `service/TmdbService.java` (dòng 42, 87–109); `service/UserService.java` (dòng 774–829); `service/ContactService.java` (dòng 69–71, 120–130, 217–226) trong package backend.

**Vấn đề**: TMDB và Google Sheets tạo RestTemplate mặc định, chưa đặt connect/read timeout. Contact moderation có timeout từng request, nhưng thực hiện remote call bên trong transaction; có thể gọi ba lần cho một message. Reply contact gửi SMTP trong transaction.

**Fix timeout cụ thể**:
```java
@Bean
RestTemplate externalRestTemplate() {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(5_000);
    factory.setReadTimeout(10_000);
    return new RestTemplate(factory);
}
```

Inject bean vào TMDB/Sheets; không tạo `new RestTemplate()` trong từng method. Tách transaction bằng bean khác, tránh self-invocation:
```java
public ContactSubmitResponse validateAndSubmit(ContactSubmitRequest request) {
    var result = moderationService.moderate(request.getSubject(), request.getMessage());
    return contactWriter.persist(request, result); // @Transactional trên ContactWriter
}
```

Với email sau booking commit, dùng outbox có trạng thái/retry, không chỉ gắn `@Async` vào method nhận JPA entity rồi truy cập LAZY ngoài session. Mẫu schema:
```sql
CREATE TABLE email_outbox (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  event_key varchar(100) NOT NULL UNIQUE,
  payload text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at timestamp,
  attempts integer NOT NULL DEFAULT 0
);
```

Chưa benchmark latency, chưa đo connection-pool starvation, chưa sửa transaction semantics của reply/email trong đợt này.

### [SEVERITY: 🟡 Medium] — [Loại: Bug/Security] Contact thiếu giới hạn độ dài, log lỗi integration quá chi tiết — Đề xuất

**File**: `dto/contact/ContactSubmitRequest.java` (dòng 15–26); `entity/CustomerContact.java` (dòng 25–32); `service/ContactService.java` (dòng 180, 218, 226, 300, 315).

**Vấn đề**: Tên/email/subject không có @Size dù cột mặc định varchar(255). Nội dung quá dài có thể thất bại lúc lưu DB. URL Gemini chứa key trong query, trong khi catch ghi `ex.getMessage()`/response body; một số lỗi HTTP có thể chứa URL hay nội dung đầu vào. Không khẳng định log hiện tại đã lộ secret vì audit không đọc log production.

**Fix**:
```java
@NotBlank
@Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự.")
String senderName;
@NotBlank @Email @Size(max = 255)
String senderEmail;
@NotBlank @Size(max = 255)
String subject;
```
```java
log.warn("Gemini API returned status {}", response.statusCode());
log.warn("Gemini AI check failed; using dictionary fallback ({})",
        ex.getClass().getSimpleName());
```

Chuỗi điều kiện `text.contains("VI phẠm")` ở ContactService:265 không khớp kết quả đã upper-case. Nếu sửa parser, dùng chỉ hai giá trị rõ ràng và fallback khi model trả văn bản khác; không đánh đồng response khác VIOLATION với SAFE:
```java
return switch (text.strip().toUpperCase(Locale.ROOT)) {
    case "SAFE" -> safeResult(message);
    case "VIOLATION" -> violationResult(subject, message);
    default -> fallbackDictionaryCheck(subject, message);
};
```

`safeResult`/`violationResult` là các method cần extract từ nhánh hiện tại. Dictionary đang dùng substring có thể bắt nhầm từ tiếng Việt; cần bộ dữ liệu kiểm duyệt được nhóm duyệt trước khi đổi luật.

### [SEVERITY: 🟡 Medium] — [Loại: Performance] List không phân trang và lặp quét genre — Đề xuất

**File**: `service/ContactService.java` (dòng 108–110); `repository/CustomerContactRepository.java`; `service/TmdbService.java` (dòng 239–254).

**Vấn đề**: Contact admin tải toàn bộ lịch sử. Mapping genre TMDB có thể gọi `genreRepository.findAll()` cho từng genre không exact match.

**Fix giữ API cũ trong giai đoạn chuyển tiếp**:
```java
// Endpoint mới /contact/admin/page, giữ /admin/list cho caller hiện tại.
Page<CustomerContact> page = contactRepository.findAll(
    PageRequest.of(Math.max(0, pageNumber), Math.min(Math.max(size, 1), 100),
        Sort.by(Sort.Direction.DESC, "createdAt")));
```
```java
// Tạo index tên chuẩn hóa một lần cho một lần import, rồi dùng lại khi mapping.
Map<String, Genre> knownGenres = genreRepository.findAll().stream()
    .filter(g -> g.getName() != null)
    .collect(Collectors.toMap(g -> normalizeGenreName(g.getName()),
        Function.identity(), (first, duplicate) -> first));
```

Bổ sung newly-created genre vào map trong cùng request. Dùng EXPLAIN (ANALYZE, BUFFERS) trên DB test có dữ liệu đại diện trước khi chốt index; chưa thực hiện phép đo này trong audit.

### [SEVERITY: 🟢 Low] — [Loại: QuickFix] Compose version, README và Docker context — Đã sửa

**File**: `docker-compose.yml` (dòng 1); `backend/docker-compose.yml` (dòng 1); `backend/backend/.dockerignore`; `README.md`; `frontend/README.md`.

**Vấn đề**: Compose có `version: '3.8'` dư thừa; README sai phiên bản React, thiếu tạo env/volume, mô tả `check` và Docker build không khớp scripts. Backend thiếu .dockerignore.

**Fix**:
```yaml
services:
  # bỏ dòng version ở top-level
```
```dockerignore
target
.git
.idea
.env
.env.*
*.log
```
```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
docker volume create backend_postgres_data
docker compose up -d --build
```

Top-level version hiện chỉ có ý nghĩa tương thích và phát cảnh báo obsolete theo [Docker Compose documentation](https://docs.docker.com/reference/compose-file/version-and-name/). Backend và frontend vốn đã multi-stage, đã tách dependency layer; không báo sai là thiếu multi-stage. Volume ngoài được giữ để tránh vô tình chuyển sang database rỗng.

### [SEVERITY: 🟢 Low] — [Loại: CodeQuality] Monitoring, logging, tài liệu API và test coverage — Đề xuất

**File**: `backend/backend/pom.xml` (dòng 41–147); `backend/backend/src/main/resources/application.properties` (dòng 19); controllers backend.

**Vấn đề**: Có SpringDoc dependency nhưng không thấy @Operation/@Schema trong quét source; chưa có Actuator/JaCoCo, SQL log bật mặc định. Không có số liệu coverage để kết luận phần trăm.

**Fix gợi ý theo Boot 3.3 hiện tại**:
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```
```properties
# application-prod.properties
spring.jpa.show-sql=false
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=never
```

Bổ sung rule cụ thể cho `/actuator/health`, không permitAll `/actuator/**`. Không dùng thuộc tính structured logging của Boot mới hơn như thể Boot 3.3 đã hỗ trợ sẵn; với stack này chọn JSON encoder tương thích và kiểm tra dependency riêng. Định dạng đề xuất:
```json
{"timestamp":"2026-09-11T10:00:00Z","level":"INFO","event":"booking.paid","bookingId":123,"requestId":"..."}
```
```java
@Operation(summary = "Xem thông tin đặt vé của tài khoản hiện tại")
@GetMapping("/{bookingId}")
// Giữ chữ ký method + ownership check đang có.
```

Test strategy: unit cho tính tiền/khuyến mãi/planner; MockMvc cho auth và validation; PostgreSQL test riêng cho concurrent hold/book/pay/cancel và migration; frontend component test cho auth navigation, stale response, payment union; E2E cho một lượt chọn ghế → thanh toán sandbox. Cần test idempotency callback nhận lặp và callback đến cùng lúc với hủy vé. Audit chưa thực hiện những kiểm thử tích hợp này.

### [SEVERITY: 🟢 Low] — [Loại: CodeQuality] Dependency, naming, comment và API contract — Kết quả rà soát / đề xuất

**File**: `backend/backend/pom.xml` (dòng 42–45, 90–100); `frontend/frontend/package.json`; `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/dto/common/ApiResponse.java`.

**Vấn đề**: `spring-boot-starter` và `spring-web` khai báo trực tiếp dù starter-web đã kéo chúng. Đây là khai báo dư, chưa phải dependency hoàn toàn không được sử dụng. Không xóa pom vì đã có thay đổi của người dùng trước audit. Các package frontend chính đều có import/cấu hình sử dụng; chưa có bằng chứng đủ để xóa dependency.

**Fix đề xuất**: Giữ một khai báo starter-web và bỏ hai khai báo dư sau khi kiểm tra dependency tree:
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Không đổi `ApiResponse.code` từ int sang Integer chỉ vì giá trị 0: đó là lựa chọn contract, không phải bug. Không đổi tên package/public DTO/property hàng loạt, không dịch lại các message tiếng Việt/English trong một patch audit. Khi sửa file cụ thể, dùng explicit imports và Javadoc cho invariant thực tế, ví dụ:
```java
/** Xác nhận thanh toán một lần dưới khóa booking; số tiền phải khớp đơn. */
```

`.gitignore` đã bỏ qua `.env`, node_modules, target, log, IDE. Có `database_backup.sql` và SQL mẫu được track; cần quy trình bảo đảm dữ liệu mẫu đã ẩn danh, không kết luận file đang chứa secret khi chưa kiểm toán dữ liệu. Không xóa backup hay lịch sử Git trong đợt này.

## Các đề xuất kiến trúc có điều kiện, không áp dụng tự động

**Caching**: Chưa có @Cacheable. Không cache ghế HELD/BOOKED hoặc quyền đang thay đổi theo TTL tùy tiện. Bắt đầu bằng giá vé với invalidation sau write; trước khi thêm Caffeine/Redis cần đo hit rate và mức trễ chấp nhận được.
```java
@Cacheable(cacheNames = "ticketPricing", key = "'current'")
public TicketPriceConfigResponse getConfig() { /* query hiện tại */ }
@CacheEvict(cacheNames = "ticketPricing", allEntries = true)
@Transactional
public TicketPriceConfigResponse updateConfig(TicketPriceConfigRequest request) { /* update */ }
```
Đây là skeleton, cần cấu hình cache manager và kiểm thử invalidation/transaction rollback trước khi dùng.

**Versioning**: `/api` tại Nginx đã đủ phân tách SPA/API; thiếu `/api/v1` chưa tự nó là bug. Nếu ra contract mới, giữ route cũ trong khoảng migration, để proxy hiện tại tiếp tục sở hữu tiền tố `/api`:
```java
@RequestMapping({"/movies", "/v1/movies"})
```
Client gọi `/api/v1/movies`, proxy chuyển thành `/v1/movies`. Cập nhật SecurityConfig, docs và tests đồng thời khi thực hiện versioning.

**State frontend**: Không có Redux/Zustand không chứng minh prop drilling sai. Hook useLatestRequest đã được thêm cho stale request; tiếp theo tách server state khỏi form state bằng custom hook, dùng reducer cho wizard nhiều bước trước khi cân nhắc thư viện mới.
```tsx
type PlannerAction =
  | { type: "SELECT_MOVIES"; ids: number[] }
  | { type: "RESET_PREVIEW" };
```

**i18n**: UI tiếng Việt là yêu cầu hiện hành, không phải lỗi. Có thể tạo dictionary nội bộ trước khi thêm framework:
```ts
export const vi = {
  booking: { loading: "Đang tải ghế…", expired: "Phiên chọn ghế đã hết hạn." },
};
```
Không thay đổi toàn bộ message backend hoặc error code để triển khai i18n trong patch này.
