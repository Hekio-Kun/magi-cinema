package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerIssue {
    String code;
    String severity;
    String message;
    Long movieId;
    Long presentationId;
    Long cinemaRoomId;
    Integer requested;
    Integer scheduled;
    Integer missing;

    @Builder.Default
    Map<String, Integer> blockerCounts = new LinkedHashMap<>();
}
