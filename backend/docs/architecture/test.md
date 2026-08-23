\# Role



Bạn đóng vai trò đồng thời là:



\- Senior Software Architect

\- Senior QA/Automation Engineer

\- Security Reviewer

\- Database Reviewer

\- Cinema Domain Analyst



Hãy audit và kiểm thử toàn bộ dự án quản lý rạp chiếu phim theo kiến trúc \*\*monolithic\*\* tại:



```text

\[PROJECT\_PATH]

```



Bối cảnh nghiệp vụ chính tại Việt Nam, nhưng cần so sánh thêm với practice của các hệ thống rạp chiếu phim quốc tế.



\---



\# Objective



Xác định dự án hiện tại:



1\. Có build, test và startup thành công hay không.

2\. Có bug runtime, bug nghiệp vụ, bug bảo mật hoặc lỗi dữ liệu hay không.

3\. Có bám sát business rule của hệ thống rạp chiếu phim thực tế hay không.

4\. Có áp dụng đúng pattern cho kiến trúc monolithic hay đang đưa vào complexity không cần thiết.

5\. Có vấn đề về concurrency trong đặt vé, giữ ghế và thanh toán hay không.

6\. Có drift giữa code, database, API, frontend và tài liệu hay không.

7\. Có đủ điều kiện demo/deploy hay chưa.

8\. Những vấn đề nào là P0/P1 cần sửa trước, vấn đề nào chỉ nên để backlog.



Hãy thực hiện audit thực tế, không chỉ lập kế hoạch.



\---



\# Important Rules



\## Current code is the source of truth



\- Dùng code hiện tại làm nguồn sự thật chính.

\- Tài liệu thể hiện intended behavior nhưng không được mặc định tài liệu luôn đúng.

\- Nếu code, database, API và tài liệu khác nhau, phải ghi nhận contract drift.

\- Không kết luận tính năng hoạt động chỉ vì thấy method hoặc endpoint tồn tại.

\- Phải phân biệt rõ:



```text

Confirmed: đã tái hiện bằng test/runtime

Code-evidenced: có bằng chứng trực tiếp trong code nhưng chưa chạy được

Hypothesis: nghi ngờ, cần thêm runtime evidence

Blocked: không thể kiểm tra vì thiếu dependency/configuration

```



\## Read-only audit first



\- Không sửa production code trong lần audit này.

\- Không tự refactor.

\- Không commit, push, reset hoặc xóa file.

\- Không reset database chứa dữ liệu của người dùng.

\- Không gửi email thật, charge payment thật hoặc gọi external service có chi phí.

\- Có thể chạy build/test và tạo test artifacts.

\- Chỉ được tạo tài liệu audit trong `docs/audits/` nếu cần.

\- Sau khi hoàn thành report, chờ người dùng chọn issue cần fix.



\## Monolithic architecture boundary



Đây là kiến trúc monolithic. Không được đánh giá dự án như microservices.



Không coi các yếu tố sau là bắt buộc:



\- API Gateway

\- Service discovery

\- Kafka giữa các module nội bộ

\- Distributed transaction giữa các module cùng database

\- Outbox cho mọi thay đổi nội bộ

\- Mỗi domain một database riêng



Đối với monolith:



\- Ưu tiên transaction ACID trong cùng database.

\- Transaction boundary nên nằm ở application/service layer.

\- Dùng database constraint để bảo vệ invariant.

\- Có thể dùng modular monolith hoặc layered architecture.

\- Chỉ đề xuất message queue/outbox khi giao tiếp với external system hoặc có nhu cầu async thực tế.

\- Không đề xuất distributed lock nếu application chắc chắn chỉ chạy một instance; tuy nhiên scheduler và operation vẫn phải idempotent.

\- Nếu application có thể chạy nhiều replica, phải kiểm tra multi-instance scheduler và concurrency.



\---



\# Phase 1 — Project Discovery



Trước khi chạy test, hãy xác định:



\- Ngôn ngữ và framework.

\- Build tool và package manager.

\- Database và migration tool.

\- Kiến trúc package/module.

\- Frontend nằm chung hay tách thư mục.

\- Authentication mechanism.

\- Scheduled jobs.

\- External integrations như TMDB, SMTP, cloud image, payment.

\- Test framework.

\- Docker/Docker Compose.

\- Environment variables cần thiết.

\- Ports và application profiles.



Tạo architecture summary:



```text

UI/Frontend

&#x20;   ↓

Controller/API

&#x20;   ↓

Application/Service

&#x20;   ↓

Domain model

&#x20;   ↓

Repository

&#x20;   ↓

Relational database

```



Nếu cấu trúc thực tế khác, mô tả đúng cấu trúc đã phát hiện.



Kiểm tra xem monolith đang là:



\- Layered monolith;

\- Modular monolith;

\- Package-by-feature;

\- Package-by-layer;

\- Hoặc mixed architecture.



Không đánh giá một style là sai chỉ vì khác style khác. Chỉ báo lỗi khi boundary không rõ, phụ thuộc vòng, business logic phân tán hoặc transaction không an toàn.



\---



\# Phase 2 — Build and Static Verification



Thực hiện:



1\. Kiểm tra working tree.

2\. Xác định lệnh build chính xác từ project files.

3\. Compile toàn bộ backend.

4\. Chạy unit tests.

5\. Build frontend nếu có.

6\. Chạy lint/type-check nếu được cấu hình.

7\. Kiểm tra dependency/configuration errors.

8\. Kiểm tra generated code như mapper, JPA metamodel hoặc ORM artifacts.

9\. Kiểm tra hard-coded secret.

10\. Kiểm tra TODO/FIXME trong core business flow.



Ghi lại cho từng command:



| Command | Result | Duration | Evidence/Failure |

|---|---|---:|---|



Không được ghi “build passed” nếu chỉ compile một module hoặc dùng skip tests. Phải nói rõ verification depth:



```text

Compile-only

Unit-test verified

Integration-test verified

Startup verified

End-to-end verified

```



\---



\# Phase 3 — Database Audit



Kiểm tra:



\- Schema có khớp entity/model không.

\- Migration chạy được trên fresh database.

\- Migration chạy được trên database đã có dữ liệu.

\- Foreign key, unique constraint và check constraint.

\- Index cho query thường dùng.

\- Enum được lưu bằng string hay ordinal.

\- Nullable/default values.

\- Timestamp và timezone.

\- Soft delete và audit fields.

\- Duplicate seed data.

\- N+1 query.

\- Cascade/orphan removal.

\- Transaction rollback.

\- Optimistic/pessimistic locking.

\- Lost update.

\- Dirty read hoặc partial update.

\- Race condition khi tạo showtime/booking/seat hold.

\- Dữ liệu lịch sử có bị hard-delete không.



Đặc biệt kiểm tra các invariant:



```text

Cinema room name unique trong phạm vi cinema cluster

Seat label unique trong phạm vi room

Showtime không overlap trong cùng room

Một physical seat chỉ có một inventory record cho một showtime

Một seat không được bán cho hai booking

Booking confirmation và seat status phải nhất quán

Ticket code phải unique

Payment transaction reference phải unique

TMDB movie ID phải unique nếu được import

```



Không được kết luận các mức như “phòng thường tối đa 100 ghế” là industry rule nếu không có regulation hoặc project configuration rõ ràng.



\---



\# Phase 4 — Runtime and Startup Verification



Nếu môi trường cho phép:



1\. Khởi động database disposable/test.

2\. Chạy migration.

3\. Khởi động monolithic application.

4\. Kiểm tra health/startup logs.

5\. Kiểm tra frontend.

6\. Chạy API smoke test.

7\. Kiểm tra shutdown/restart.

8\. Kiểm tra startup với database cũ.

9\. Kiểm tra scheduler configuration.

10\. Kiểm tra external integration failure behavior.



Không dùng database production.



Nếu startup thất bại, xác định chính xác tầng lỗi:



```text

Compile

Dependency injection

Configuration

Migration/schema

Seed data

External integration

Port/process conflict

Frontend proxy

```



\---



\# Phase 5 — End-to-End Business Flow Testing



\## A. Authentication and User Management



Kiểm tra:



\- Registration.

\- Account activation.

\- Login/logout.

\- Access token expiry.

\- Refresh token nếu có.

\- Forgot/reset password.

\- Employee account creation.

\- Role assignment.

\- Disabled/locked account.

\- Brute-force protection.

\- Role-based access.

\- Direct-ID enumeration.

\- Mass assignment.

\- PII exposure.

\- ADMIN, EMPLOYEE và CUSTOMER permissions.

\- Frontend route guard và backend authorization có đồng nhất không.



Không chấp nhận việc chỉ ẩn button ở frontend nhưng backend endpoint vẫn truy cập được.



\## B. Movie Lifecycle



Kiểm tra flow hiện tại theo code và tài liệu:



```text

DRAFT

→ PENDING\_REVIEW

→ APPROVED/COMING\_SOON

→ NOW\_SHOWING

→ ENDED

```



Nếu project dùng state khác, lập transition matrix thực tế.



Kiểm tra:



\- Employee tạo movie.

\- Admin tạo movie.

\- Submit review.

\- Approve/reject/rework.

\- Self-approval policy.

\- Readiness validation.

\- Release date.

\- End date.

\- Suspend/reinstate.

\- Public/internal visibility.

\- Customer không xem được draft/rejected/internal movie.

\- Update không ghi đè field bằng null.

\- Update collection không xóa dữ liệu ngoài ý muốn.

\- Audit history.

\- Scheduler release/end.

\- Scheduler timezone.

\- Scheduler idempotency.

\- Một record lỗi không làm toàn batch rollback.



\## C. TMDB Import



Nếu project có TMDB:



\- Search/browse movie.

\- Preview phải read-only.

\- Import chỉ xảy ra sau confirm.

\- Không tạo duplicate theo `tmdbId`.

\- Trailer, poster, backdrop và still mapping.

\- Genre mapping.

\- Production company mapping.

\- Cast/crew mapping.

\- Vietnam theatrical release date.

\- Age-rating mapping.

\- Original language và translations.

\- Provenance của dữ liệu.

\- Manual override không bị re-sync ghi đè.

\- Timeout/rate-limit/cache.

\- Secret không hard-code.

\- Không silently drop unmapped metadata.



Dùng tài liệu TMDB chính thức làm nguồn đối chiếu.



\## D. Cinema Cluster and Cinema Room



Kiểm tra:



\- Cluster CRUD.

\- Approval/activation nếu có.

\- Room phải thuộc cluster hợp lệ.

\- Không tạo room trong cluster inactive nếu policy cấm.

\- Room name unique trong cùng cluster.

\- Cùng room name ở cluster khác phải được phép.

\- Room type.

\- Number of rows.

\- Seats per row.

\- Total capacity.

\- Standard/VIP/Couple seat configuration.

\- Seat layout generation.

\- Row naming vượt A–Z.

\- Aisle/gap.

\- Maintenance/closed room.

\- Không hard-code tỷ lệ Standard/VIP/Couple theo room type nếu admin cần cấu hình.

\- Không coi tỷ lệ seat type là universal industry regulation.



\## E. Seat Model



Kiểm tra:



\- Seat label.

\- Row/column coordinates.

\- Seat type.

\- Physical seat versus sellable unit.

\- Couple/Sofa/Sweetbox relationship.

\- Ghế đôi có group/pair identity rõ ràng.

\- Couple group được chọn/bán all-or-nothing nếu business policy yêu cầu.

\- Ghế disabled/maintenance không được bán.

\- Accessible/companion seats nếu project hỗ trợ.

\- Thay layout không làm hỏng showtime đã mở bán.



\## F. Showtime Management



Kiểm tra:



\- Create/read/update/cancel/complete showtime.

\- Movie eligibility.

\- Room/cluster status.

\- Screening format compatibility.

\- Start/end datetime.

\- Movie runtime.

\- Trailer/advertisement buffer.

\- Cleaning/turnaround buffer.

\- Overlap trong cùng room.

\- Concurrent create overlap.

\- Showtime qua nửa đêm.

\- Timezone.

\- Base price.

\- Seat-type price.

\- Không dùng hard-coded price.

\- Update/cancel sau khi đã phát sinh booking.

\- Public chỉ thấy showtime bookable.



\## G. Booking and Seat Inventory



Kiểm tra:



\- Materialize inventory khi tạo showtime.

\- GET seat availability phải read-only.

\- Atomic seat hold.

\- Hold ownership.

\- Hold token.

\- TTL/expiry.

\- Idempotency key.

\- Release hold.

\- Confirm booking.

\- Concurrent hold cùng seat.

\- Partial selection rollback.

\- Couple seat atomicity.

\- Booking expiry.

\- Seat status consistency.

\- Counters không âm/vượt capacity.

\- Không double-book.

\- Retry request không tạo booking trùng.

\- User không confirm/release hold của người khác.



Concurrency test phải dùng transaction/thread thật. Không chứng minh concurrency bằng hai lời gọi tuần tự.



\## H. Payment, Promotion and Ticketing



Nếu project có:



\- Payment initiation.

\- Payment callback/webhook.

\- Callback signature.

\- Duplicate callback.

\- Idempotent confirmation.

\- Failed/expired payment.

\- Booking-payment consistency.

\- Price snapshot.

\- Promotion validity window.

\- Promotion movie/showtime/cluster applicability.

\- Usage limit.

\- User usage limit.

\- Stackable/non-stackable policy.

\- Ticket generation chỉ sau payment/confirmation hợp lệ.

\- Unique ticket/QR code.

\- Ticket check-in.

\- Duplicate check-in.

\- Cancellation/refund state.



Không gọi payment provider thật; dùng mock/sandbox.



\## I. Notification



Kiểm tra:



\- Confirmation email.

\- Activation email.

\- Retry.

\- Duplicate notification.

\- Template rendering.

\- Không làm business transaction thất bại chỉ vì email tạm lỗi, trừ khi contract yêu cầu.

\- Không gửi email thật trong audit.

\- Không log OTP/token/password.



\## J. Frontend



Kiểm tra:



\- Route guard.

\- Loading/error/empty states.

\- Form validation.

\- API response mapping.

\- Role-based actions.

\- Pagination/search/filter.

\- Timezone display.

\- Currency formatting.

\- Null/undefined handling.

\- Refresh state.

\- Duplicate submit.

\- Disabled button trong pending request.

\- Toast/modal feedback.

\- Customer không thấy admin-only fields.

\- UI không che giấu backend error thành empty state.

\- Dark/light mode nếu project hỗ trợ.



\---



\# Phase 6 — Industry Practice Validation



Tìm kiếm thông tin hiện hành trên internet và ưu tiên:



1\. Quy định pháp luật/tiêu chuẩn chính thức tại Việt Nam.

2\. Official documentation của framework/vendor.

3\. Official policies hoặc public flows của các chuỗi rạp.

4\. OWASP cho security.

5\. TMDB official API documentation.

6\. Nguồn quốc tế có uy tín cho booking/payment/concurrency.



Khi so sánh industry practice, bắt buộc phân biệt:



| Classification | Meaning |

|---|---|

| Regulation | Quy định pháp luật/tiêu chuẩn bắt buộc |

| Common industry practice | Cách nhiều doanh nghiệp thường áp dụng |

| Recommended design | Khuyến nghị kỹ thuật |

| Project decision | Quy tắc riêng do dự án lựa chọn |



Không được:



\- Biến practice của một chuỗi rạp thành quy định toàn ngành.

\- Khẳng định tỷ lệ Standard/VIP/Couple cố định nếu không có nguồn.

\- Khẳng định số hàng/số ghế tối đa chỉ dựa trên room type.

\- Dùng blog không rõ nguồn để kết luận pháp lý.

\- Đề xuất microservice pattern chỉ vì hệ thống rạp lớn thường dùng microservices.



Mỗi claim có thể thay đổi theo thời gian phải có link nguồn và ngày truy cập.



\---



\# Phase 7 — Monolithic Architecture Review



Đánh giá các điểm sau:



\## Layering and modularity



\- Controller có chứa business logic không.

\- Service có transaction boundary rõ không.

\- Repository có bị gọi trực tiếp từ UI/controller không.

\- Domain module có phụ thuộc vòng không.

\- Shared/common package có trở thành “god package” không.

\- Entity có bị trả trực tiếp qua public API không.

\- DTO/request/response có tách biệt không.

\- Mapper có null semantics đúng không.

\- Validation nằm đúng tầng không.



\## Transaction design



Trong cùng monolith và database:



\- Ưu tiên một local transaction cho booking + inventory nếu cùng aggregate/bounded module.

\- Không đề xuất saga cho operation có thể xử lý bằng ACID transaction.

\- External payment/email có thể cần idempotency/outbox/retry.

\- Audit quan trọng phải commit cùng business change hoặc có cơ chế bảo đảm phù hợp.



\## Maintainability



\- God service.

\- God controller.

\- Duplicate business rules.

\- Hard-coded status/price/role.

\- Magic strings.

\- Raw runtime exceptions.

\- Inconsistent error envelope.

\- Missing domain error code.

\- Excessive bidirectional JPA mappings.

\- N+1.

\- Lazy initialization errors.

\- Testability của `Clock`, payment client và external API client.



\---



\# Severity and Priority Model



Phân loại mỗi finding:



| Severity | Meaning |

|---|---|

| P0 / Critical | Security breach, data loss, double booking, payment corruption, public data leak, main flow blocked |

| P1 / High | Core business rule sai, invalid lifecycle, overlap, broken authorization, frequent runtime failure |

| P2 / Medium | Edge case, maintainability risk, incomplete validation, degraded UX |

| P3 / Low | Cosmetic, cleanup, documentation hoặc minor optimization |



Ghi thêm:



```text

Confidence: Confirmed / Code-evidenced / Hypothesis

Scope: Current sprint / Next sprint / Backlog

Effort: S / M / L / XL

```



Không đánh đồng `Priority::High` hiện có trên board với severity thực tế. Tự đánh giá lại dựa trên impact và evidence.



\---



\# Required Deliverables



Tạo báo cáo:



```text

docs/audits/MONOLITHIC\_CINEMA\_PROJECT\_AUDIT.md

```



Báo cáo phải gồm:



\## 1. Executive Summary



\- Overall status: GREEN / AMBER / RED.

\- Có đủ điều kiện demo không.

\- Có đủ điều kiện deploy không.

\- Top 5 risks.

\- Những phần chưa kiểm tra được.



\## 2. Verification Matrix



| Area | Compile | Tests | Startup | Runtime Flow | Status |

|---|---|---|---|---|---|



\## 3. Architecture Map



Mô tả component, module, database và external integration thực tế.



\## 4. Business Rule Coverage



| Rule ID | Business Rule | Code Evidence | Test Evidence | Coverage | Gap | Priority |

|---|---|---|---|---|---|---|



Coverage chỉ dùng:



```text

Covered

Partial

Gap

Not Applicable

Blocked

```



\## 5. Findings



| ID | Severity | Module | Finding | Evidence | Reproduction | Impact | Recommendation |

|---|---|---|---|---|---|---|---|



Mỗi finding phải có:



\- file và line;

\- endpoint hoặc workflow liên quan;

\- expected behavior;

\- actual behavior;

\- cách tái hiện;

\- mức confidence;

\- fix direction;

\- dependency;

\- sprint recommendation.



\## 6. Test Execution Log



| Command/Test | Result | Evidence | Notes |

|---|---|---|---|



\## 7. Industry Comparison



| Domain | Current Design | Industry Practice | Classification | Gap | Source |

|---|---|---|---|---|---|



\## 8. Prioritized Remediation Plan



Chia thành:



```text

P0 — Fix before any demo/deploy

P1 — Fix before sprint close

P2 — Next sprint

P3 — Backlog

```



Đưa dependency order rõ ràng.



\## 9. Issue Candidates



Chỉ đề xuất issue mới cho gap chưa có issue tương ứng.



\- Không tạo duplicate.

\- Gom các bug cùng root cause.

\- Tối đa 10 issue P0/P1 chính.

\- Issue dùng format của `docs/issues/ISSUE\_TEMPLATE.md` nếu project có.

\- Mỗi issue có Acceptance Criteria testable.

\- Không biến toàn bộ industry wishlist thành current sprint.



\## 10. Final Go/No-Go Checklist



```text

\[ ] Build pass

\[ ] Unit tests pass

\[ ] Integration tests pass

\[ ] Startup pass

\[ ] Database migration pass

\[ ] Authentication/authorization pass

\[ ] Movie lifecycle pass

\[ ] Cinema room/seat layout pass

\[ ] Showtime overlap pass

\[ ] Seat concurrency pass

\[ ] Booking/payment idempotency pass

\[ ] Frontend critical flows pass

\[ ] No committed production secrets

\[ ] No unresolved P0

```



\---



\# Definition of Done for This Audit



Audit chỉ được coi là hoàn thành khi:



\- Đã kiểm tra toàn bộ module/package chính.

\- Đã chạy build và tests khả thi.

\- Đã thử startup nếu môi trường cho phép.

\- Đã kiểm tra database/schema/migration.

\- Đã kiểm tra ít nhất một happy path và negative path cho mỗi core domain.

\- Đã kiểm tra concurrency cho seat booking.

\- Đã kiểm tra role authorization cả frontend và backend.

\- Đã đối chiếu industry practice bằng nguồn hiện hành.

\- Mọi kết luận đều có evidence hoặc được ghi rõ là hypothesis.

\- Không chỉnh sửa production code.

\- Không tạo issue trùng.

\- Đã đưa ra thứ tự fix thực tế, phù hợp dự án monolithic và nguồn lực sinh viên/thực tập.



Bắt đầu bằng việc khảo sát repository và thực hiện audit. Không dừng lại chỉ để hỏi lại những thông tin có thể tự tìm thấy trong code. Nếu một bước bị block, ghi rõ blocker rồi tiếp tục kiểm tra các phần còn lại.

