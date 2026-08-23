package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.SeatService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seats")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatController {

    SeatService seatService;

    @GetMapping
    public ApiResponse<PageResponse<SeatResponse>> getSeats(
            @RequestParam(required = false) Long cinemaRoomId,
            @RequestParam(required = false) SeatStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<SeatResponse>>builder()
                .result(seatService.getSeats(cinemaRoomId, status, page, size))
                .build();
    }

    @GetMapping("/{seatId}")
    public ApiResponse<SeatResponse> getSeatById(@PathVariable Long seatId) {
        return ApiResponse.<SeatResponse>builder()
                .result(seatService.getSeatById(seatId))
                .build();
    }

    @PostMapping
    public ApiResponse<SeatResponse> createSeat(@RequestBody @Valid SeatCreationRequest request) {
        return ApiResponse.<SeatResponse>builder()
                .message("Tạo ghế thành công!")
                .result(seatService.createSeat(request))
                .build();
    }

    @PutMapping("/{seatId}")
    public ApiResponse<SeatResponse> updateSeat(
            @PathVariable Long seatId,
            @RequestBody @Valid SeatUpdateRequest request) {
        return ApiResponse.<SeatResponse>builder()
                .message("Cập nhật ghế thành công!")
                .result(seatService.updateSeat(seatId, request))
                .build();
    }

    @DeleteMapping("/{seatId}")
    public ApiResponse<String> deleteSeat(@PathVariable Long seatId) {
        seatService.deleteSeat(seatId);
        return ApiResponse.<String>builder()
                .message("Xóa ghế thành công!")
                .build();
    }

    @PutMapping("/bulk")
    public ApiResponse<String> bulkUpdateSeats(@RequestBody @Valid org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatBulkUpdateRequest request) {
        seatService.bulkUpdateSeats(request);
        return ApiResponse.<String>builder()
                .message("Cập nhật ghế hàng loạt thành công!")
                .build();
    }
}
