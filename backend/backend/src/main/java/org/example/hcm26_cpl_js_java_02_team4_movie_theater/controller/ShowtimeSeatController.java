package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ShowtimeSeatService;
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
@RequestMapping("/showtime-seats")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeSeatController {

    ShowtimeSeatService showtimeSeatService;

    @GetMapping
    public ApiResponse<PageResponse<ShowtimeSeatResponse>> getShowtimeSeats(
            @RequestParam(required = false) Long showtimeId,
            @RequestParam(required = false) ShowtimeSeatStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ShowtimeSeatResponse>>builder()
                .result(showtimeSeatService.getShowtimeSeats(showtimeId, status, page, size))
                .build();
    }

    @GetMapping("/{showtimeSeatId}")
    public ApiResponse<ShowtimeSeatResponse> getShowtimeSeatById(@PathVariable Long showtimeSeatId) {
        return ApiResponse.<ShowtimeSeatResponse>builder()
                .result(showtimeSeatService.getShowtimeSeatById(showtimeSeatId))
                .build();
    }

    @PostMapping
    public ApiResponse<ShowtimeSeatResponse> createShowtimeSeat(@RequestBody @Valid ShowtimeSeatCreationRequest request) {
        return ApiResponse.<ShowtimeSeatResponse>builder()
                .message("Tạo trạng thái ghế theo suất chiếu thành công!")
                .result(showtimeSeatService.createShowtimeSeat(request))
                .build();
    }

    @PutMapping("/{showtimeSeatId}")
    public ApiResponse<ShowtimeSeatResponse> updateShowtimeSeat(
            @PathVariable Long showtimeSeatId,
            @RequestBody @Valid ShowtimeSeatUpdateRequest request) {
        return ApiResponse.<ShowtimeSeatResponse>builder()
                .message("Cập nhật trạng thái ghế theo suất chiếu thành công!")
                .result(showtimeSeatService.updateShowtimeSeat(showtimeSeatId, request))
                .build();
    }

    @DeleteMapping("/{showtimeSeatId}")
    public ApiResponse<String> deleteShowtimeSeat(@PathVariable Long showtimeSeatId) {
        showtimeSeatService.deleteShowtimeSeat(showtimeSeatId);
        return ApiResponse.<String>builder()
                .message("Xóa trạng thái ghế theo suất chiếu thành công!")
                .build();
    }
}
