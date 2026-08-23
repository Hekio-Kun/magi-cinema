package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.tmdb;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TmdbMovieSearchResponse {
    int page;

    @Builder.Default
    List<TmdbMovieResult> results = new ArrayList<>();

    @JsonProperty("total_pages")
    int totalPages;

    @JsonProperty("total_results")
    int totalResults;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TmdbMovieResult {
        Long id;
        String title;

        @JsonProperty("original_title")
        String originalTitle;

        @JsonProperty("poster_path")
        String posterPath;

        @JsonProperty("release_date")
        String releaseDate;

        @JsonProperty("vote_average")
        Double voteAverage;

        String overview;
    }
}
