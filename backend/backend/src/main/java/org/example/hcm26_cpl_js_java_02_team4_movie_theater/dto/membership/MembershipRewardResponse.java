package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipRewardResponse {
    private Long rewardId;
    private String code;
    private String name;
    private String description;
    private String terms;
    private String type;
    private String target;
    private Integer pointCost;
    private Integer valueAmount;
    private Integer stockQuantity;
    private Integer validityDays;
    private Integer maxRedemptionsPerCycle;
    private Integer redeemedThisCycle;
    private Boolean redeemable;
    private String unavailableReason;
    private String status;
    private Integer displayOrder;
}
