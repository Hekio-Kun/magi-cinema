# Audit booking, ghế, thanh toán và nghiệp vụ — 11/09/2026

Phạm vi: `BookingService`, `SeatSelectionService`, `PaymentService`, payment providers, showtime/planner, promotion/membership/combo/food và repositories. Dòng tham chiếu tính theo source sau sửa. `Đã sửa` là code trong working tree; `Đề xuất` cần integration test hoặc migration trước khi áp dụng.

## 🔴 Critical — tràn số và tồn kho

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/BookingService.java` dòng 516–578, 1366–1520.

**Vấn đề**: phép nhân giá × số lượng và cộng tổng dùng primitive trước đây có thể overflow; số lượng stock âm có thể bị bỏ qua và làm sai total.

**Đã sửa**:

```java
private int multiplyBookingValue(long value, int quantity) {
    try {
        return Math.toIntExact(Math.multiplyExact(value, quantity));
    } catch (ArithmeticException exception) {
        throw new AppException(ErrorCode.VALIDATION_ERROR,
                "Tổng tiền hoặc số lượng đặt vé vượt giới hạn cho phép.");
    }
}
```

Tổng, yêu cầu kho và hoàn kho dùng cùng checked arithmetic. Stock được lấy lại sau khi chờ `PESSIMISTIC_WRITE`, đồng thời các variant được khóa theo ID tăng dần để giảm deadlock.

## 🔴 Critical — tranh chấp trạng thái ghế/kho

**File**: `repository/BookingRepository.java` dòng 23–36; `service/SeatSelectionService.java` dòng 77–190, 287–340; `service/BookingService.java` dòng 218–236, 1434–1520.

**Vấn đề**: lookup pending/cancel và trạng thái entity trong persistence context có thể cũ khi transaction khác vừa cập nhật.

**Đã sửa**: thêm `@Lock(PESSIMISTIC_WRITE)` cho pending booking; gọi `EntityManager.refresh` sau khi lock ghế/variant; lấy và hoàn tồn kho theo thứ tự ổn định. Database integration test với PostgreSQL vẫn cần thiết để kiểm tra nhiều interleaving và timeout lock.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<Booking> findFirstByUser_UserIdAndShowtime_ShowtimeIdAndStatusOrderByCreatedAtDesc(...);
```

## 🟡 Medium — phân trang không bị giới hạn

**File**: `service/CinemaRoomService.java` dòng 37–40; `service/SeatService.java` dòng 45–48; `service/ShowtimeSeatService.java` dòng 44–48; `validation/PageRequests.java`.

**Đã sửa**: chuẩn hóa `page >= 0`, `1 <= size <= 1000`, giữ caller sơ đồ ghế đang dùng size 500 và trả metadata theo pageable.

```java
Pageable pageable = PageRequests.bounded(page, size, sort);
```

Endpoint users/contacts cần paged contract mới để tránh đổi API cũ đột ngột.

## 🟡 Medium — callback payment và idempotency (đã triển khai)

**File**: `service/PaymentService.java` dòng 39–132, 143–210; `ZaloPayPaymentService.java`; `MomoPaymentService.java`.

Signature HMAC đã được kiểm tra trước khi xử lý và so sánh constant-time; booking ownership/amount được kiểm tra ở service. Log callback đã không còn ghi toàn payload/chữ ký. `PaymentTransactionService` hiện lưu ledger MoMo/ZaloPay, khóa pessimistic transaction và booking, kiểm tra số tiền/mã giao dịch và xử lý callback lặp mà không xác nhận booking lần hai.

Đã thêm unique constraint cho mã lệnh và mã giao dịch từ cổng, cùng test callback lặp, callback sai số tiền và callback thất bại. Chính sách dự án không có hoàn tiền vé; callback thất bại chỉ giải phóng booking đang giữ. Chưa chạy callback qua sandbox thật.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<PaymentTransaction> findForUpdate(PaymentMethod method, String reference);
```

## 🟡 Medium — N+1, eager và god classes

`BookingService.java` (1.559 dòng), `ShowtimePlannerService.java` (1.490 dòng), `PromotionService.java` (1.030 dòng), `ShowtimeService.java` (976 dòng) và `UserService.java` (957 dòng) còn lớn. Đây là rủi ro maintainability đã xác định, chưa tách toàn bộ vì dễ đổi behavior.

Đề xuất façade giữ controller cũ:

```java
@Service
class BookingFacade {
    private final BookingCreationService creation;
    private final BookingPaymentService payment;
    private final BookingValidationService validation;
}
```

Tách planner thành `PlannerRequestValidator`, `PlannerCapacityCalculator`, `PlannerCandidateAllocator`, `PlannerPersistenceService`; promotion thành validation/discount/usage; showtime thành query/conflict/schedule. Dùng fetch join/batch query rồi đo SQL count bằng `EXPLAIN (ANALYZE, BUFFERS)` trước khi thêm index. Không có kết quả benchmark trong audit.

## 🟢 Low — kiểm tra đã bác bỏ

- Repository `@Query` dùng tham số bind/Criteria; chưa thấy nối trực tiếp user input vào SQL.
- `@Transactional` mixed namespace không tự chứng minh rollback sai; cả Jakarta và Spring đều được Spring hỗ trợ. Cần ưu tiên một namespace trong refactor sau.
- Movie/showtime đã có scheduled synchronization; tần suất hiện tại cần đo dữ liệu thật.
- Email đồng bộ và có thể giữ request thread; dùng outbox + retry sau commit thay vì tự thêm `@Async` trên entity LAZY.

## Regression tests

`BookingDomainAuditTest` có 6 test overflow, refresh stock và hoàn kho; `DomainPaginationTest` có 4 test bounds; `SeatSelectionServiceTest` có test stale seat; nhóm payment có test ledger và callback idempotency. Lần chạy Maven Java 21 cuối: **158 tests pass, 0 failure/error**, loại test context cần PostgreSQL thật.
