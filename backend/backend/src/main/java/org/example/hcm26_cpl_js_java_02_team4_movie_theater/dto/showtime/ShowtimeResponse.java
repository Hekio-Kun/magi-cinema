package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalTime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShowtimeResponse {
    Long showtimeId;
    Long movieId;
    Long cinemaRoomId;
    String cinemaRoomName;
    Long presentationId;
    String presentationName;
    MovieFormat presentationFormat;
    MovieProjectionType projectionType;
    MovieLanguageType languageType;
    LocalDate showDate;
    LocalTime startTime;
    LocalTime endTime;
    Integer basePrice;
    ShowtimeStatus status;
}
