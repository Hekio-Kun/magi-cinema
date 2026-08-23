package org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum ErrorCode implements BaseErrorCode {
    INVALID_USERNAME(1001, "Invalid username!", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1002, "Invalid password", HttpStatus.BAD_REQUEST),
    UNCATEGORIZED(1003, "Uncategorized", HttpStatus.INTERNAL_SERVER_ERROR),
    USER_UNVERIFIED(1004, "Tài khoản chưa được xác thực! Vui lòng kiểm tra OTP trong Email.", HttpStatus.FORBIDDEN),
    USER_LOCKED(1005, "Tài khoản đã bị khóa hoặc vô hiệu hóa bởi quản trị viên.", HttpStatus.FORBIDDEN),
    USER_EXISTED(1006, "Tên đăng nhập đã tồn tại!", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND(1007, "Role không tồn tại!", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(1008, "Không tìm thấy người dùng!", HttpStatus.NOT_FOUND),
    OTP_EXPIRED(1009, "Mã OTP xác thực đã hết hạn!", HttpStatus.BAD_REQUEST),
    OTP_INVALID(1010, "Mã OTP không chính xác, vui lòng kiểm tra lại!", HttpStatus.BAD_REQUEST),
    CANNOT_LOCK_SUPERADMIN(1011, "Không thể khóa tài khoản Super Admin gốc!", HttpStatus.FORBIDDEN),
    THEATER_EXISTED(1012, "Tên rạp chiếu phim đã tồn tại!", HttpStatus.BAD_REQUEST),
    THEATER_NOT_FOUND(1013, "Không tìm thấy rạp chiếu phim!", HttpStatus.NOT_FOUND),
    UNAUTHORIZED(1014, "Bạn chưa đăng nhập hoặc token đã hết hạn!", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED(1015, "Bạn không có quyền truy cập vào tài nguyên này!", HttpStatus.FORBIDDEN),
    VALIDATION_ERROR(1016, "Dữ liệu đầu vào không hợp lệ!", HttpStatus.BAD_REQUEST),
    METHOD_NOT_ALLOWED(1023, "HTTP method is not supported for this endpoint!", HttpStatus.METHOD_NOT_ALLOWED),
    EMAIL_EXISTED(1017, "Email đã được sử dụng!", HttpStatus.BAD_REQUEST),
    PHONE_EXISTED(1018, "Số điện thoại đã được sử dụng!", HttpStatus.BAD_REQUEST),
    IDENTITY_CARD_EXISTED(1019, "Số CMND/CCCD đã được sử dụng!", HttpStatus.BAD_REQUEST),
    RESEND_OTP_TOO_FAST(1020, "Vui lòng chờ 60 giây trước khi gửi lại OTP!", HttpStatus.TOO_MANY_REQUESTS),
    RESET_TOKEN_INVALID(1021, "Token đặt lại mật khẩu không hợp lệ.", HttpStatus.BAD_REQUEST),
    RESET_TOKEN_EXPIRED(1022, "Token đặt lại mật khẩu đã hết hạn.", HttpStatus.BAD_REQUEST),
    CURRENT_PASSWORD_INVALID(1024, "Mật khẩu hiện tại không chính xác.", HttpStatus.BAD_REQUEST),
    NEW_PASSWORD_SAME_AS_CURRENT(1025, "Mật khẩu mới phải khác mật khẩu hiện tại.", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1026, "Không thể gửi email. Vui lòng kiểm tra cấu hình email hệ thống.", HttpStatus.SERVICE_UNAVAILABLE),
    MOVIE_NOT_FOUND(2001, "Không tìm thấy phim!", HttpStatus.NOT_FOUND),
    MOVIE_ALREADY_EXISTS(2002, "Phim đã tồn tại trong hệ thống!", HttpStatus.BAD_REQUEST),
    MOVIE_DATE_INVALID(2010, "Ngày kết thúc phải sau ngày khởi chiếu!", HttpStatus.BAD_REQUEST),
    MOVIE_DATE_REQUIRED(2011, "Ngày khởi chiếu và ngày kết thúc là bắt buộc!", HttpStatus.BAD_REQUEST),
    MOVIE_STATUS_DATE_MISMATCH(2012, "Trạng thái phim không khớp với ngày chiếu. Phim Sắp chiếu phải có ngày bắt đầu trong tương lai. Phim Đang chiếu phải có ngày bắt đầu trước hoặc bằng hôm nay và ngày kết thúc sau hôm nay.", HttpStatus.BAD_REQUEST),
    MOVIE_HAS_BOOKINGS(2014, "Không thể chỉnh sửa hoặc xóa phim đã có người đặt vé!", HttpStatus.BAD_REQUEST),
    MOVIE_HAS_SHOWTIMES(2015, "Không thể chỉnh sửa phim đã có lịch chiếu! Chỉ có thể thay đổi ngày kết thúc.", HttpStatus.BAD_REQUEST),
    MAX_HOT_MOVIES_REACHED(2016, "Chỉ được chọn tối đa 3 phim hot!", HttpStatus.BAD_REQUEST),
    CINEMA_ROOM_NOT_FOUND(2101, "Không tìm thấy phòng chiếu!", HttpStatus.NOT_FOUND),
    CINEMA_ROOM_NAME_EXISTED(2102, "Tên phòng chiếu đã tồn tại!", HttpStatus.BAD_REQUEST),
    GENRE_NOT_FOUND(2004, "Không tìm thấy thể loại phim!", HttpStatus.NOT_FOUND),
    GENRE_NAME_EXISTED(2005, "Tên thể loại phim đã tồn tại!", HttpStatus.BAD_REQUEST),
    SHOWTIME_NOT_FOUND(2201, "Không tìm thấy suất chiếu!", HttpStatus.NOT_FOUND),
    SEAT_NOT_FOUND(2006, "Không tìm thấy ghế!", HttpStatus.NOT_FOUND),
    SEAT_EXISTED(2007, "Ghế đã tồn tại trong phòng chiếu!", HttpStatus.BAD_REQUEST),
    SHOWTIME_SEAT_NOT_FOUND(2008, "Không tìm thấy trạng thái ghế của suất chiếu!", HttpStatus.NOT_FOUND),
    SHOWTIME_SEAT_EXISTED(2009, "Ghế này đã được gán cho suất chiếu!", HttpStatus.BAD_REQUEST),
    INVALID_SEAT_QUANTITY(3001, "Số lượng ghế đặt mỗi lần tối đa là 8 ghế.", HttpStatus.BAD_REQUEST),
    INVALID_SEAT_SELECTION(3002, "Selected seat information is invalid", HttpStatus.BAD_REQUEST),
    TICKET_QR_INVALID(3003, "Mã QR vé không hợp lệ hoặc không tồn tại.", HttpStatus.NOT_FOUND),
    PROMOTION_NOT_FOUND(4001, "Không tìm thấy chương trình khuyến mãi.", HttpStatus.NOT_FOUND),
    PROMOTION_CODE_EXISTED(4002, "Mã khuyến mãi đã tồn tại.", HttpStatus.CONFLICT),
    PROMOTION_NOT_ACTIVE(4003, "Chương trình khuyến mãi chưa hoạt động.", HttpStatus.BAD_REQUEST),
    PROMOTION_NOT_STARTED(4004, "Chương trình khuyến mãi chưa bắt đầu.", HttpStatus.BAD_REQUEST),
    PROMOTION_EXPIRED(4005, "Chương trình khuyến mãi đã hết hạn.", HttpStatus.BAD_REQUEST),
    PROMOTION_NOT_APPLICABLE(4006, "Đơn hàng không đủ điều kiện áp dụng khuyến mãi.", HttpStatus.BAD_REQUEST),
    PROMOTION_USAGE_LIMIT_REACHED(4007, "Chương trình khuyến mãi đã hết lượt sử dụng.", HttpStatus.CONFLICT),
    PROMOTION_CUSTOMER_LIMIT_REACHED(4008, "Khách hàng đã hết lượt sử dụng khuyến mãi.", HttpStatus.CONFLICT),
    PROMOTION_PAYMENT_METHOD_INVALID(4009, "Phương thức thanh toán không phù hợp với khuyến mãi.", HttpStatus.BAD_REQUEST),
    PROMOTION_ALREADY_APPLIED(4010, "Đơn hàng đã có chương trình khuyến mãi.", HttpStatus.CONFLICT),
    PROMOTION_USAGE_LOCKED(4011, "Khuyến mãi đã được gửi sang cổng thanh toán và không thể thay đổi.", HttpStatus.CONFLICT),
    BIRTHDAY_BENEFIT_ALREADY_USED(
            4012,
            "Bạn đã sử dụng ưu đãi sinh nhật trong năm nay.",
            HttpStatus.CONFLICT),
    CONTACT_NOT_FOUND(5001, "Không tìm thấy thông tin liên hệ!", HttpStatus.NOT_FOUND);

    int code;
    String message;
    HttpStatusCode statusCode;
}
