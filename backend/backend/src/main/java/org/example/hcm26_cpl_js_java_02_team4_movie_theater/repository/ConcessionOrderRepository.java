package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ConcessionOrder;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ConcessionOrderRepository extends JpaRepository<ConcessionOrder, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM ConcessionOrder o WHERE o.concessionOrderId = :id")
    Optional<ConcessionOrder> findByIdForUpdate(@Param("id") Long id);

    Page<ConcessionOrder> findByCreatedAtBetweenAndStatus(LocalDateTime from, LocalDateTime to,
                                                            ConcessionOrderStatus status, Pageable pageable);

    Page<ConcessionOrder> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM ConcessionOrder o WHERE o.cashierShift.cashierShiftId = :shiftId AND o.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus.PAID AND o.paymentMethod = :method")
    Long sumPaidAmountByShiftAndPaymentMethod(@Param("shiftId") Long shiftId, @Param("method") PaymentMethod method);
}
