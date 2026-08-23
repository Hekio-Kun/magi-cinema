package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodVariant;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FoodVariantRepository extends JpaRepository<FoodVariant, Long> {
    List<FoodVariant> findByFoodItem_FoodItemIdOrderByDisplayOrderAscFoodVariantIdAsc(Long foodItemId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FoodVariant> findByFoodVariantId(Long foodVariantId);

    /**
     * Lấy nhiều FoodVariant với khoá bi quan PESSIMISTIC_WRITE theo thứ tự foodVariantId tăng dần.
     * Thứ tự tăng dần là bắt buộc để tránh Deadlock khi nhiều giao dịch đồng thời cùng khoá
     * nhiều hàng: mọi giao dịch đều lấy khoá cùng thứ tự nên không bao giờ hình thành vòng chờ.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT fv FROM FoodVariant fv WHERE fv.foodVariantId IN :ids ORDER BY fv.foodVariantId ASC")
    List<FoodVariant> findAllByIdsSorted(@Param("ids") Collection<Long> ids);
}
