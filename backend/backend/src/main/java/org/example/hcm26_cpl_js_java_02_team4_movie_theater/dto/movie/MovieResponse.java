package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeResponse;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class MovieResponse {
    Long movieId;
    String movieNameVn;
    String movieNameEnglish;
    String actor;
    String director;
    String content;
    Integer duration;
    LocalDate fromDate;
    LocalDate toDate;
    String movieProductionCompany;
    String largeImage;
    String smallImage;
    String backdropImage;
    Double rating;
    String ageRating;
    Boolean showOnHero;
    Boolean isHot;
    MovieStatus status;
    List<MovieFormat> formats;
    List<MoviePresentationResponse> presentations;
    Set<GenreResponse> genres;
    List<ShowtimeResponse> showtimes;
    String trailer;
}
