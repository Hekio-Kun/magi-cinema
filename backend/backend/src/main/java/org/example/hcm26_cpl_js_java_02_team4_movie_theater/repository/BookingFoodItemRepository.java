package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.BookingFoodItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingFoodItemRepository extends JpaRepository<BookingFoodItem, Long> {
    List<BookingFoodItem> findByBooking_BookingId(Long bookingId);
    boolean existsByFoodVariant_FoodVariantId(Long foodVariantId);
    boolean existsByFoodVariant_FoodItem_FoodItemId(Long foodItemId);

    @Query("""
            select coalesce(sum(bfi.price), 0)
            from BookingFoodItem bfi
            where bfi.foodVariant.foodItem.foodItemId = :foodItemId
              and bfi.booking.status = :status
            """)
    Long sumRevenueByFoodItemIdAndBookingStatus(
            @Param("foodItemId") Long foodItemId,
            @Param("status") BookingStatus status);
}
