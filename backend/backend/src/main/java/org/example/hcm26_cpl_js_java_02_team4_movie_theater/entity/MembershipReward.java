package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardTarget;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "membership_rewards", indexes = {
        @Index(name = "idx_membership_reward_status_order", columnList = "status,display_order")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipReward {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rewardId;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(length = 500)
    private String terms;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipRewardType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MembershipRewardTarget target;

    @Column(nullable = false)
    private Integer pointCost;

    @Column(nullable = false)
    private Integer valueAmount;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(nullable = false)
    private Integer validityDays;

    @Column(nullable = false)
    private Integer maxRedemptionsPerCycle;

    @Column(nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipRewardStatus status;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
