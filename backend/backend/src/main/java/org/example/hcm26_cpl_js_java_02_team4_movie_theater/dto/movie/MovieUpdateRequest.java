package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.Valid;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeRequest;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MovieUpdateRequest {
    String movieNameVn;

    String movieNameEnglish;

    String actor;

    String director;

    String content;

    @Min(value = 1, message = "Thời lượng phim phải lớn hơn 0")
    Integer duration;

    LocalDate fromDate;

    LocalDate toDate;

    String movieProductionCompany;

    String largeImage;

    String smallImage;

    String backdropImage;

    @Min(value = 0, message = "Đánh giá không được nhỏ hơn 0")
    @Max(value = 10, message = "Đánh giá không được lớn hơn 10")
    Double rating;

    String ageRating;

    Boolean showOnHero;
    Boolean isHot;

    String trailer;

    MovieStatus status;

    List<MovieFormat> formats;

    List<@Valid MoviePresentationRequest> presentations;

    Set<Long> genreIds;

    List<ShowtimeRequest> showtimes;
}
