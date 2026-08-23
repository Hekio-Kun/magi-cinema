package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CinemaRoomCreationRequest {

    @NotBlank(message = "Tên phòng không được để trống")
    String cinemaRoomName;

    @NotNull(message = "Số lượng ghế không được để trống")
    @Min(value = 50, message = "Số lượng ghế tối thiểu là 50")
    @Max(value = 200, message = "Số lượng ghế tối đa là 200")
    Integer seatQuantity;

    Integer seatsPerRow;

    RoomType type;
}
