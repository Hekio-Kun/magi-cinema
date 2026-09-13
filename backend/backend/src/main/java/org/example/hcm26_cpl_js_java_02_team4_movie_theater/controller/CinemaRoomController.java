package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomSeatSummaryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomOperationalSummaryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.SeatLayoutRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CinemaRoomService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CinemaRoomLayoutService;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/cinema-rooms")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaRoomController {

    CinemaRoomService cinemaRoomService;
    CinemaRoomLayoutService cinemaRoomLayoutService;


    @GetMapping
    public ApiResponse<PageResponse<CinemaRoomResponse>> getCinemaRooms(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) RoomStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<CinemaRoomResponse>>builder()
                .result(cinemaRoomService.getCinemaRooms(keyword, status, page, size))
                .build();
    }

    @GetMapping("/{roomId}")
    public ApiResponse<CinemaRoomResponse> getCinemaRoomById(@PathVariable Long roomId) {
        return ApiResponse.<CinemaRoomResponse>builder()
                .result(cinemaRoomService.getCinemaRoomById(roomId))
                .build();
    }

    @GetMapping("/{roomId}/seat-summary")
    public ApiResponse<CinemaRoomSeatSummaryResponse> getSeatSummary(@PathVariable Long roomId) {
        return ApiResponse.<CinemaRoomSeatSummaryResponse>builder()
                .result(cinemaRoomLayoutService.getSeatSummary(roomId))
                .build();
    }

    @GetMapping("/operational-summary")
    public ApiResponse<CinemaRoomOperationalSummaryResponse> getOperationalSummary() {
        return ApiResponse.<CinemaRoomOperationalSummaryResponse>builder()
                .result(cinemaRoomLayoutService.getOperationalSummary())
                .build();
    }

    @PostMapping("/{roomId}/seat-layout")
    public ApiResponse<java.util.List<SeatResponse>> applySeatLayout(
            @PathVariable Long roomId,
            @RequestBody @Valid SeatLayoutRequest request) {
        return ApiResponse.<java.util.List<SeatResponse>>builder()
                .message("Cập nhật sơ đồ ghế thành công!")
                .result(cinemaRoomLayoutService.applyLayout(roomId, request))
                .build();
    }

    @PostMapping
    public ApiResponse<CinemaRoomResponse> createCinemaRoom(@RequestBody @Valid CinemaRoomCreationRequest request) {
        return ApiResponse.<CinemaRoomResponse>builder()
                .message("Tạo phòng chiếu thành công!")
                .result(cinemaRoomService.createCinemaRoom(request))
                .build();
    }

    @PutMapping("/{roomId}")
    public ApiResponse<CinemaRoomResponse> updateCinemaRoom(
            @PathVariable Long roomId,
            @RequestBody @Valid CinemaRoomUpdateRequest request) {
        return ApiResponse.<CinemaRoomResponse>builder()
                .message("Cập nhật phòng chiếu thành công!")
                .result(cinemaRoomService.updateCinemaRoom(roomId, request))
                .build();
    }

    @DeleteMapping("/{roomId}")
    public ApiResponse<String> deleteCinemaRoom(@PathVariable Long roomId) {
        log.info("Deactivating cinema room - ID: {}", roomId);
        cinemaRoomService.deleteCinemaRoom(roomId);
        return ApiResponse.<String>builder()
                .message("Vô hiệu hóa phòng chiếu thành công!")
                .build();
    }

    @PatchMapping("/{roomId}/restore")
    public ApiResponse<CinemaRoomResponse> restoreCinemaRoom(@PathVariable Long roomId) {
        log.info("Restoring cinema room - ID: {}", roomId);
        return ApiResponse.<CinemaRoomResponse>builder()
                .message("Khôi phục phòng chiếu thành công!")
                .result(cinemaRoomService.restoreCinemaRoom(roomId))
                .build();
    }
}
