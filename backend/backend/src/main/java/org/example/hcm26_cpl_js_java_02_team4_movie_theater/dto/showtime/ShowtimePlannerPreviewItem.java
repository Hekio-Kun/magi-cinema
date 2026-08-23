package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

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
public class ShowtimePlannerPreviewItem {
    String clientKey;
    Long movieId;
    String movieName;
    Long presentationId;
    String presentationName;
    Long cinemaRoomId;
    String cinemaRoomName;
    LocalDate showDate;
    LocalTime startTime;
    LocalTime endTime;
    Integer basePrice;
    Integer qualityScore;
    Boolean locked;

    @Builder.Default
    List<String> qualityReasons = new ArrayList<>();
}
