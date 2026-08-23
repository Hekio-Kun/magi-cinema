package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MoviePresentationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieLandingPageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(
        componentModel = "spring",
        uses = {GenreMapper.class, ShowtimeMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface MovieMapper {

    @Mapping(target = "formats", ignore = true)
    @Mapping(target = "genres", ignore = true)
    @Mapping(target = "showtimes", ignore = true)
    @Mapping(target = "presentations", ignore = true)
    Movie toMovie(MovieCreationRequest request);

    @Mapping(target = "formats", source = "formats")
    @Mapping(target = "presentations", source = "presentations")
    @Mapping(target = "showtimes", source = ".")
    MovieResponse toMovieResponse(Movie movie);

    List<MovieResponse> toMovieResponseList(List<Movie> movies);

    @Mapping(target = "formats", ignore = true)
    @Mapping(target = "genres", ignore = true)
    @Mapping(target = "showtimes", ignore = true)
    @Mapping(target = "presentations", ignore = true)
    void updateMovie(@MappingTarget Movie movie, MovieUpdateRequest request);

    default List<MovieFormat> mapFormats(Set<MovieFormat> formats) {
        if (formats == null) {
            return Collections.emptyList();
        }
        return formats.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MovieFormat::name))
                .toList();
    }

    default List<MoviePresentationResponse> mapPresentations(List<MoviePresentation> presentations) {
        if (presentations == null) {
            return Collections.emptyList();
        }
        return presentations.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing(MoviePresentation::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(MoviePresentation::getPresentationId, Comparator.nullsLast(Long::compareTo)))
                .map(this::toMoviePresentationResponse)
                .toList();
    }

    default MoviePresentationResponse toMoviePresentationResponse(MoviePresentation presentation) {
        if (presentation == null) {
            return null;
        }
        return MoviePresentationResponse.builder()
                .presentationId(presentation.getPresentationId())
                .format(presentation.getFormat())
                .projectionType(presentation.getProjectionType())
                .languageType(presentation.getLanguageType())
                .audioLanguage(presentation.getAudioLanguage())
                .subtitleLanguage(presentation.getSubtitleLanguage())
                .label(presentation.getLabel())
                .displayName(presentation.getDisplayName())
                .active(presentation.getActive())
                .sortOrder(presentation.getSortOrder())
                .build();
    }

    default MovieLandingPageResponse toMovieLandingPageResponse(Movie movie) {
        if (movie == null) {
            return null;
        }

        String title = movie.getMovieNameVn() != null && !movie.getMovieNameVn().isBlank()
                ? movie.getMovieNameVn()
                : "Chưa cập nhật tên phim";

        String durationStr = null;
        if (movie.getDuration() != null) {
            int h = movie.getDuration() / 60;
            int m = movie.getDuration() % 60;
            durationStr = (h > 0 ? h + "h " : "") + m + "m";
        }

        String genreStr = "";
        if (movie.getGenres() != null && !movie.getGenres().isEmpty()) {
            genreStr = movie.getGenres().stream()
                    .map(Genre::getName)
                    .collect(Collectors.joining(" · "));
        }

        return MovieLandingPageResponse.builder()
                .id(movie.getMovieId())
                .title(title)
                .titleVn(movie.getMovieNameVn())
                .titleEnglish(movie.getMovieNameEnglish())
                .genre(genreStr)
                .rating(movie.getRating())
                .durationStr(durationStr)
                .description(movie.getContent())
                .poster(movie.getSmallImage())
                .bg(movie.getBackdropImage() != null ? movie.getBackdropImage() : movie.getLargeImage())
                .releaseDate(movie.getFromDate())
                .hot(movie.getIsHot() != null ? movie.getIsHot() : false)
                .status(movie.getStatus())
                .build();
    }
}
