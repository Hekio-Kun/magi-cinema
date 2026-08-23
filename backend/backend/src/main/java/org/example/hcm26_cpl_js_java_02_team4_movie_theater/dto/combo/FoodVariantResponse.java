package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodVariantResponse {
    Long foodVariantId;
    Long foodItemId;
    String variantName;
    String sizeLabel;
    String flavor;
    Long price;
    Long purchasePrice;
    @JsonProperty("isActive")
    @JsonAlias("active")
    boolean isActive;
    Integer displayOrder;
    String displayName;
    Integer stockQuantity;
    Long inventoryCost;
    Long potentialRevenue;
    Long potentialProfit;
}
