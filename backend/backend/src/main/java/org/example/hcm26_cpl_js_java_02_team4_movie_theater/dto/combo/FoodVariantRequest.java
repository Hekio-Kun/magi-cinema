package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodVariantRequest {
    Long foodVariantId;

    @NotBlank(message = "Tên biến thể không được để trống")
    String variantName;

    String sizeLabel;

    String flavor;

    @NotNull(message = "Giá biến thể không được để trống")
    @Min(value = 0, message = "Giá biến thể không được âm")
    Long price;

    @Builder.Default
    @Min(value = 0, message = "Giá nhập không được âm")
    Long purchasePrice = 0L;

    @Builder.Default
    @JsonProperty("isActive")
    @JsonAlias("active")
    boolean isActive = true;

    @Builder.Default
    Integer displayOrder = 0;

    @Builder.Default
    @Min(value = 0, message = "Số lượng tồn không được âm")
    Integer stockQuantity = 0;

    String stockAdjustmentReason;
}
