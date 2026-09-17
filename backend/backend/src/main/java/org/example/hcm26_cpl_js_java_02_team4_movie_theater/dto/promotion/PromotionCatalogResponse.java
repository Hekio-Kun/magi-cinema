package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionDiscountType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionCatalogResponse {
    Long promotionId;
    String name;
    String code;
    String description;
    PromotionType type;
    PromotionDiscountType discountType;
    Integer discountValue;
    Integer maxDiscountAmount;
    Integer minOrderAmount;
    String termsAndConditions;
    Set<BookingChannel> applicableChannels;
    LocalDateTime startAt;
    java.time.LocalTime dailyStartTime;
    java.time.LocalTime dailyEndTime;
    Set<String> eligibleMemberTiers;
    PaymentMethod walletPaymentMethod;
    LocalDateTime endAt;
}
