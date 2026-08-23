package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardShowtimeResponse {
    private Long showtimeId;
    private String movieName;
    private String cinemaRoomName;
    private String cinemaRoomType;
    private int seatQuantity;
    private Long presentationId;
    private String presentationName;
    private MovieFormat presentationFormat;
    private MovieProjectionType projectionType;
    private MovieLanguageType languageType;
    private LocalDate showDate;
    private LocalTime startTime;
}
