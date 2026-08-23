package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Promotion;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    Optional<Promotion> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndPromotionIdNot(String code, Long promotionId);

    @Query("""
            SELECT CASE WHEN COUNT(promotion) > 0 THEN true ELSE false END
            FROM Promotion promotion
            WHERE promotion.type = :type
              AND promotion.startAt < :yearEndExclusive
              AND promotion.endAt >= :yearStart
              AND (:excludedPromotionId IS NULL OR promotion.promotionId <> :excludedPromotionId)
            """)
    boolean existsPolicyInYear(
            @Param("type") PromotionType type,
            @Param("yearStart") LocalDateTime yearStart,
            @Param("yearEndExclusive") LocalDateTime yearEndExclusive,
            @Param("excludedPromotionId") Long excludedPromotionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT promotion FROM Promotion promotion WHERE promotion.promotionId = :promotionId")
    Optional<Promotion> findByIdForUpdate(@Param("promotionId") Long promotionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT promotion FROM Promotion promotion WHERE UPPER(promotion.code) = UPPER(:code)")
    Optional<Promotion> findByCodeForUpdate(@Param("code") String code);
}
