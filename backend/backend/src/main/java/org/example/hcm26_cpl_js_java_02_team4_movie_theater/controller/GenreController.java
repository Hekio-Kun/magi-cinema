package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreStatusRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.GenreService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/genres")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GenreController {

    GenreService genreService;

    @GetMapping
    public ApiResponse<List<GenreResponse>> getAllGenres() {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getAllGenres())
                .build();
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('MOVIE_VIEW', 'MOVIE_CREATE', 'MOVIE_UPDATE', 'MOVIE_DELETE')")
    public ApiResponse<List<GenreResponse>> getAllGenresForAdmin() {
        return ApiResponse.<List<GenreResponse>>builder()
                .result(genreService.getAllGenresForAdmin())
                .build();
    }

    @GetMapping("/{genreId}")
    public ApiResponse<GenreResponse> getGenreById(@PathVariable Long genreId) {
        return ApiResponse.<GenreResponse>builder()
                .result(genreService.getGenreById(genreId))
                .build();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MOVIE_CREATE')")
    public ApiResponse<GenreResponse> createGenre(@RequestBody @Valid GenreRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .message("Tạo thể loại thành công!")
                .result(genreService.createGenre(request))
                .build();
    }

    @PutMapping("/{genreId}")
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public ApiResponse<GenreResponse> updateGenre(
            @PathVariable Long genreId,
            @RequestBody @Valid GenreRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .message("Cập nhật thể loại thành công!")
                .result(genreService.updateGenre(genreId, request))
                .build();
    }

    @PatchMapping("/{genreId}/status")
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public ApiResponse<GenreResponse> updateStatus(
            @PathVariable Long genreId,
            @RequestBody @Valid GenreStatusRequest request) {
        return ApiResponse.<GenreResponse>builder()
                .message(request.getStatus().name().equals("ACTIVE")
                        ? "Khôi phục thể loại thành công!"
                        : "Ngừng sử dụng thể loại thành công!")
                .result(genreService.updateStatus(genreId, request.getStatus()))
                .build();
    }

    @DeleteMapping("/{genreId}")
    @PreAuthorize("hasAuthority('MOVIE_DELETE')")
    public ApiResponse<String> deleteGenre(@PathVariable Long genreId) {
        genreService.deleteGenre(genreId);
        return ApiResponse.<String>builder()
                .message("Đã ngừng sử dụng thể loại. Các phim đã liên kết vẫn được giữ nguyên.")
                .build();
    }
}
