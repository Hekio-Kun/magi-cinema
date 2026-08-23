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
public class ShowtimePlannerCapacityRequest {
    @NotNull LocalDate fromDate;
    @NotNull LocalDate toDate;

    @Builder.Default
    LocalTime openingTime = LocalTime.of(8, 0);

    @Builder.Default
    LocalTime latestFinishTime = LocalTime.of(2, 0);

    @Min(0)
    @Max(120)
    @Builder.Default
    Integer turnaroundMinutes = 20;

    @Min(5)
    @Max(60)
    @Builder.Default
    Integer slotIntervalMinutes = 15;

    @Builder.Default
    LocalTime primeStartTime = LocalTime.of(18, 0);

    @Builder.Default
    LocalTime primeEndTime = LocalTime.of(22, 30);

    @NotEmpty
    @Builder.Default
    List<Long> cinemaRoomIds = new ArrayList<>();

    @Valid
    @NotEmpty
    @Builder.Default
    List<ShowtimePlannerMovieSelectionRequest> movies = new ArrayList<>();
}
