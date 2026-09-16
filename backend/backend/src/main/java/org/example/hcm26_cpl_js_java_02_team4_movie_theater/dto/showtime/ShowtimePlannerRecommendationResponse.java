package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerRecommendationResponse {
    Integer planningDays;
    Integer totalSuggested;
    Integer totalMaximum;
    Double targetOccupancyRate;
    LocalDate historyFrom;
    LocalDate historyTo;
    Boolean usedHistoricalData;

    @Builder.Default
    List<ShowtimePlannerRecommendationItem> items = new ArrayList<>();
}
