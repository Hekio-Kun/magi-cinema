package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRedemptionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardTarget;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "membership_reward_redemptions", indexes = {
        @Index(name = "idx_reward_redemption_member_created", columnList = "membership_id,created_at"),
        @Index(name = "idx_reward_redemption_code", columnList = "redemption_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipRewardRedemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long redemptionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private UserMembership membership;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reward_id", nullable = false)
    private MembershipReward reward;

    @Column(name = "redemption_code", nullable = false, unique = true, length = 32)
    private String redemptionCode;

    @Column(nullable = false, length = 120)
    private String rewardNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipRewardType rewardTypeSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MembershipRewardTarget rewardTargetSnapshot;

    @Column(nullable = false)
    private Integer pointsSpent;

    @Column(nullable = false)
    private Integer valueAmountSnapshot;

    @Column(length = 500)
    private String termsSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipRedemptionStatus status;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime usedAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
