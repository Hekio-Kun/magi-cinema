package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "membership_plans")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long planId;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    @ColumnDefault("0")
    private Integer price;

    @Column(nullable = false)
    private Integer durationDays;

    @Column(nullable = false, precision = 5, scale = 2)
    @ColumnDefault("0")
    private BigDecimal ticketDiscountPercent;

    @Column(nullable = false, precision = 5, scale = 2)
    @ColumnDefault("0")
    private BigDecimal comboDiscountPercent;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal pointMultiplier;

    private Integer maxTicketDiscount;
    private Integer maxComboDiscount;
    private Integer priorityBookingHours;

    /** Ngưỡng chi tiêu trong một chu kỳ hội viên 12 tháng để đạt hạng. */
    @Column(nullable = false)
    @ColumnDefault("0")
    @Builder.Default
    private Long annualSpendMin = 0L;

    private Long annualSpendMax;

    /** Phần trăm điểm được tích trên chi tiêu vé hợp lệ. */
    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    @ColumnDefault("0")
    private BigDecimal ticketEarnPercent = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    @ColumnDefault("0")
    private BigDecimal concessionEarnPercent = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    @ColumnDefault("0")
    private Integer annualFreeTickets = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private MembershipFreeTicketType freeTicketType = MembershipFreeTicketType.STANDARD_2D;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipPlanStatus status;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
