package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderItemType;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrderItemResponse {
    Long itemId;
    ConcessionOrderItemType itemType;
    Long comboId;
    Long foodVariantId;
    String name;
    Long unitPrice;
    Integer quantity;
    Long lineTotal;
}
