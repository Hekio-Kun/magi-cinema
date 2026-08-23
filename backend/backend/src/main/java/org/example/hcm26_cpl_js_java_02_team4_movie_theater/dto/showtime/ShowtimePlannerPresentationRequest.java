package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerPresentationRequest {
    @NotNull(message = "Phiên bản chiếu không được để trống")
    Long presentationId;

    @Min(value = 0, message = "Số suất của phiên bản không được âm")
    Integer requestedShowtimes;

    @Min(value = 1000, message = "Giá vé của phiên bản phải từ 1.000đ")
    Integer basePrice;
}
