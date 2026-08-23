package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingAdminResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingPromotionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.TicketVerificationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.BookingService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TicketVerificationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingController {

    BookingService bookingService;
    TicketVerificationService ticketVerificationService;

    @GetMapping("/tickets/{token}")
    public ApiResponse<TicketVerificationResponse> verifyTicket(@PathVariable String token) {
        return ApiResponse.<TicketVerificationResponse>builder()
                .message("Xác thực vé thành công.")
                .result(ticketVerificationService.verify(token))
                .build();
    }

    @PostMapping("/tickets/{token}/scan")
    @PreAuthorize("hasAnyAuthority('STAFF', 'ADMIN')")
    public ApiResponse<Void> markTicketAsScanned(@PathVariable String token) {
        ticketVerificationService.markAsScanned(token);
        return ApiResponse.<Void>builder()
                .message("Đã xác nhận quét vé thành công.")
                .build();
    }

    @GetMapping(value = "/tickets/{token}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getTicketQrCode(@PathVariable String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(ticketVerificationService.generateQrPng(token));
    }

    @PostMapping
    public ApiResponse<BookingResponse> createBooking(@RequestBody @Valid BookingRequest request) {
        return ApiResponse.<BookingResponse>builder()
                .message("Đặt vé thành công!")
                .result(bookingService.createBooking(request))
                .build();
    }

    @GetMapping("/my-bookings")
    public ApiResponse<List<BookingResponse>> getMyBookings() {
        return ApiResponse.<List<BookingResponse>>builder()
                .result(bookingService.getMyBookings())
                .build();
    }

    @GetMapping("/pending")
    public ApiResponse<BookingResponse> getMyPendingBookingForShowtime(@RequestParam Long showtimeId) {
        return ApiResponse.<BookingResponse>builder()
                .result(bookingService.getMyPendingBookingForShowtime(showtimeId))
                .build();
    }

    @PostMapping("/{bookingId}/payment")
    public ApiResponse<BookingResponse> createPaymentForPendingBooking(
            @PathVariable Long bookingId,
            @RequestParam(defaultValue = "ZALOPAY") PaymentMethod paymentMethod) {
        return ApiResponse.<BookingResponse>builder()
                .message("Tạo lại yêu cầu thanh toán thành công!")
                .result(bookingService.createPaymentForPendingBooking(bookingId, paymentMethod))
                .build();
    }

    @PostMapping("/{bookingId}/promotion")
    public ApiResponse<BookingResponse> applyPromotion(
            @PathVariable Long bookingId,
            @RequestBody @Valid BookingPromotionRequest request) {
        return ApiResponse.<BookingResponse>builder()
                .message("Áp dụng promotion thành công.")
                .result(bookingService.applyPromotion(bookingId, request))
                .build();
    }

    @DeleteMapping("/{bookingId}/promotion")
    public ApiResponse<BookingResponse> removePromotion(@PathVariable Long bookingId) {
        return ApiResponse.<BookingResponse>builder()
                .message("Đã bỏ promotion khỏi đơn.")
                .result(bookingService.removePromotion(bookingId))
                .build();
    }

    @PostMapping("/{bookingId}/cash-payment")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<BookingResponse> confirmCounterCashPayment(
            @PathVariable Long bookingId,
            @RequestParam(defaultValue = "CASH") PaymentMethod paymentMethod) {
        return ApiResponse.<BookingResponse>builder()
                .message("Đã xác nhận thanh toán tiền mặt.")
                .result(bookingService.confirmCounterCashPayment(bookingId, paymentMethod))
                .build();
    }

    @GetMapping("/{bookingId}/counter-status")
    @PreAuthorize("hasAnyAuthority('BOOKING_MANAGE', 'BOOKING_VIEW')")
    public ApiResponse<BookingResponse> getCounterBookingStatus(@PathVariable Long bookingId) {
        return ApiResponse.<BookingResponse>builder()
                .result(bookingService.getCounterBookingStatus(bookingId))
                .build();
    }

    @DeleteMapping("/{bookingId}/pending")
    public ApiResponse<Void> cancelMyPendingBooking(@PathVariable Long bookingId) {
        bookingService.cancelMyPendingBooking(bookingId);
        return ApiResponse.<Void>builder()
                .message("Đã hủy giữ ghế.")
                .build();
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<PageResponse<BookingAdminResponse>> getAllBookings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) BookingChannel channel,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDateTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo) {
        return ApiResponse.<PageResponse<BookingAdminResponse>>builder()
                .result(bookingService.getAllBookings(
                        page,
                        size,
                        channel,
                        status,
                        keyword,
                        showDateFrom,
                        showDateTo,
                        createdFrom,
                        createdTo))
                .build();
    }
}
