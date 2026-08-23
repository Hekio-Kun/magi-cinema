package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComboItemResponse {
    Long comboItemId;
    Long foodItemId;
    Long foodVariantId;
    String foodItemName;
    String variantName;
    String displayName;
    Long unitPrice;
    Long unitCost;
    Long totalCost;
    Integer quantity;
}
