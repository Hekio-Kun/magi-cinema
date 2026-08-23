package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerLockedItemRequest {
    String clientKey;

    @NotNull Long movieId;
    @NotNull Long presentationId;
    @NotNull Long cinemaRoomId;
    @NotNull LocalDate showDate;
    @NotNull LocalTime startTime;
    @NotNull LocalTime endTime;
    @Positive Integer basePrice;
}
