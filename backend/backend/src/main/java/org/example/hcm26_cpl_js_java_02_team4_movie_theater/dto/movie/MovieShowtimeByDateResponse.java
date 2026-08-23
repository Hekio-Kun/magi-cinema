package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSelectionResponse;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MovieShowtimeByDateResponse {
    Long movieId;
    String movieNameVn;
    String movieNameEnglish;
    String displayName;
    List<ShowtimeSelectionResponse> showtimes;
}
