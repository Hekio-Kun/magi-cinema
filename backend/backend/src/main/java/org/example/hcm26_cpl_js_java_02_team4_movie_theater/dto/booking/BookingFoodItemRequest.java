package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingFoodItemRequest {
    @NotNull(message = "Biến thể món lẻ không được để trống")
    Long foodVariantId;

    @NotNull(message = "Số lượng món lẻ không được để trống")
    @Min(value = 1, message = "Số lượng món lẻ phải lớn hơn 0")
    Integer quantity;
}
