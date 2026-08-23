package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComboResponse {
    Long comboId;
    String name;
    String description;
    Long price;
    String imageUrl;
    ComboStatus status;
    Integer availableQuantity;
    Long costPerCombo;
    Long profitPerCombo;
    Long inventoryCost;
    Long actualRevenue;
    Long potentialRevenue;
    Long potentialProfit;
    List<ComboItemResponse> items;
}
