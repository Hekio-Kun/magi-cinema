package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.tmdb.TmdbMovieSearchResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TmdbService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tmdb")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TmdbController {

    TmdbService tmdbService;

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('MOVIE_CREATE')")
    public ApiResponse<TmdbMovieSearchResponse> searchMovies(
            @RequestParam String query,
            @RequestParam(defaultValue = "vi-VN") String language,
            @RequestParam(defaultValue = "1") int page) {
        return ApiResponse.<TmdbMovieSearchResponse>builder()
                .result(tmdbService.searchMovies(query, language, page))
                .build();
    }

    @GetMapping("/movie/{tmdbId}")
    @PreAuthorize("hasAuthority('MOVIE_CREATE')")
    public ApiResponse<MovieResponse> getMovieById(
            @PathVariable Long tmdbId,
            @RequestParam(defaultValue = "vi-VN") String language) {
        return ApiResponse.<MovieResponse>builder()
                .result(tmdbService.fetchMovieAsMovieResponse(tmdbId, language))
                .build();
    }
}
