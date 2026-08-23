package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionUsageStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "promotion_usage",
        uniqueConstraints = @UniqueConstraint(name = "uk_promotion_usage_booking", columnNames = "booking_id"),
        indexes = {
                @Index(name = "idx_promotion_usage_limit", columnList = "promotion_id,user_id,status"),
                @Index(name = "idx_promotion_usage_created", columnList = "created_at")
        })
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "promotion_usage_id")
    Long promotionUsageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "promotion_id", nullable = false)
    Promotion promotion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    Booking booking;

    @Column(name = "promotion_code", nullable = false, length = 50)
    String promotionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "promotion_type", nullable = false, length = 30)
    PromotionType promotionType;

    @Column(name = "member_tier", length = 50)
    String memberTier;

    @Column(name = "birthday")
    LocalDate birthday;

    @Column(name = "birthday_cycle_year")
    Integer birthdayCycleYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    PaymentMethod paymentMethod;

    @Column(name = "original_amount", nullable = false)
    Integer originalAmount;

    @Column(name = "discount_amount", nullable = false)
    Integer discountAmount;

    @Column(name = "final_amount", nullable = false)
    Integer finalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    PromotionUsageStatus status;

    @Column(name = "reserved_at", nullable = false)
    LocalDateTime reservedAt;

    @Column(name = "payment_initiated_at")
    LocalDateTime paymentInitiatedAt;

    @Column(name = "confirmed_at")
    LocalDateTime confirmedAt;

    @Column(name = "released_at")
    LocalDateTime releasedAt;

    @Column(name = "release_reason", length = 500)
    String releaseReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
