package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionUsageStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionUsageResponse {
    Long promotionUsageId;
    Long promotionId;
    Long bookingId;
    String userId;
    String username;
    String promotionCode;
    PromotionType promotionType;
    String memberTier;
    LocalDate birthday;
    Integer birthdayCycleYear;
    PaymentMethod paymentMethod;
    Integer originalAmount;
    Integer discountAmount;
    Integer finalAmount;
    PromotionUsageStatus status;
    LocalDateTime reservedAt;
    LocalDateTime paymentInitiatedAt;
    LocalDateTime confirmedAt;
    LocalDateTime releasedAt;
    String releaseReason;
}
