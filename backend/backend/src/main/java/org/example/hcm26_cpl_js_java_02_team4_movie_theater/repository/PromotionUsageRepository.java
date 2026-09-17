package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PromotionUsage;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionUsageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT usage FROM PromotionUsage usage WHERE usage.booking.bookingId = :bookingId")
    Optional<PromotionUsage> findByBookingIdForUpdate(@Param("bookingId") Long bookingId);

    Optional<PromotionUsage> findByBooking_BookingId(Long bookingId);

    boolean existsByPromotion_PromotionId(Long promotionId);

    long countByPromotion_PromotionIdAndStatusIn(
            Long promotionId,
            Collection<PromotionUsageStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(usage.discountAmount), 0)
            FROM PromotionUsage usage
            WHERE usage.promotion.promotionId = :promotionId
              AND usage.status IN :statuses
            """)
    long sumDiscountAmount(
            @Param("promotionId") Long promotionId,
            @Param("statuses") Collection<PromotionUsageStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(usage.originalAmount), 0)
            FROM PromotionUsage usage
            WHERE usage.promotion.promotionId = :promotionId
              AND usage.status IN :statuses
            """)
    long sumOriginalAmount(
            @Param("promotionId") Long promotionId,
            @Param("statuses") Collection<PromotionUsageStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(usage.finalAmount), 0)
            FROM PromotionUsage usage
            WHERE usage.promotion.promotionId = :promotionId
              AND usage.status IN :statuses
            """)
    long sumFinalAmount(
            @Param("promotionId") Long promotionId,
            @Param("statuses") Collection<PromotionUsageStatus> statuses);

    long countByPromotion_PromotionIdAndUser_UserIdAndStatusIn(
            Long promotionId,
            String userId,
            Collection<PromotionUsageStatus> statuses);

    long countByPromotion_PromotionIdAndUser_UserIdAndBirthdayCycleYearAndStatusIn(
            Long promotionId,
            String userId,
            Integer birthdayCycleYear,
            Collection<PromotionUsageStatus> statuses);

    long countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
            String userId,
            Collection<PromotionType> promotionTypes,
            Integer birthdayCycleYear,
            Collection<PromotionUsageStatus> statuses);

    List<PromotionUsage> findAllByOrderByCreatedAtDesc();

    List<PromotionUsage> findByUser_UserIdOrderByCreatedAtDesc(String userId);
}
