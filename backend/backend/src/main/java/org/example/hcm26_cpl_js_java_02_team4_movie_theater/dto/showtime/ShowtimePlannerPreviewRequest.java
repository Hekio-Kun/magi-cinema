package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerPreviewRequest {
    @NotNull(message = "Ngày bắt đầu không được để trống")
    LocalDate fromDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    LocalDate toDate;

    @Builder.Default
    LocalTime openingTime = LocalTime.of(8, 0);

    @Builder.Default
    LocalTime latestFinishTime = LocalTime.of(2, 0);

    @Min(value = 0, message = "Thời gian dọn phòng không được âm")
    @Max(value = 120, message = "Thời gian dọn phòng không được vượt quá 120 phút")
    @Builder.Default
    Integer turnaroundMinutes = 20;

    @Min(value = 5, message = "Bước thời gian tối thiểu là 5 phút")
    @Max(value = 60, message = "Bước thời gian tối đa là 60 phút")
    @Builder.Default
    Integer slotIntervalMinutes = 15;

    @Builder.Default
    LocalTime primeStartTime = LocalTime.of(18, 0);

    @Builder.Default
    LocalTime primeEndTime = LocalTime.of(22, 30);

    /**
     * Treat the configured movie/presentation quotas as minimums, then keep
     * filling every usable room gap until no additional showtime can fit.
     */
    @Builder.Default
    Boolean maximizeSchedule = false;

    @NotEmpty(message = "Phải chọn ít nhất một phòng chiếu")
    @Builder.Default
    List<Long> cinemaRoomIds = new ArrayList<>();

    @Valid
    @NotEmpty(message = "Phải chọn ít nhất một phim")
    @Builder.Default
    List<ShowtimePlannerMovieRequest> movies = new ArrayList<>();

    @Valid
    @Builder.Default
    List<ShowtimePlannerLockedItemRequest> lockedItems = new ArrayList<>();
}
