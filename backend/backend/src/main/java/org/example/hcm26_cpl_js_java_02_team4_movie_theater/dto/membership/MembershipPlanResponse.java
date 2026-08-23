package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;

@Value
@Builder
public class MembershipPlanResponse {
    Long planId;
    String code;
    String name;
    String description;
    Integer price;
    Integer durationDays;
    BigDecimal ticketDiscountPercent;
    BigDecimal comboDiscountPercent;
    BigDecimal pointMultiplier;
    Integer maxTicketDiscount;
    Integer maxComboDiscount;
    Integer priorityBookingHours;
    MembershipPlanStatus status;
    Long annualSpendMin;
    Long annualSpendMax;
    BigDecimal ticketEarnPercent;
    BigDecimal concessionEarnPercent;
    Integer annualFreeTickets;
    MembershipFreeTicketType freeTicketType;
}
