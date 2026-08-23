package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipEffectiveMode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPurchaseType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class MembershipResponse {
    Long membershipId;
    String planCode;
    String planName;
    MembershipStatus status;
    Integer pricePaid;
    LocalDateTime startAt;
    LocalDateTime endAt;
    BigDecimal ticketDiscountPercent;
    BigDecimal comboDiscountPercent;
    BigDecimal pointMultiplier;
    MembershipPurchaseType purchaseType;
    MembershipEffectiveMode effectiveMode;
    Integer originalPrice;
    Integer creditAmount;
    Integer remainingDaysAtPurchase;
    String memberCode;
    Long annualSpend;
    Integer spendYear;
    Integer loyaltyPoints;
    LocalDateTime pointsExpireAt;
    Long nextTierSpend;
    Long spendToNextTier;
    BigDecimal ticketEarnPercent;
    BigDecimal concessionEarnPercent;
    Integer availableFreeTickets;
    LocalDateTime joinedAt;
    LocalDateTime tierSince;
}
