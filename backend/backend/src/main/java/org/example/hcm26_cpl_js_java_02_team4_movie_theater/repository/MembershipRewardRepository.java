package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipReward;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MembershipRewardRepository extends JpaRepository<MembershipReward, Long> {
    Optional<MembershipReward> findByCodeIgnoreCase(String code);
    List<MembershipReward> findByStatusOrderByDisplayOrderAscRewardIdAsc(MembershipRewardStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select reward from MembershipReward reward where reward.rewardId = :rewardId")
    Optional<MembershipReward> findByIdForUpdate(@Param("rewardId") Long rewardId);
}
