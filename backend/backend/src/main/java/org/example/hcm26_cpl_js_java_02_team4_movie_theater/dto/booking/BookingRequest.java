package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingRequest {
    @NotNull(message = "Suất chiếu không được để trống")
    Long showtimeId;

    @NotEmpty(message = "Danh sách ghế không được để trống")
    List<@NotNull(message = "Ghế không được để trống") Long> showtimeSeatIds;

    List<Long> u22SeatIds;

    Boolean u22DocumentVerified;

    String voucherCode;

    /** Mã voucher đổi bằng điểm, tách biệt hoàn toàn với voucher khuyến mãi. */
    String membershipRewardCode;

    String memberUserId;

    /** Các quyền lợi Membership muốn áp dụng cho booking này. */
    List<Long> membershipBenefitIds;

    @Valid
    List<@Valid BookingComboRequest> combos;

    @Valid
    List<@Valid BookingFoodItemRequest> foodItems;

    PaymentMethod paymentMethod;
}
