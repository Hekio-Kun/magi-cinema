package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipPointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MembershipPointTransactionRepository extends JpaRepository<MembershipPointTransaction, Long> {
    List<MembershipPointTransaction> findByMembership_MembershipIdOrderByCreatedAtDesc(Long membershipId);
    boolean existsByBooking_BookingIdAndType(Long bookingId,
        org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPointType type);
}
