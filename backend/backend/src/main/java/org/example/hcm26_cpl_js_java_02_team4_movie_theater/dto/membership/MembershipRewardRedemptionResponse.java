package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipRewardRedemptionResponse {
    private Long redemptionId;
    private String redemptionCode;
    private String rewardName;
    private String rewardType;
    private String rewardTarget;
    private Integer pointsSpent;
    private String terms;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime usedAt;
    private LocalDateTime createdAt;
    private Integer pointsBalance;
}
