package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerRecommendationItem {
    Long movieId;
    String movieName;
    Integer suggestedShowtimes;
    Integer maximumPossible;
    String confidence;
    Integer confidenceScore;
    Integer historicalShowtimeCount;
    Integer historicalTicketsSold;
    Double averageOccupancyRate;

    @Builder.Default
    Map<Long, Integer> suggestedByPresentation = new LinkedHashMap<>();

    @Builder.Default
    List<String> reasons = new ArrayList<>();
}
