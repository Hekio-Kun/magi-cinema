package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.BookingService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.SeatSelectionService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seat-selections")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatSelectionController {

    SeatSelectionService seatSelectionService;
    BookingService bookingService;

    @GetMapping
    public ApiResponse<SeatSelectionHoldResponse> getCurrentSelection(
            @RequestParam Long showtimeId,
            @RequestParam String clientToken) {
        return ApiResponse.<SeatSelectionHoldResponse>builder()
                .result(seatSelectionService.getCurrentSelection(showtimeId, clientToken))
                .build();
    }

    @PutMapping
    public ApiResponse<SeatSelectionHoldResponse> updateSelection(
            @RequestBody @Valid SeatSelectionHoldRequest request) {
        return ApiResponse.<SeatSelectionHoldResponse>builder()
                .message(request.getShowtimeSeatIds().isEmpty()
                        ? "Đã nhả các ghế đang chọn."
                        : "Đã giữ ghế đang chọn.")
                .result(seatSelectionService.updateSelection(request))
                .build();
    }

    @DeleteMapping
    public ApiResponse<Void> releaseCurrentUserSelection(@RequestParam Long showtimeId) {
        bookingService.cancelMyPendingBookingsForShowtime(showtimeId);
        seatSelectionService.releaseCurrentUserSelection(showtimeId);
        return ApiResponse.<Void>builder()
                .message("Đã đóng phiên đặt ghế cũ và mở lại các ghế chưa thanh toán.")
                .build();
    }
}
