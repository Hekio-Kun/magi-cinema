package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/**
 * A small, predictable layout template for the common cinema layouts.  The
 * request deliberately describes intent rather than individual seats so it
 * can be used by both the admin UI and future import tools.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatLayoutRequest {

    @NotNull(message = "Số lượng ghế không được để trống")
    @Min(value = 50, message = "Số lượng ghế tối thiểu là 50")
    @Max(value = 200, message = "Số lượng ghế tối đa là 200")
    Integer seatQuantity;

    @NotNull(message = "Số ghế mỗi hàng không được để trống")
    @Min(value = 5, message = "Mỗi hàng phải có ít nhất 5 ghế")
    @Max(value = 20, message = "Mỗi hàng tối đa 20 ghế")
    Integer seatsPerRow;

    @Min(value = 0, message = "Số hàng VIP không hợp lệ")
    @Max(value = 5, message = "Tối đa 5 hàng VIP")
    Integer vipRowsFromBack;

    @Min(value = 0, message = "Số ghế đôi không hợp lệ")
    @Max(value = 12, message = "Tối đa 12 ghế đôi ở hàng cuối")
    Integer coupleSeatsOnLastRow;

    @Min(value = 0, message = "Số ghế hỗ trợ không hợp lệ")
    @Max(value = 6, message = "Tối đa 6 ghế hỗ trợ ở hàng đầu")
    Integer accessibleSeatsOnFirstRow;
}
