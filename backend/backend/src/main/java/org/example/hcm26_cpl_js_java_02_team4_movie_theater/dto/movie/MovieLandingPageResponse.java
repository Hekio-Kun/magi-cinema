package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;

import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MovieLandingPageResponse {
    Long id;
    String title;
    String titleVn;
    String titleEnglish;
    String genre;
    Double rating;
    String durationStr;
    String description;
    String poster;
    String bg;
    LocalDate releaseDate;
    Boolean hot;
    String trailer;
    MovieStatus status;
    Boolean hasShowtimes;
}
