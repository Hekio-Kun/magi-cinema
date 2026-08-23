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
public class ShowtimePlannerCapacityResponse {
    Integer totalMaximum;
    Integer planningDays;

    @Builder.Default
    Map<String, Integer> maximumByFormat = new LinkedHashMap<>();

    @Builder.Default
    List<ShowtimePlannerCapacityItem> items = new ArrayList<>();
}
