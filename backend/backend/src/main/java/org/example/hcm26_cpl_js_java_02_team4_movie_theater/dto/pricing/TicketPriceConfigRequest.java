package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketPriceConfigRequest {

    @NotNull(message = "Giá Standard 2D là bắt buộc")
    @Min(value = 1_000, message = "Giá Standard 2D phải từ 1.000đ")
    @Max(value = 10_000_000, message = "Giá Standard 2D không được vượt quá 10.000.000đ")
    Integer standard2dPrice;

    @NotNull(message = "Giá Standard 3D là bắt buộc")
    @Min(value = 1_000, message = "Giá Standard 3D phải từ 1.000đ")
    @Max(value = 10_000_000, message = "Giá Standard 3D không được vượt quá 10.000.000đ")
    Integer standard3dPrice;

    @NotNull(message = "Giá IMAX 3D là bắt buộc")
    @Min(value = 1_000, message = "Giá IMAX 3D phải từ 1.000đ")
    @Max(value = 10_000_000, message = "Giá IMAX 3D không được vượt quá 10.000.000đ")
    Integer imax3dPrice;

    @NotNull(message = "Giá 4DX 3D là bắt buộc")
    @Min(value = 1_000, message = "Giá 4DX 3D phải từ 1.000đ")
    @Max(value = 10_000_000, message = "Giá 4DX 3D không được vượt quá 10.000.000đ")
    Integer fourDx3dPrice;

    @NotNull(message = "Phụ thu ghế VIP là bắt buộc")
    @Min(value = 0, message = "Phụ thu ghế VIP không được âm")
    @Max(value = 10_000_000, message = "Phụ thu ghế VIP không được vượt quá 10.000.000đ")
    Integer vipSeatSurcharge;

    @NotNull(message = "Phụ thu ghế đôi là bắt buộc")
    @Min(value = 0, message = "Phụ thu ghế đôi không được âm")
    @Max(value = 10_000_000, message = "Phụ thu ghế đôi không được vượt quá 10.000.000đ")
    Integer coupleSeatSurcharge;

    @NotNull(message = "Phụ thu ghế hỗ trợ là bắt buộc")
    @Min(value = 0, message = "Phụ thu ghế hỗ trợ không được âm")
    @Max(value = 10_000_000, message = "Phụ thu ghế hỗ trợ không được vượt quá 10.000.000đ")
    Integer disabledSeatSurcharge;

    @NotNull(message = "Giá U22 là bắt buộc")
    @Min(value = 1_000, message = "Giá U22 phải từ 1.000đ")
    @Max(value = 10_000_000, message = "Giá U22 không được vượt quá 10.000.000đ")
    Integer u22BasePrice;
}
