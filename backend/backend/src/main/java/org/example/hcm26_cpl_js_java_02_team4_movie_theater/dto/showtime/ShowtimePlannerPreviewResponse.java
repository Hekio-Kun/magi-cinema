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
public class ShowtimePlannerPreviewResponse {
    Boolean complete;
    Integer totalRequested;
    Integer totalScheduled;
    Integer totalMissing;
    Integer additionalPossible;

    @Builder.Default
    Map<String, Integer> additionalByFormat = new LinkedHashMap<>();

    @Builder.Default
    List<ShowtimePlannerPreviewItem> items = new ArrayList<>();

    @Builder.Default
    List<ShowtimePlannerAllocationSummary> allocations = new ArrayList<>();

    @Builder.Default
    List<ShowtimePlannerIssue> issues = new ArrayList<>();
}
