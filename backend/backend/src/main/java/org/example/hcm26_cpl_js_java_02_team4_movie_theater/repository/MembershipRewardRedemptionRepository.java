package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipRewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MembershipRewardRedemptionRepository extends JpaRepository<MembershipRewardRedemption, Long> {
    List<MembershipRewardRedemption> findByMembership_MembershipIdOrderByCreatedAtDesc(Long membershipId);
    long countByMembership_MembershipIdAndReward_RewardIdAndCreatedAtGreaterThanEqual(
            Long membershipId, Long rewardId, LocalDateTime cycleStart);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select redemption from MembershipRewardRedemption redemption where upper(redemption.redemptionCode) = upper(:code)")
    Optional<MembershipRewardRedemption> findByCodeForUpdate(@Param("code") String code);

    Optional<MembershipRewardRedemption> findByRedemptionCodeIgnoreCase(String code);
}
