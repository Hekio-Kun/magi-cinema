package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodItemRequest {
    @NotBlank(message = "Tên món không được để trống")
    String name;

    @NotNull(message = "Giá món không được để trống")
    @Min(value = 0, message = "Giá món không được âm")
    Long price;

    String imageUrl;

    String category;

    @Builder.Default
    @JsonProperty("isActive")
    @JsonAlias("active")
    boolean isActive = true;

    @Valid
    List<FoodVariantRequest> variants;
}
