package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatSelectionHoldRequest {

    @NotNull(message = "Suất chiếu không được để trống")
    Long showtimeId;

    @NotNull(message = "Danh sách ghế không được để trống")
    @Size(max = 8, message = "Chỉ được chọn tối đa 8 ghế")
    List<@NotNull(message = "Ghế không được để trống") Long> showtimeSeatIds;

    @NotBlank(message = "Mã phiên chọn ghế không được để trống")
    @Size(max = 100, message = "Mã phiên chọn ghế không hợp lệ")
    String clientToken;
}
