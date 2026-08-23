package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieHeroVisibilityRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MoviePresentationOptionsResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieLandingPageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.MovieService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CloudinaryService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/movies")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MovieController {

    MovieService movieService;
    CloudinaryService cloudinaryService;

    // ==========================================
    // LANDING PAGE API
    // ==========================================

    @GetMapping("/landing/hero")
    public ApiResponse<List<MovieLandingPageResponse>> getHeroMovies() {
        return ApiResponse.<List<MovieLandingPageResponse>>builder()
                .result(movieService.getHeroMovies())
                .build();
    }

    @GetMapping("/landing/now-showing")
    public ApiResponse<List<MovieLandingPageResponse>> getNowShowingMovies() {
        return ApiResponse.<List<MovieLandingPageResponse>>builder()
                .result(movieService.getNowShowingMovies())
                .build();
    }

    @GetMapping("/landing/coming-soon")
    public ApiResponse<List<MovieLandingPageResponse>> getComingSoonMovies() {
        return ApiResponse.<List<MovieLandingPageResponse>>builder()
                .result(movieService.getComingSoonMovies())
                .build();
    }

    // ==========================================
    // ADMIN / GENERAL API
    // ==========================================

    @GetMapping("/presentation-options")
    public ApiResponse<MoviePresentationOptionsResponse> getPresentationOptions() {
        return ApiResponse.<MoviePresentationOptionsResponse>builder()
                .result(movieService.getPresentationOptions())
                .build();
    }

    @GetMapping
    public ApiResponse<PageResponse<MovieResponse>> getMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<MovieStatus> statuses,
            @RequestParam(required = false) Long genreId,
            @RequestParam(required = false) LocalDate searchDate,
            @RequestParam(required = false, defaultValue = "movieId") String sortBy,
            @RequestParam(required = false, defaultValue = "DESC") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<MovieResponse>>builder()
                .result(movieService.getMovies(keyword, statuses, genreId, searchDate, sortBy, direction, page, size))
                .build();
    }

    @GetMapping("/{movieId}")
    public ApiResponse<MovieResponse> getMovieById(@PathVariable Long movieId) {
        return ApiResponse.<MovieResponse>builder()
                .result(movieService.getMovieById(movieId))
                .build();
    }

    @GetMapping("/{movieId}/constraints")
    public ApiResponse<java.util.Map<String, Boolean>> checkMovieConstraints(@PathVariable Long movieId) {
        boolean hasBookings = movieService.hasBookings(movieId);
        boolean hasShowtimes = movieService.hasShowtimes(movieId);
        
        java.util.Map<String, Boolean> result = new java.util.HashMap<>();
        result.put("hasBookings", hasBookings);
        result.put("hasShowtimes", hasShowtimes);
        
        return ApiResponse.<java.util.Map<String, Boolean>>builder()
                .result(result)
                .build();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MOVIE_CREATE')")
    public ApiResponse<MovieResponse> createMovie(@Valid @RequestBody MovieCreationRequest request) {
        return ApiResponse.<MovieResponse>builder()
                .message("Tạo phim thành công!")
                .result(movieService.createMovie(request))
                .build();
    }

    @PutMapping("/{movieId}")
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public ApiResponse<MovieResponse> updateMovie(
            @PathVariable Long movieId,
            @Valid @RequestBody MovieUpdateRequest request) {
        return ApiResponse.<MovieResponse>builder()
                .message("Cập nhật phim thành công!")
                .result(movieService.updateMovie(movieId, request))
                .build();
    }

    @PatchMapping("/{movieId}/hero-visibility")
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public ApiResponse<MovieResponse> updateHeroVisibility(
            @PathVariable Long movieId,
            @Valid @RequestBody MovieHeroVisibilityRequest request) {
        return ApiResponse.<MovieResponse>builder()
                .message(Boolean.TRUE.equals(request.getShowOnHero())
                        ? "Đã hiển thị phim trên Hero!"
                        : "Đã ẩn phim khỏi Hero!")
                .result(movieService.updateHeroVisibility(movieId, request.getShowOnHero()))
                .build();
    }

    @DeleteMapping("/{movieId}")
    @PreAuthorize("hasAuthority('MOVIE_DELETE')")
    public ApiResponse<String> deleteMovie(@PathVariable Long movieId) {
        log.info("Deleting movie - ID: {}", movieId);
        movieService.deleteMovie(movieId);
        return ApiResponse.<String>builder()
                .message("Xóa phim thành công!")
                .build();
    }

    @PostMapping("/upload-image")
    @PreAuthorize("hasAnyAuthority('MOVIE_CREATE', 'MOVIE_UPDATE')")
    public ApiResponse<String> uploadImage(@RequestParam("file") MultipartFile file) {
        log.info("Uploading movie image");
        return ApiResponse.<String>builder()
                .message("Upload ảnh thành công!")
                .result(cloudinaryService.uploadImage(file))
                .build();
    }
}
