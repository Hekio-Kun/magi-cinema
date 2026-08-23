package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserMembership;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserMembershipRepository extends JpaRepository<UserMembership, Long> {
    Optional<UserMembership> findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(
            String userId, MembershipStatus status);

    Optional<UserMembership> findByMemberCodeIgnoreCase(String memberCode);

    boolean existsByUser_UserIdAndStatus(String userId, MembershipStatus status);
    Optional<UserMembership> findFirstByUser_UserIdAndStatusAndStartAtLessThanEqualAndEndAtAfterOrderByEndAtDesc(
            String userId, MembershipStatus status, LocalDateTime startAt, LocalDateTime endAt);

    List<UserMembership> findByUser_UserIdOrderByCreatedAtDesc(String userId);

    List<UserMembership> findByStatusAndEndAtLessThanEqual(MembershipStatus status, LocalDateTime time);

    List<UserMembership> findAllByOrderByCreatedAtDesc();

    @Query("select m from UserMembership m join fetch m.plan")
    List<UserMembership> findAllWithPlan();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from UserMembership m where m.membershipId = :id")
    Optional<UserMembership> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from UserMembership m where m.membershipId = (select max(m2.membershipId) from UserMembership m2 where m2.user.userId = :userId and m2.status = :status)")
    Optional<UserMembership> findFirstByUserAndStatusForUpdate(
            @Param("userId") String userId, @Param("status") MembershipStatus status);
}
