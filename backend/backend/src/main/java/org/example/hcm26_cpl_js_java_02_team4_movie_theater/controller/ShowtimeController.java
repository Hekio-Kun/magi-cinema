package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeAdminRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerConfirmRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerRecommendationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieShowtimeByDateResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ShowtimeService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ShowtimePlannerService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/showtimes")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeController {

    ShowtimeService showtimeService;
    ShowtimePlannerService showtimePlannerService;

    /**
     * ADMIN - Lay danh sach suat chieu de quan ly.
     * GET /showtimes/admin?movieId=1&cinemaRoomId=1&date=2026-06-24&status=SCHEDULED
     */
    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    public ApiResponse<List<ShowtimeResponse>> getAdminShowtimes(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaRoomId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) ShowtimeStatus status) {
        return ApiResponse.<List<ShowtimeResponse>>builder()
                .result(showtimeService.getAdminShowtimes(movieId, cinemaRoomId, date, status))
                .build();
    }

    /**
     * ADMIN - Lay chi tiet mot suat chieu.
     * GET /showtimes/admin/{showtimeId}
     */
    @GetMapping("/admin/{showtimeId}")
    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    public ApiResponse<ShowtimeResponse> getAdminShowtime(@PathVariable Long showtimeId) {
        return ApiResponse.<ShowtimeResponse>builder()
                .result(showtimeService.getAdminShowtime(showtimeId))
                .build();
    }

    /**
     * ADMIN - Tao suat chieu.
     * POST /showtimes/admin
     */
    @PostMapping("/admin")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimeResponse> createShowtime(@Valid @RequestBody ShowtimeAdminRequest request) {
        return ApiResponse.<ShowtimeResponse>builder()
                .message("Tao suat chieu thanh cong!")
                .result(showtimeService.createShowtime(request))
                .build();
    }

    /**
     * ADMIN - Tao nhieu suat chieu trong mot transaction.
     * POST /showtimes/admin/bulk
     */
    @PostMapping("/admin/bulk")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<List<ShowtimeResponse>> createShowtimes(@Valid @RequestBody List<@Valid ShowtimeAdminRequest> requests) {
        return ApiResponse.<List<ShowtimeResponse>>builder()
                .message("Tao suat chieu hang loat thanh cong!")
                .result(showtimeService.createShowtimes(requests))
                .build();
    }

    /**
     * ADMIN - Lập lịch tối ưu theo số suất do admin yêu cầu, chưa ghi database.
     * POST /showtimes/admin/planner/preview
     */
    @PostMapping("/admin/planner/preview")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimePlannerPreviewResponse> previewPlannedShowtimes(
            @Valid @RequestBody ShowtimePlannerPreviewRequest request) {
        return ApiResponse.<ShowtimePlannerPreviewResponse>builder()
                .message("Đã tạo bản xem trước lịch chiếu.")
                .result(showtimePlannerService.preview(request))
                .build();
    }

    /**
     * ADMIN - Kiểm tra nhanh quota vừa điều chỉnh, không tính lại sức chứa còn dư.
     * POST /showtimes/admin/planner/validate-quota
     */
    @PostMapping("/admin/planner/validate-quota")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimePlannerPreviewResponse> validatePlannerQuota(
            @Valid @RequestBody ShowtimePlannerPreviewRequest request) {
        return ApiResponse.<ShowtimePlannerPreviewResponse>builder()
                .message("Đã kiểm tra khả năng xếp quota.")
                .result(showtimePlannerService.validateQuota(request))
                .build();
    }

    /**
     * ADMIN - Tính sức xếp tối đa riêng của từng phiên bản theo ngày, phòng và cấu hình.
     * POST /showtimes/admin/planner/capacity
     */
    @PostMapping("/admin/planner/capacity")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimePlannerCapacityResponse> calculatePlannerCapacity(
            @Valid @RequestBody ShowtimePlannerCapacityRequest request) {
        return ApiResponse.<ShowtimePlannerCapacityResponse>builder()
                .message("Đã tính số suất tối đa của từng phiên bản.")
                .result(showtimePlannerService.calculateCapacity(request))
                .build();
    }

    /**
     * ADMIN - Đề xuất quota theo dữ liệu bán vé gần đây và đặc điểm phim, chưa ghi database.
     * POST /showtimes/admin/planner/recommendations
     */
    @PostMapping("/admin/planner/recommendations")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimePlannerRecommendationResponse> recommendPlannerQuota(
            @Valid @RequestBody ShowtimePlannerCapacityRequest request) {
        return ApiResponse.<ShowtimePlannerRecommendationResponse>builder()
                .message("Đã tính số suất đề xuất.")
                .result(showtimePlannerService.recommendShowtimeCounts(request))
                .build();
    }

    /**
     * ADMIN - Kiểm tra lại lịch xem trước và tạo suất chiếu trong một transaction.
     * POST /showtimes/admin/planner/confirm
     */
    @PostMapping("/admin/planner/confirm")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<List<ShowtimeResponse>> confirmPlannedShowtimes(
            @Valid @RequestBody ShowtimePlannerConfirmRequest request) {
        return ApiResponse.<List<ShowtimeResponse>>builder()
                .message("Tạo lịch chiếu tối ưu thành công!")
                .result(showtimePlannerService.confirm(request))
                .build();
    }

    /**
     * ADMIN - Cap nhat suat chieu.
     * PUT /showtimes/admin/{showtimeId}
     */
    @PutMapping("/admin/{showtimeId}")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<ShowtimeResponse> updateShowtime(
            @PathVariable Long showtimeId,
            @Valid @RequestBody ShowtimeAdminRequest request) {
        return ApiResponse.<ShowtimeResponse>builder()
                .message("Cap nhat suat chieu thanh cong!")
                .result(showtimeService.updateShowtime(showtimeId, request))
                .build();
    }

    /**
     * ADMIN - Huy suat chieu, khong xoa cung du lieu.
     * PATCH /showtimes/admin/{showtimeId}/cancel
     */
    @PatchMapping("/admin/{showtimeId}/cancel")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<String> cancelShowtime(@PathVariable Long showtimeId) {
        showtimeService.cancelShowtime(showtimeId);
        return ApiResponse.<String>builder()
                .message("Huy suat chieu thanh cong!")
                .build();
    }

    /**
     * ADMIN - Huy nhieu suat chieu trong mot transaction.
     * PATCH /showtimes/admin/bulk-cancel
     */
    @PatchMapping("/admin/bulk-cancel")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<Integer> cancelShowtimes(@RequestBody List<Long> showtimeIds) {
        int cancelledCount = showtimeService.cancelShowtimes(showtimeIds);
        return ApiResponse.<Integer>builder()
                .message("Huy suat chieu hang loat thanh cong!")
                .result(cancelledCount)
                .build();
    }

    /**
     * Lấy danh sách các ngày có suất chiếu hợp lệ.
     * GET /showtimes/dates
     */
    @GetMapping("/dates")
    public ApiResponse<List<LocalDate>> getValidScreeningDates() {
        return ApiResponse.<List<LocalDate>>builder()
                .result(showtimeService.getValidScreeningDates())
                .build();
    }

    /**
     * Lấy danh sách suất chiếu theo ngày, nhóm theo phim.
     * GET /showtimes?date=2024-06-25
     */
    @GetMapping
    public ApiResponse<List<MovieShowtimeByDateResponse>> getShowtimesByDate(
            @RequestParam String date) {
        ShowtimeService.MovieShowtimesByDateResult result = showtimeService.getShowtimesByDateResult(date);
        return ApiResponse.<List<MovieShowtimeByDateResponse>>builder()
                .message(result.message())
                .result(result.content())
                .build();
    }

    /**
     * Lấy chi tiết suất chiếu cho User.
     * GET /showtimes/{showtimeId}
     */
    @GetMapping("/{showtimeId}")
    public ApiResponse<ShowtimeResponse> getShowtime(@PathVariable Long showtimeId) {
        return ApiResponse.<ShowtimeResponse>builder()
                .result(showtimeService.getPublicShowtime(showtimeId))
                .build();
    }
}
