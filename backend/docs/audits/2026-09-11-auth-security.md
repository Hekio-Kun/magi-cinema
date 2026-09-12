# Audit xác thực, phân quyền, dữ liệu người dùng — 2026-09-11

Phạm vi: `AuthenticationService`, `OtpStore`, `PasswordResetService`, `JwtService`, `SecurityConfig`, các controller/DTO auth-user-role-permission, `CloudinaryService`, `GlobalExceptionHandler`, `UserService`, entity/repository liên quan; đối chiếu thêm email và WebSocket. Các dòng bên dưới tính trên source sau sửa. Đường dẫn Java viết đầy đủ từ repository root để tra cứu chính xác.

Root đã chạy Maven với Java 21: **137 test pass**, trong đó **11 regression test mới của phần auth**. Lần chạy này loại `Hcm26CplJsJava02Team4MovieTheaterApplicationTests`; chưa kiểm thử SMTP/Cloudinary thực tế, nhiều instance hoặc tải lớn. Không sửa `pom.xml` đang có thay đổi của người dùng.

## 🔴 Critical — Security — Khóa tài khoản hoặc thu hồi quyền chưa vô hiệu JWT đã cấp

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/config/SecurityConfig.java` dòng 234–250; `service/JwtService.java` cùng package dòng 28, 37–53; `service/UserService.java` dòng 506–524.

**Vấn đề/impact**: trạng thái ACTIVE/INACTIVE/BANNED/DELETED chỉ được kiểm tra khi login. Resource server xác thực chữ ký/thời hạn rồi lấy quyền từ claim `scope`, không đọc trạng thái hoặc quyền hiện tại. User bị khóa hay bị gỡ quyền vẫn có thể dùng token cũ gọi các endpoint dựa hoàn toàn vào authority, ví dụ `/roles`. Thời hạn mặc định token là 24 giờ. Đây là kết luận từ đường đi code; chưa chạy thử exploit với database thật.

**Trạng thái: đề xuất**, chưa đổi cơ chế session trong quick fix. Một phương án giữ Bearer API là thay converter bằng kiểm tra user và dựng quyền từ DB cho mỗi request:

```java
@Bean
Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter(UserRepository users) {
    return jwt -> {
        User user = users.findByUsername(jwt.getSubject())
                .orElseThrow(() -> new BadCredentialsException("Tài khoản không hợp lệ"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        Set<GrantedAuthority> authorities = new HashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().forEach(role -> {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getRoleName()));
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(permission ->
                            authorities.add(new SimpleGrantedAuthority(permission.getName())));
                }
            });
        }
        return new JwtAuthenticationToken(jwt, authorities, user.getUsername());
    };
}
```

Đây là đoạn thay thế cần import các lớp Spring Security và truyền converter vào `filterChain`. Cần đo thêm truy vấn role/permission mỗi request. Đổi mật khẩu muốn thu hồi toàn bộ token còn cần version session/password riêng; kiểm tra trạng thái như trên chưa giải quyết trường hợp đó.

## 🟡 Medium — Security — Endpoint công khai chưa có giới hạn thử mật khẩu/OTP

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/AuthenticationService.java` dòng 53–103, 106–118, 170–194; `service/PasswordResetService.java` dòng 41–75.

**Vấn đề/impact**: OTP có 6 chữ số và thời hạn, nhưng không có bộ đếm lần thử. Cooldown chỉ nằm trong `resendOtp`: gọi lại `/auth/register` vượt cooldown; check `hasKey` rồi `save` cũng chưa nguyên tử. Không thấy limiter trong cấu hình ứng dụng đã review. Có thể tồn tại rate limit ở hạ tầng bên ngoài repository, chưa xác minh.

**Trạng thái: đề xuất**. Ví dụ bước bảo vệ ở Nginx hiện có, cần hợp nhất với các location/proxy đang dùng và điều chỉnh ngưỡng sau đo tải:

```nginx
# http context
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# server context
location = /auth/login {
    limit_req zone=auth_limit burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://backend:8080;
}
```

Cần áp dụng tương tự cho register/verify/resend/forgot/reset và thêm giới hạn theo tài khoản/email ở backend; limiter IP riêng lẻ không đủ bảo vệ khi dùng nhiều IP và phải xử lý proxy tin cậy đúng cách. Chưa đổi lỗi login để tránh thay API message hiện tại; `USER_NOT_FOUND`/`INVALID_PASSWORD` đang cho phép phân biệt username tồn tại.

## 🟡 Medium — Bug — Email đăng ký thiếu validation và lưu khác email dùng xác minh

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/dto/auth/RegisterRequest.java` dòng 22–32; `dto/auth/ResendOtpRequest.java` dòng 15–18; `controller/AuthController.java` dòng 61; `service/AuthenticationService.java` dòng 54, 109, 137.

**Vấn đề/impact**: thiếu email gây NPE tại `.trim()`; username rỗng và email sai định dạng có thể vào service/DB. `Member@Example.com` được xác minh bằng khóa lowercase nhưng mapper giữ nguyên email trong `users`, trong khi forgot-password tra lowercase bằng query phân biệt hoa/thường. Điều này làm người dùng không nhận được mail reset và có thể tạo email trùng về mặt chuẩn hóa.

**Đã sửa**: `@NotBlank`, `@Email`, độ dài phù hợp cột DB; bật `@Valid` resend; normalize với `Locale.ROOT` rồi lưu cùng email cho `User` và `UserProfile`.

```java
@NotBlank(message = "Email không được để trống")
@Email(message = "Email không hợp lệ")
@Size(max = 100, message = "Email không được quá 100 ký tự")
String email;

String emailKey = registerRequest.getEmail().trim().toLowerCase(Locale.ROOT);
User user = userMapper.toUser(registerRequest);
user.setEmail(emailKey);
```

**Kiểm chứng**: `AuthControllerValidationTest` kiểm tra request đăng ký thiếu email/username và resend thiếu/sai email bị chặn; `AuthenticationServiceTest.storesTheSameNormalizedEmailUsedToVerifyOtp` kiểm tra email lưu hai entity. Dữ liệu uppercase cũ chưa tự backfill vì phải rà trùng trước.

## 🟡 Medium — Bug — OTP được đọc rồi xóa bằng hai thao tác độc lập

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/OtpStore.java` dòng 33–53; `service/AuthenticationService.java` dòng 112–118.

**Vấn đề/impact**: hai request có thể cùng đọc một mã hợp lệ trước khi request đầu xóa. Ngoài ra `get()` cũ có thể đọc entry hết hạn, sau đó `remove(key)` vô tình xóa mã mới do request khác vừa resend. Unique constraint email giảm nguy cơ tạo hai user cùng email nhưng không làm OTP một lần sử dụng và không ngăn mất mã mới.

**Đã sửa**: dùng `ConcurrentHashMap.computeIfPresent` kiểm tra + consume nguyên tử, giữ mã khi nhập sai, hết hạn ngay tại mốc expiry; `get()` dọn hết hạn trong cùng thao tác nguyên tử. Thêm clock để kiểm thử biên thời gian chính xác.

```java
store.computeIfPresent(key, (ignored, entry) -> {
    if (!clock.instant().isBefore(entry.expiry())) return null;
    if (!entry.otp().equals(otp)) {
        result.set(ConsumeResult.INVALID);
        return entry;
    }
    result.set(ConsumeResult.VERIFIED);
    return null;
});
```

**Kiểm chứng**: 4 test `OtpStoreTest`, gồm 8 request đồng thời chỉ có đúng 1 lần VERIFIED, nhập sai không consume, mốc expiry và cleanup. Chưa chuyển OTP sang nơi lưu dùng chung; restart vẫn mất OTP, nhiều instance vẫn cần sticky routing hoặc shared persistence. Không kết luận có memory leak: code có scheduler dọn mỗi 5 phút từ trước.

## 🟡 Medium — Bug — Xác minh đăng ký chưa kiểm tra lại CCCD

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/AuthenticationService.java` dòng 129–134, 157.

**Vấn đề/impact**: CCCD được kiểm tra ở bước gửi OTP nhưng payload đăng ký gửi lại hoàn toàn ở bước verify. Đổi CCCD giữa hai bước vượt kiểm tra duplicate ban đầu; trước đó giá trị có khoảng trắng cũng được lưu nguyên bản.

**Đã sửa**: chuẩn hóa và kiểm tra lại trước lưu.

```java
String identityCard = registerRequest.getIdentityCard() == null
        ? null : registerRequest.getIdentityCard().trim();
if (identityCard != null && !identityCard.isBlank()
        && userProfileRepository.existsByIdentityCard(identityCard)) {
    throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
}
```

**Kiểm chứng**: test `rechecksIdentityCardAtFinalRegistrationStep`, bảo đảm không save user khi CCCD trùng. Kiểm tra ứng dụng này chưa thay unique constraint DB và vẫn còn race giữa các tài khoản khác nhau; cần rà dữ liệu trước khi tạo unique index phone/CCCD.

## 🟡 Medium — Security — Reset password dùng PRNG không dành cho bảo mật

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/PasswordResetService.java` dòng 30, 48.

**Vấn đề/impact**: token reset được tạo bằng `new java.util.Random()`. Không phù hợp cho mã xác thực bảo mật; không khẳng định đã dự đoán được token triển khai thực tế.

**Đã sửa**: cùng cách dùng `SecureRandom` như đăng ký; giữ API mã 6 chữ số, dùng `Locale.ROOT` để chữ số không phụ thuộc locale server.

```java
private static final SecureRandom SECURE_RANDOM = new SecureRandom();
String token = String.format(Locale.ROOT, "%06d", SECURE_RANDOM.nextInt(1_000_000));
```

Maven compile/test pass. Không viết test giả vờ chứng minh tính ngẫu nhiên bằng việc kiểm tra vài đầu ra.

## 🟡 Medium — Bug — Mã reset 6 chữ số bị unique toàn hệ thống

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/entity/PasswordResetToken.java` dòng 19; `service/PasswordResetService.java` dòng 48–53; `repository/PasswordResetTokenRepository.java` dòng 13–15.

**Vấn đề/impact**: hai user có thể ngẫu nhiên nhận cùng mã; unique trên `token` làm request sau lỗi DB/500. Dòng hết hạn chưa có scheduler dọn. API thực tế đã tra mã theo email nên mã không cần unique giữa các user.

**Trạng thái: đề xuất migration**, chưa tự thay schema đang có dữ liệu:

```java
@Column(nullable = false) // uniqueness đặt trên user_id, không đặt trên mã 6 chữ số
private String token;
```

Cần migration bỏ đúng unique constraint của cột token sau khi tra tên constraint, duy trì uniqueness user_id, xóa method `findByToken` nếu xác nhận không còn caller. Để ngăn hai reset cùng consume một mã, có thể đặt `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên `findByTokenAndUser_EmailIgnoreCase`, giữ transaction service và thêm integration test PostgreSQL.

## 🟡 Medium — Security/Validation — Upload ảnh chưa tự kiểm tra loại/size

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/CloudinaryService.java` dòng 23–35; `service/UserService.java` dòng 420–439.

**Vấn đề/impact**: service chỉ kiểm tra empty rồi gửi bytes sang Cloudinary. `IllegalArgumentException` empty hiện bị map thành 500. Avatar cho mọi user đã đăng nhập cũng dùng đường này. Không thấy cấu hình multipart rõ trong source, nhưng không kết luận upload vô hạn vì servlet/container/proxy/provider có thể áp giới hạn mặc định.

**Trạng thái: đề xuất**: thống nhất định dạng và giới hạn UI/backend trước khi giới hạn chặt, tránh làm hỏng ảnh WebP/định dạng đang dùng. Ví dụ validation size + decode thật cho tập định dạng ImageIO hỗ trợ:

```java
if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
    throw new AppException(ErrorCode.VALIDATION_ERROR, "Ảnh không hợp lệ hoặc lớn hơn 5 MB.");
}
try (var input = ImageIO.createImageInputStream(file.getInputStream())) {
    if (input == null || !ImageIO.getImageReaders(input).hasNext()) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, "Định dạng ảnh không được hỗ trợ.");
    }
}
```

Phần này cần thêm giới hạn chiều rộng/cao trước giải mã đầy đủ, giới hạn multipart ở ingress và map lỗi 413; MIME do client khai báo không đủ chứng minh nội dung ảnh.

## 🟡 Medium — Bug — Tự sửa profile bỏ qua kiểm tra CCCD trùng

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/UserService.java` dòng 394 đối chiếu 490–496.

**Vấn đề/impact**: admin update có normalize + duplicate check, self update lại gán trực tiếp. Không phải IDOR: user được lấy bằng principal, request không thể đổi userId/roles qua `/me`.

**Trạng thái: đề xuất**, đoạn thay thế cùng quy tắc admin:

```java
if (request.getIdentityCard() != null) {
    String identityCard = normalizeOptional(request.getIdentityCard());
    if (identityCard != null
            && userProfileRepository.existsByIdentityCardAndUserIdNot(identityCard, userId)) {
        throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
    }
    profile.setIdentityCard(identityCard);
}
```

## 🟡 Medium — Performance/CodeQuality — UserService tải mọi user/profile và gộp nhiều trách nhiệm

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/UserService.java` dòng 115–132, 230–365, 369–524; `entity/User.java` dòng 43.

**Vấn đề/impact**: `getAllUsers` lọc statuses trong Java sau `findAll`, rồi tải toàn bộ profile. `roles` EAGER tăng dữ liệu fetch; chưa có SQL trace để kết luận số truy vấn N+1 thực tế. Service còn xử lý Google Sheets, email nhân viên, CRUD admin, profile và xóa liên quan.

**Trạng thái: đề xuất endpoint phân trang bổ sung**, giữ endpoint list cũ cho tương thích, đồng thời tách `StaffImportService`, `UserProfileService`, `UserAdministrationService` theo các cụm method trên. Mẫu repository/service:

```java
Page<User> findByStatusIn(Collection<UserStatus> statuses, Pageable pageable);

int safeSize = Math.min(Math.max(size, 1), 100);
Page<User> page = userRepository.findByStatusIn(statuses,
        PageRequest.of(Math.max(pageNumber, 0), safeSize));
List<UserProfile> profiles = userProfileRepository.findAllById(
        page.getContent().stream().map(User::getUserId).toList());
```

Để tách service mà giữ controller/API, façade cũ có thể delegate: `return userProfileService.updateMyProfile(request);`. Phải đặt transaction trên service được gọi qua Spring proxy và bổ sung tests quyền + rollback trước khi di chuyển toàn bộ code.

## 🟢 Low — Bug — JSON hỏng trả 500 thay vì 400

**File**: `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/exception/GlobalExceptionHandler.java` dòng 24–27.

**Vấn đề/impact**: `HttpMessageNotReadableException` trước đây rơi vào catch-all runtime, trả UNCATEGORIZED/500 cho lỗi client. Tăng nhiễu log và làm UI báo lỗi server sai.

**Đã sửa**:

```java
@ExceptionHandler(HttpMessageNotReadableException.class)
ResponseEntity<ApiResponse<?>> handlingUnreadableRequest(HttpMessageNotReadableException exception) {
    return buildErrorResponse(ErrorCode.VALIDATION_ERROR, "Dữ liệu yêu cầu không hợp lệ.");
}
```

**Kiểm chứng**: `AuthControllerValidationTest.malformedJsonReturnsBadRequestInsteadOfInternalServerError` gửi `{` và nhận HTTP 400; không expose parser stack trace qua response.

## Những giả thuyết trong prompt đã đối chiếu

- **Phone null khi verify**: HTTP controller có `@Valid`; `VerifyOtpRequest.registerRequest` có `@Valid @NotNull`, phone có `@NotBlank`. Test xác nhận null phone bị 400 trước service. Không ghi NPE này là bug HTTP còn tồn tại. Nếu gọi service trực tiếp, caller vẫn cần giữ tiền điều kiện.
- **OTP memory leak**: có `@Scheduled(fixedRate = 300000)` từ trước; chưa thấy leak do không dọn expiry. Hạn chế restart/nhiều instance là thật và chưa sửa.
- **`/auth/me` lộ signer key**: endpoint được bảo vệ bởi `anyRequest().authenticated()`. Token chỉ có sub/iss/iat/exp/scope; claims không chứa signer key hoặc password. Response lặp lại dữ liệu client đã đọc được từ JWT; không kết luận đây là secret leak và không phá contract bằng cách xóa endpoint.
- **`ApiResponse.code` primitive int = 0**: đây là contract success hiện có, không phải lỗi Jackson. Giữ nguyên.
- **Lombok builder làm JPA proxy hỏng**: `User` có public no-args constructor và không final; riêng tổ hợp annotation này không chứng minh lỗi proxy. Giữ nguyên.
- **Mix hai `@Transactional` tự làm rollback sai**: các lỗi nghiệp vụ dùng `AppException extends RuntimeException`; chỉ khác namespace chưa đủ kết luận sai rollback. Cần xét checked exceptions/self invocation từng đường chạy. Không đổi hàng loạt import để giả vờ sửa bug.
- **CORS headers `*`**: allowed origins là danh sách cấu hình cụ thể; wildcard header không đồng nghĩa wildcard origin. Không thấy bypass chỉ từ việc dùng `Arrays.asList` fully qualified. Không sửa API headers theo nhận định hình thức.
- **BCrypt cost 10**: source dùng BCrypt; không có benchmark latency/load phần cứng nên không kết luận lỗi chỉ theo năm. Không tự tăng cost gây thay đổi capacity login.
- **Log OTP/password**: các statement auth/email đã đọc log email/username hoặc trạng thái, không log trực tiếp mã OTP/password. Có PII email trong log nhưng khác với lộ OTP. Chưa khẳng định log runtime từ provider/exception tuyệt đối không có dữ liệu nhạy cảm.
- **SQL injection repository**: các `@Query` được tìm đều là query tĩnh với tham số bind; không tìm thấy nối trực tiếp user input trong repository auth/user. Đây là kiểm tra tĩnh có phạm vi, không phải bằng chứng an toàn mọi SQL ở runtime.
- **Roles/permissions**: controller có `ROLE_MANAGE`; UserService chặn gán ADMIN và chặn sửa tài khoản admin. `/users/me` lấy user theo principal, không dùng userId client. Không xác nhận IDOR profile từ các đường này. Root xử lý riêng seed quyền bị ghi đè khi khởi động.
- **Email blocking**: `EmailService` gọi mail sender đồng bộ; OTP/reset và tạo nhân viên có thể chờ SMTP. Đưa sang outbox/retry nên giữ thông báo thành công/thất bại rõ ràng và kiểm tra transaction; chưa đổi trong quick fix.

## Test mới

- `backend/backend/src/test/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/AuthenticationServiceTest.java`: 3 test email chuẩn hóa, CCCD đổi ở bước verify, OTP đã consume.
- `backend/backend/src/test/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/service/OtpStoreTest.java`: 4 test OTP/expiry/cleanup/concurrency.
- `backend/backend/src/test/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/controller/AuthControllerValidationTest.java`: 4 test validation/malformed JSON, gồm test bác bỏ phone-null HTTP candidate.
