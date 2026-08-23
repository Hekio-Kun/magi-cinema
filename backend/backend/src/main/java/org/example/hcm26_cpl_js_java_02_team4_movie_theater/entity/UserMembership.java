package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipEffectiveMode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPurchaseType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_memberships", indexes = {
        @Index(name = "idx_membership_user_status", columnList = "user_id,status"),
        @Index(name = "idx_membership_end_at", columnList = "end_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long membershipId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MembershipPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MembershipStatus status;

    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    private LocalDateTime activatedAt;
    private LocalDateTime cancelledAt;
    private Integer pricePaid;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MembershipPurchaseType purchaseType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MembershipEffectiveMode effectiveMode;

    private Integer originalPrice;
    private Integer creditAmount;
    private Integer remainingDaysAtPurchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_membership_id")
    private UserMembership previousMembership;

    @Column(nullable = false, length = 30)
    private String planCodeSnapshot;

    @Column(nullable = false, length = 80)
    private String planNameSnapshot;

    @Column(nullable = false)
    @ColumnDefault("0")
    private Integer durationDaysSnapshot;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal ticketDiscountSnapshot;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal comboDiscountSnapshot;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal pointMultiplierSnapshot;

    @Column(unique = true, length = 30)
    private String memberCode;

    @Column(nullable = false)
    @ColumnDefault("0")
    @Builder.Default
    private Long annualSpend = 0L;

    @Column(nullable = false)
    @ColumnDefault("2026")
    @Builder.Default
    private Integer spendYear = java.time.LocalDate.now().getYear();

    private LocalDateTime termsAcceptedAt;

    private LocalDateTime tierSince;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
