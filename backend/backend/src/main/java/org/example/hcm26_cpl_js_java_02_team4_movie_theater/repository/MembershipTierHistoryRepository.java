package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipTierHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MembershipTierHistoryRepository extends JpaRepository<MembershipTierHistory, Long> {
    List<MembershipTierHistory> findByMembership_MembershipIdOrderByCreatedAtDesc(Long membershipId);
}
