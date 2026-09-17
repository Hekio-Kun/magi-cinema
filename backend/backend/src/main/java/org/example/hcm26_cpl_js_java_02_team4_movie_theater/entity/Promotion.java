package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BirthdayRule;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.LeapDayPolicy;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionDiscountType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UsageLimitType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(
        name = "promotion",
        uniqueConstraints = @UniqueConstraint(name = "uk_promotion_code", columnNames = "code"),
        indexes = {
                @Index(name = "idx_promotion_status_time", columnList = "status,start_at,end_at"),
                @Index(name = "idx_promotion_type", columnList = "promotion_type")
        })
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "promotion_id")
    Long promotionId;

    @Column(name = "name", nullable = false, length = 150)
    String name;

    @Column(name = "code", nullable = false, length = 50)
    String code;

    @Column(name = "description", length = 1000)
    String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "promotion_type", nullable = false, length = 30)
    PromotionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 30)
    PromotionDiscountType discountType;

    @Column(name = "discount_value", nullable = false)
    Integer discountValue;

    @Column(name = "max_discount_amount")
    Integer maxDiscountAmount;

    @Column(name = "min_order_amount")
    Integer minOrderAmount;

    @Column(name = "budget_limit")
    Integer budgetLimit;

    @Builder.Default
    @Column(name = "public_visible", nullable = false, columnDefinition = "boolean default true")
    Boolean publicVisible = true;

    @Builder.Default
    @Column(name = "priority", nullable = false, columnDefinition = "integer default 0")
    Integer priority = 0;

    @Column(name = "terms_and_conditions", length = 2000)
    String termsAndConditions;

    @Builder.Default
    @Column(name = "online_enabled", nullable = false, columnDefinition = "boolean default true")
    Boolean onlineEnabled = true;

    @Builder.Default
    @Column(name = "counter_enabled", nullable = false, columnDefinition = "boolean default true")
    Boolean counterEnabled = true;

    @Column(name = "start_at", nullable = false)
    LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    LocalDateTime endAt;

    @Column(name = "daily_start_time")
    LocalTime dailyStartTime;

    @Column(name = "daily_end_time")
    LocalTime dailyEndTime;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    PromotionStatus status = PromotionStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(
            name = "total_usage_limit_type",
            nullable = false,
            length = 20,
            columnDefinition = "varchar(20) default 'UNLIMITED'")
    UsageLimitType totalUsageLimitType = UsageLimitType.UNLIMITED;

    @Column(name = "total_usage_limit")
    Integer totalUsageLimit;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(
            name = "per_customer_usage_limit_type",
            nullable = false,
            length = 20,
            columnDefinition = "varchar(20) default 'UNLIMITED'")
    UsageLimitType perCustomerUsageLimitType = UsageLimitType.UNLIMITED;

    @Column(name = "per_customer_usage_limit")
    Integer perCustomerUsageLimit;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "promotion_member_tier",
            joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "member_tier", nullable = false, length = 50)
    @Builder.Default
    Set<String> eligibleMemberTiers = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "birthday_rule", length = 30)
    BirthdayRule birthdayRule;

    @Column(name = "birthday_days_before")
    Integer birthdayDaysBefore;

    @Column(name = "birthday_days_after")
    Integer birthdayDaysAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "leap_day_policy", length = 30)
    LeapDayPolicy leapDayPolicy;

    @Column(name = "birthday_min_profile_age_days")
    Integer birthdayMinProfileAgeDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_payment_method", length = 30)
    PaymentMethod walletPaymentMethod;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(name = "deactivated_at")
    LocalDateTime deactivatedAt;

    public Set<BookingChannel> getApplicableChannels() {
        Set<BookingChannel> channels = new LinkedHashSet<>();
        if (Boolean.TRUE.equals(onlineEnabled)) {
            channels.add(BookingChannel.ONLINE);
        }
        if (Boolean.TRUE.equals(counterEnabled)) {
            channels.add(BookingChannel.COUNTER);
        }
        return channels;
    }
}
