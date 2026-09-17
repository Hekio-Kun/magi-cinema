package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BirthdayRule;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.LeapDayPolicy;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionDiscountType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UsageLimitType;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionResponse {
    Long promotionId;
    String name;
    String code;
    String description;
    PromotionType type;
    PromotionDiscountType discountType;
    Integer discountValue;
    Integer maxDiscountAmount;
    Integer minOrderAmount;
    Integer budgetLimit;
    long reservedDiscountAmount;
    long appliedDiscountAmount;
    long remainingBudget;
    long appliedOriginalAmount;
    long appliedNetAmount;
    long releasedUsageCount;
    Boolean publicVisible;
    Integer priority;
    String termsAndConditions;
    Set<BookingChannel> applicableChannels;
    LocalDateTime startAt;
    LocalDateTime endAt;
    LocalTime dailyStartTime;
    LocalTime dailyEndTime;
    PromotionStatus status;
    UsageLimitType totalUsageLimitType;
    Integer totalUsageLimit;
    UsageLimitType perCustomerUsageLimitType;
    Integer perCustomerUsageLimit;
    long reservedUsageCount;
    long appliedUsageCount;
    Set<String> eligibleMemberTiers;
    BirthdayRule birthdayRule;
    Integer birthdayDaysBefore;
    Integer birthdayDaysAfter;
    LeapDayPolicy leapDayPolicy;
    Integer birthdayMinProfileAgeDays;
    PaymentMethod walletPaymentMethod;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
