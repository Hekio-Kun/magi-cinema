package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShowtimeAdminRequest {
    @NotNull(message = "Phim không được để trống")
    Long movieId;

    @NotNull(message = "Phòng chiếu không được để trống")
    Long cinemaRoomId;

    Long presentationId;

    @NotNull(message = "Ngày chiếu không được để trống")
    LocalDate showDate;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    LocalTime endTime;

    @Positive(message = "Giá vé gốc phải lớn hơn 0")
    Integer basePrice;

    ShowtimeStatus status;
}
