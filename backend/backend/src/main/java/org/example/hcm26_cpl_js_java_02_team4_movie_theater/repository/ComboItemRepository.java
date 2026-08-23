package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ComboItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComboItemRepository extends JpaRepository<ComboItem, Long> {
    List<ComboItem> findByCombo_ComboId(Long comboId);
    void deleteByCombo_ComboId(Long comboId);
    boolean existsByFoodItem_FoodItemId(Long foodItemId);
    boolean existsByFoodVariant_FoodVariantId(Long foodVariantId);
}
