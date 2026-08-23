package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class MembershipAdminSummaryResponse {
    long activeMembers;
    long pendingPayments;
    long scheduledMemberships;
    long expiringWithinSevenDays;
    long newRegistrationsThisMonth;
    long revenueThisMonth;
    Map<String, Long> activeByPlan;
    long totalPointsBalance;
    long totalAnnualSpend;
    long joinedThisMonth;
}
