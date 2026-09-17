package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PromotionAnalyticsResponse {
    long totalPromotions;
    long activePromotions;
    long scheduledPromotions;
    long reservedUsages;
    long appliedUsages;
    long releasedUsages;
    long originalRevenue;
    long discountGranted;
    long netRevenue;
}
