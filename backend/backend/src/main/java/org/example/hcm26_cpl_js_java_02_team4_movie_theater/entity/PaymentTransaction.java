package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentTransactionStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions", indexes = {
        @Index(name = "idx_payment_tx_booking_created", columnList = "booking_id,created_at"),
        @Index(name = "idx_payment_tx_status_created", columnList = "status,created_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_payment_tx_method_reference", columnNames = {"payment_method", "provider_reference"}),
        @UniqueConstraint(name = "uk_payment_tx_method_provider_tx", columnNames = {"payment_method", "provider_transaction_id"})
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_transaction_id")
    Long paymentTransactionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    PaymentMethod paymentMethod;

    /** Mã lệnh do cổng cấp cho lần thanh toán, ví dụ MoMo orderId hoặc ZaloPay appTransId. */
    @Column(name = "provider_reference", nullable = false, length = 120)
    String providerReference;

    /** Mã giao dịch cuối cùng do cổng trả về sau khi thanh toán thành công. */
    @Column(name = "provider_transaction_id", length = 120)
    String providerTransactionId;

    @Column(name = "expected_amount", nullable = false)
    Long expectedAmount;

    @Column(name = "received_amount")
    Long receivedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    PaymentTransactionStatus status;

    @Column(name = "last_callback_message", length = 500)
    String lastCallbackMessage;

    @Column(name = "callback_received_at")
    LocalDateTime callbackReceivedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    Long version;
}
