package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CashierShift;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierShiftStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CashierShiftRepository extends JpaRepository<CashierShift, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM CashierShift s WHERE s.cashierShiftId = :id")
    Optional<CashierShift> findByIdForUpdate(@Param("id") Long id);

    Optional<CashierShift> findFirstByCashier_UserIdAndStatusOrderByOpenedAtDesc(String userId, CashierShiftStatus status);

    Page<CashierShift> findAllByOrderByOpenedAtDesc(Pageable pageable);
}
