package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShowtimeSelectionResponse {
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
    String seatSelectionPath;
}
