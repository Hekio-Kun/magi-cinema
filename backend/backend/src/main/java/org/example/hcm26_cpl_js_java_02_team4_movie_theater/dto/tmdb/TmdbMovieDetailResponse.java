package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.tmdb;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TmdbMovieDetailResponse {
    Long id;
    String title;

    @JsonProperty("original_title")
    String originalTitle;

    String overview;

    @JsonProperty("poster_path")
    String posterPath;

    @JsonProperty("backdrop_path")
    String backdropPath;

    @JsonProperty("release_date")
    String releaseDate;

    Integer runtime;

    @JsonProperty("vote_average")
    Double voteAverage;

    List<Genre> genres = new ArrayList<>();

    @JsonProperty("production_companies")
    List<ProductionCompany> productionCompanies = new ArrayList<>();

    Credits credits = new Credits();
    Videos videos = new Videos();

    @JsonProperty("release_dates")
    ReleaseDates releaseDates = new ReleaseDates();

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Genre {
        Integer id;
        String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProductionCompany {
        Integer id;
        String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Credits {
        List<Cast> cast = new ArrayList<>();
        List<Crew> crew = new ArrayList<>();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Cast {
        String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Crew {
        String name;
        String job;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Videos {
        List<VideoResult> results = new ArrayList<>();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VideoResult {
        String key;
        String site;
        String type;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReleaseDates {
        List<ReleaseDateCountry> results = new ArrayList<>();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReleaseDateCountry {
        @JsonProperty("iso_3166_1")
        String iso31661;

        @JsonProperty("release_dates")
        List<ReleaseDateItem> releaseDates = new ArrayList<>();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReleaseDateItem {
        String certification;
        Integer type;
    }
}
