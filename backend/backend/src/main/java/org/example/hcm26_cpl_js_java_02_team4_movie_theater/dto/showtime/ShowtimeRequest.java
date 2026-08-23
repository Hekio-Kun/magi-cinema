package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalTime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShowtimeRequest {
    Long cinemaRoomId;
    Long presentationId;
    LocalDate showDate;
    LocalTime startTime;
    LocalTime endTime;
    Integer basePrice;
    ShowtimeStatus status;
}
