package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import jakarta.validation.constraints.NotBlank;
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
public class BookingPromotionRequest {
    @NotBlank(message = "Mã promotion không được để trống")
    String code;

    PaymentMethod paymentMethod;
}
