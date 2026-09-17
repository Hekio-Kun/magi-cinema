package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreSource;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.GenreMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.GenreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GenreService {

    private static final String DEFAULT_COLOR = "#E63946";

    GenreRepository genreRepository;
    GenreMapper genreMapper;

    @Transactional(readOnly = true)
    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAllActive().stream()
                .map(genre -> toResponse(genre, 0L))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GenreResponse> getAllGenresForAdmin() {
        Map<Long, Long> usageByGenre = new HashMap<>();
        genreRepository.summarizeMovieUsage().forEach(summary ->
                usageByGenre.put(summary.getGenreId(), summary.getMovieCount()));
        return genreRepository.findAllForAdmin().stream()
                .map(genre -> toResponse(genre, usageByGenre.getOrDefault(genre.getGenreId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public GenreResponse getGenreById(Long id) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
        long movieCount = genreRepository.summarizeMovieUsage().stream()
                .filter(summary -> id.equals(summary.getGenreId()))
                .map(GenreRepository.GenreUsageSummary::getMovieCount)
                .findFirst()
                .orElse(0L);
        return toResponse(genre, movieCount);
    }

    @Transactional
    public GenreResponse createGenre(GenreRequest request) {
        String name = normalizeWhitespace(request.getName());
        ensureUniqueName(name, null);

        Genre genre = genreMapper.toGenre(request);
        genre.setName(name);
        genre.setDescription(cleanDescription(request.getDescription()));
        genre.setSlug(createUniqueSlug(name, null));
        genre.setColorCode(normalizeColor(request.getColorCode()));
        genre.setDisplayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder());
        genre.setStatus(request.getStatus() == null ? GenreStatus.ACTIVE : request.getStatus());
        genre.setSource(GenreSource.MANUAL);
        genre = genreRepository.save(genre);
        return toResponse(genre, 0L);
    }

    @Transactional
    public GenreResponse updateGenre(Long id, GenreRequest request) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
        String name = normalizeWhitespace(request.getName());
        ensureUniqueName(name, id);
        boolean renamed = !genre.getName().equals(name);

        genreMapper.updateGenre(genre, request);
        genre.setName(name);
        genre.setDescription(cleanDescription(request.getDescription()));
        genre.setColorCode(normalizeColor(request.getColorCode()));
        genre.setDisplayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder());
        if (renamed || genre.getSlug() == null || genre.getSlug().isBlank()) {
            genre.setSlug(createUniqueSlug(name, id));
        }
        if (genre.getStatus() == null) {
            genre.setStatus(GenreStatus.ACTIVE);
        }
        if (genre.getSource() == null) {
            genre.setSource(inferLegacySource(genre));
        }
        genre = genreRepository.save(genre);
        long movieCount = findMovieCount(id);
        return toResponse(genre, movieCount);
    }

    @Transactional
    public GenreResponse updateStatus(Long id, GenreStatus status) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
        genre.setStatus(status);
        genre = genreRepository.save(genre);
        return toResponse(genre, findMovieCount(id));
    }

    @Transactional
    public void deleteGenre(Long id) {
        updateStatus(id, GenreStatus.INACTIVE);
    }

    private long findMovieCount(Long id) {
        return genreRepository.summarizeMovieUsage().stream()
                .filter(summary -> id.equals(summary.getGenreId()))
                .map(GenreRepository.GenreUsageSummary::getMovieCount)
                .findFirst()
                .orElse(0L);
    }

    private GenreResponse toResponse(Genre genre, long movieCount) {
        GenreResponse response = genreMapper.toGenreResponse(genre);
        response.setMovieCount(movieCount);
        if (response.getStatus() == null) {
            response.setStatus(GenreStatus.ACTIVE);
        }
        if (response.getSource() == null) {
            response.setSource(inferLegacySource(genre));
        }
        if (response.getColorCode() == null || response.getColorCode().isBlank()) {
            response.setColorCode(DEFAULT_COLOR);
        }
        if (response.getDisplayOrder() == null) {
            response.setDisplayOrder(0);
        }
        if (response.getSlug() == null || response.getSlug().isBlank()) {
            response.setSlug(slugify(genre.getName()));
        }
        return response;
    }

    private void ensureUniqueName(String name, Long currentId) {
        boolean duplicate = currentId == null
                ? genreRepository.existsByNameIgnoreCase(name)
                : genreRepository.existsByNameIgnoreCaseAndGenreIdNot(name, currentId);
        if (!duplicate) {
            String comparableName = comparable(name);
            duplicate = genreRepository.findAll().stream()
                    .filter(genre -> currentId == null || !currentId.equals(genre.getGenreId()))
                    .anyMatch(genre -> comparable(genre.getName()).equals(comparableName));
        }
        if (duplicate) {
            throw new AppException(ErrorCode.GENRE_NAME_EXISTED);
        }
    }

    private String createUniqueSlug(String name, Long currentId) {
        String base = slugify(name);
        String candidate = base;
        int suffix = 2;
        while (currentId == null
                ? genreRepository.existsBySlugIgnoreCase(candidate)
                : genreRepository.existsBySlugIgnoreCaseAndGenreIdNot(candidate, currentId)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String normalizeWhitespace(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String cleanDescription(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeColor(String value) {
        return value == null || value.isBlank() ? DEFAULT_COLOR : value.toUpperCase(Locale.ROOT);
    }

    private String comparable(String value) {
        return slugify(value).replace("-", "");
    }

    private String slugify(String value) {
        if (value == null || value.isBlank()) {
            return "the-loai";
        }
        String normalized = Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "the-loai" : normalized;
    }

    private GenreSource inferLegacySource(Genre genre) {
        return "Tự động tạo từ TMDB".equalsIgnoreCase(genre.getDescription())
                ? GenreSource.TMDB
                : GenreSource.MANUAL;
    }
}
