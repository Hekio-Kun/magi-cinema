package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionEvaluationResponse {
    Long promotionId;
    String name;
    String code;
    String description;
    Integer originalAmount;
    Integer discountAmount;
    Integer finalAmount;
}
