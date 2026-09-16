package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalTime;

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

    @NotNull(message = "Trạng thái giá U22 là bắt buộc")
    Boolean u22Enabled;

    @NotNull(message = "Phụ thu cuối tuần là bắt buộc")
    @Min(value = 0, message = "Phụ thu cuối tuần không được âm")
    @Max(value = 10_000_000, message = "Phụ thu cuối tuần không được vượt quá 10.000.000đ")
    Integer weekendSurcharge;

    @NotNull(message = "Giờ kết thúc suất sớm là bắt buộc")
    LocalTime earlyBirdEnd;

    @NotNull(message = "Giảm giá suất sớm là bắt buộc")
    @Min(value = 0, message = "Giảm giá suất sớm không được âm")
    @Max(value = 10_000_000, message = "Giảm giá suất sớm không được vượt quá 10.000.000đ")
    Integer earlyBirdDiscount;

    @NotNull(message = "Giờ bắt đầu cao điểm là bắt buộc")
    LocalTime primeTimeStart;

    @NotNull(message = "Giờ kết thúc cao điểm là bắt buộc")
    LocalTime primeTimeEnd;

    @NotNull(message = "Phụ thu cao điểm là bắt buộc")
    @Min(value = 0, message = "Phụ thu cao điểm không được âm")
    @Max(value = 10_000_000, message = "Phụ thu cao điểm không được vượt quá 10.000.000đ")
    Integer primeTimeSurcharge;

    @NotNull(message = "Giờ bắt đầu suất muộn là bắt buộc")
    LocalTime lateShowStart;

    @NotNull(message = "Phụ thu suất muộn là bắt buộc")
    @Min(value = 0, message = "Phụ thu suất muộn không được âm")
    @Max(value = 10_000_000, message = "Phụ thu suất muộn không được vượt quá 10.000.000đ")
    Integer lateShowSurcharge;

    @NotNull(message = "Đơn vị làm tròn là bắt buộc")
    @Min(value = 1, message = "Đơn vị làm tròn phải lớn hơn 0")
    @Max(value = 100_000, message = "Đơn vị làm tròn không được vượt quá 100.000đ")
    Integer priceRoundingUnit;

    Long version;

    @NotBlank(message = "Lý do thay đổi là bắt buộc")
    @jakarta.validation.constraints.Size(min = 5, max = 300, message = "Lý do thay đổi phải từ 5 đến 300 ký tự")
    String changeReason;
}
