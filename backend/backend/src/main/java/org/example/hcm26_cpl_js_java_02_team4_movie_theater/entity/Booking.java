package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CounterCustomerType;

@Entity
@Table(name = "booking", indexes = {
        @Index(name = "uk_booking_ticket_qr_token", columnList = "ticket_qr_token", unique = true)
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    Long bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    Showtime showtime;

    @Column(name = "total_amount")
    Integer totalAmount;

    @Column(name = "original_amount")
    Integer originalAmount;

    @Builder.Default
    @Column(name = "discount_amount")
    Integer discountAmount = 0;

    @Column(name = "promotion_code", length = 50)
    String promotionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id")
    Promotion promotion;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    BookingStatus status;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'ONLINE'")
    @Column(name = "booking_channel", length = 20, nullable = false)
    BookingChannel bookingChannel = BookingChannel.ONLINE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sold_by_user_id")
    User soldBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "counter_customer_type", length = 20)
    CounterCustomerType counterCustomerType;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "loyalty_points_earned", nullable = false)
    Integer loyaltyPointsEarned = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id")
    UserMembership membership;

    @Column(name = "membership_plan_code", length = 30)
    String membershipPlanCode;

    @Column(name = "membership_plan_name", length = 80)
    String membershipPlanName;

    @Column(name = "ticket_subtotal")
    Integer ticketSubtotal;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "membership_point_eligible_ticket_subtotal", nullable = false)
    Integer membershipPointEligibleTicketSubtotal = 0;

    @Column(name = "concession_subtotal")
    Integer concessionSubtotal;

    @Column(name = "membership_ticket_discount")
    Integer membershipTicketDiscount;

    @Column(name = "membership_concession_discount")
    Integer membershipConcessionDiscount;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "membership_free_tickets_used", nullable = false)
    Integer membershipFreeTicketsUsed = 0;

    @Column(name = "voucher_discount")
    Integer voucherDiscount;

    @Builder.Default
    @ColumnDefault("false")
    @Column(name = "is_scanned", nullable = false)
    Boolean isScanned = false;

    @OneToOne(mappedBy = "booking", fetch = FetchType.LAZY)
    MembershipRewardRedemption membershipRewardRedemption;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "membership_reward_discount", nullable = false)
    Integer membershipRewardDiscount = 0;

    @Column(name = "point_multiplier_applied", precision = 4, scale = 2)
    BigDecimal pointMultiplierApplied;

    @Column(name = "membership_ticket_earn_percent", precision = 5, scale = 2)
    BigDecimal membershipTicketEarnPercent;

    @Column(name = "membership_concession_earn_percent", precision = 5, scale = 2)
    BigDecimal membershipConcessionEarnPercent;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "loyalty_points_redeemed", nullable = false)
    Integer loyaltyPointsRedeemed = 0;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "membership_eligible_spend", nullable = false)
    Integer membershipEligibleSpend = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @Column(name = "ticket_qr_token", unique = true, length = 32)
    String ticketQrToken;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    List<Ticket> tickets;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    List<BookingCombo> bookingCombos;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    List<BookingFoodItem> bookingFoodItems;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    List<BookingFoodStockReservation> foodStockReservations;

    public boolean ensureTicketQrToken() {
        if (ticketQrToken != null && !ticketQrToken.isBlank()) {
            return false;
        }
        ticketQrToken = UUID.randomUUID().toString().replace("-", "");
        return true;
    }
}
