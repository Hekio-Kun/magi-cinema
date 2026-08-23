package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionValidationRequest {
    @NotBlank(message = "Mã promotion không được để trống")
    String code;

    @NotNull(message = "Giá trị đơn hàng không được để trống")
    @Min(value = 0, message = "Giá trị đơn hàng không được âm")
    Integer orderAmount;

    PaymentMethod paymentMethod;
    String memberUserId;
}
