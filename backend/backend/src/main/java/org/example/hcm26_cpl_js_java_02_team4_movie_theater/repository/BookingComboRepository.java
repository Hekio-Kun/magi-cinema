package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.BookingCombo;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingComboRepository extends JpaRepository<BookingCombo, Long> {
    List<BookingCombo> findByBooking_BookingId(Long bookingId);
    boolean existsByCombo_ComboId(Long comboId);

    @Query("""
            select coalesce(sum(bc.price), 0)
            from BookingCombo bc
            where bc.combo.comboId = :comboId
              and bc.booking.status = :status
            """)
    Long sumRevenueByComboIdAndBookingStatus(
            @Param("comboId") Long comboId,
            @Param("status") BookingStatus status);
}
