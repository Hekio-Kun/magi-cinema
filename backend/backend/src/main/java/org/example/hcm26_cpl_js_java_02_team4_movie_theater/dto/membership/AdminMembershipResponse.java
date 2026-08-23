package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipEffectiveMode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPurchaseType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class AdminMembershipResponse {
    Long membershipId;
    String userId;
    String username;
    String email;
    String fullName;
    String phoneNumber;
    Integer loyaltyPoints;
    LocalDateTime pointsExpireAt;
    String planCode;
    String planName;
    MembershipStatus status;
    Integer pricePaid;
    LocalDateTime startAt;
    LocalDateTime endAt;
    LocalDateTime createdAt;
    LocalDateTime activatedAt;
    LocalDateTime cancelledAt;
    BigDecimal ticketDiscountPercent;
    BigDecimal comboDiscountPercent;
    BigDecimal pointMultiplier;
    MembershipPurchaseType purchaseType;
    MembershipEffectiveMode effectiveMode;
    Integer originalPrice;
    Integer creditAmount;
    String memberCode;
    Long annualSpend;
    Integer spendYear;
    BigDecimal ticketEarnPercent;
    BigDecimal concessionEarnPercent;
    Long nextTierSpend;
    Long spendToNextTier;
    Integer availableFreeTickets;
    LocalDateTime tierSince;
}
