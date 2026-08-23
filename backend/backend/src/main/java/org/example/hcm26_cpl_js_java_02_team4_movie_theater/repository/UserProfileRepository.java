package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByIdentityCard(String identityCard);
    boolean existsByPhoneNumberAndUserIdNot(String phoneNumber, String userId);
    boolean existsByIdentityCardAndUserIdNot(String identityCard, String userId);
    Optional<UserProfile> findByPhoneNumber(String phoneNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT profile FROM UserProfile profile WHERE profile.userId = :userId")
    Optional<UserProfile> findByUserIdForUpdate(@Param("userId") String userId);
}
