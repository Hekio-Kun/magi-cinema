package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipBenefit;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface MembershipBenefitRepository extends JpaRepository<MembershipBenefit, Long> {
    List<MembershipBenefit> findByMembership_MembershipIdOrderByCreatedAtDesc(Long membershipId);
    long countByMembership_MembershipIdAndTypeAndBenefitYear(
        Long membershipId, MembershipBenefitType type, Integer benefitYear);
    List<MembershipBenefit> findByStatusAndExpiresAtBefore(MembershipBenefitStatus status, java.time.LocalDate date);
    List<MembershipBenefit> findByType(MembershipBenefitType type);
    List<MembershipBenefit> findByBooking_BookingIdAndStatus(Long bookingId, MembershipBenefitStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from MembershipBenefit b join fetch b.membership m join fetch m.user where b.benefitId in :ids")
    List<MembershipBenefit> findAllByIdForUpdate(@Param("ids") List<Long> ids);
}
