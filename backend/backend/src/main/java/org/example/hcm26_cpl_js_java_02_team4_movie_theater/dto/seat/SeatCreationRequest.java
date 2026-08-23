package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat;

import jakarta.validation.constraints.Min;
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
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatCreationRequest {

    @NotNull(message = "Phòng chiếu không được để trống")
    Long cinemaRoomId;

    @NotBlank(message = "Hàng ghế không được để trống")
    @Size(max = 5, message = "Hàng ghế không được vượt quá 5 ký tự")
    String seatRow;

    @NotNull(message = "Số ghế không được để trống")
    @Min(value = 1, message = "Số ghế phải lớn hơn 0")
    Integer seatNumber;

    @NotBlank(message = "Mã ghế không được để trống")
    @Size(max = 10, message = "Mã ghế không được vượt quá 10 ký tự")
    String seatCode;

    SeatType type;
    SeatStatus status;
}
