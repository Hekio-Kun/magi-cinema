package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerAllocationSummary {
    Long movieId;
    String movieName;
    Long presentationId;
    String presentationName;
    Integer requested;
    Integer scheduled;
    Integer missing;
    Integer maximumPossible;
    Integer additionalPossible;
    Integer maximumWithCurrentPlan;
    Integer movieAdditionalPossible;
    Integer movieMaximumWithCurrentPlan;
}
