package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "concession_order", indexes = {
        @Index(name = "idx_concession_order_created_at", columnList = "created_at"),
        @Index(name = "idx_concession_order_status", columnList = "status")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "concession_order_id")
    Long concessionOrderId;

    @Column(name = "order_code", nullable = false, unique = true, length = 32)
    String orderCode;

    @Column(name = "customer_name", length = 120)
    String customerName;

    @Column(name = "customer_phone", length = 30)
    String customerPhone;

    @Column(name = "total_amount", nullable = false)
    Long totalAmount;

    @Column(name = "cost_amount", nullable = false)
    @Builder.Default
    Long costAmount = 0L;

    @Column(name = "profit_amount", nullable = false)
    @Builder.Default
    Long profitAmount = 0L;

    @Column(name = "cash_received")
    Long cashReceived;

    @Column(name = "change_amount")
    @Builder.Default
    Long changeAmount = 0L;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    ConcessionOrderStatus status = ConcessionOrderStatus.PAID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sold_by_user_id")
    User soldBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_shift_id")
    CashierShift cashierShift;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "cancelled_at")
    LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    String cancelReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<ConcessionOrderItem> items;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<ConcessionOrderStockReservation> stockReservations;
}
