package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierReconciliationStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierShiftStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "cashier_shift", indexes = {
        @Index(name = "idx_cashier_shift_cashier_status", columnList = "cashier_user_id,status"),
        @Index(name = "idx_cashier_shift_opened_at", columnList = "opened_at")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CashierShift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cashier_shift_id")
    Long cashierShiftId;

    @Column(name = "shift_code", nullable = false, unique = true, length = 32)
    String shiftCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cashier_user_id", nullable = false)
    User cashier;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    CashierShiftStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status", nullable = false, length = 30)
    CashierReconciliationStatus reconciliationStatus;

    @Column(name = "opening_cash", nullable = false)
    Long openingCash;

    @Column(name = "expected_cash")
    Long expectedCash;

    @Column(name = "actual_cash")
    Long actualCash;

    @Column(name = "variance")
    Long variance;

    @Column(name = "cash_sales", nullable = false)
    @Builder.Default
    Long cashSales = 0L;

    @Column(name = "transfer_sales", nullable = false)
    @Builder.Default
    Long transferSales = 0L;

    @Column(name = "ticket_sales", nullable = false)
    @Builder.Default
    Long ticketSales = 0L;

    @Column(name = "concession_sales", nullable = false)
    @Builder.Default
    Long concessionSales = 0L;

    @Column(name = "opened_note", length = 500)
    String openedNote;

    @Column(name = "closing_note", length = 500)
    String closingNote;

    @Column(name = "approval_note", length = 500)
    String approvalNote;

    @CreationTimestamp
    @Column(name = "opened_at", nullable = false, updatable = false)
    LocalDateTime openedAt;

    @Column(name = "closed_at")
    LocalDateTime closedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    User approvedBy;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @OneToMany(mappedBy = "cashierShift")
    List<Booking> bookings;

    @OneToMany(mappedBy = "cashierShift")
    List<ConcessionOrder> concessionOrders;
}
