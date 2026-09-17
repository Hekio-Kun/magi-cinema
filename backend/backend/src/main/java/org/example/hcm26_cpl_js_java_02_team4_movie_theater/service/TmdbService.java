package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.tmdb.TmdbMovieDetailResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.tmdb.TmdbMovieSearchResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreSource;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.GenreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TmdbService {

    final RestTemplate restTemplate = new RestTemplate();
    final GenreRepository genreRepository;

    @Value("${app.tmdb.api-key:}")
    String apiKey;

    @Value("${app.tmdb.base-url:https://api.themoviedb.org/3}")
    String baseUrl;

    @Value("${app.tmdb.image-base-url:https://image.tmdb.org/t/p/original}")
    String imageBaseUrl;

    static final int MIN_SEARCH_QUERY_LENGTH = 1;

    static final Map<Integer, String> TMDB_GENRE_ID_TO_LOCAL_NAME = Map.ofEntries(
            Map.entry(28, "Hành động"),
            Map.entry(12, "Phiêu lưu"),
            Map.entry(16, "Hoạt hình"),
            Map.entry(35, "Hài hước"),
            Map.entry(27, "Kinh dị"),
            Map.entry(10749, "Tình cảm"),
            Map.entry(878, "Khoa học viễn tưởng")
    );

    static final Map<String, String> TMDB_GENRE_NAME_TO_LOCAL_NAME = createGenreAliasMap();

    public TmdbMovieSearchResponse searchMovies(String query, String language, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("TMDB API key is not configured");
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chưa cấu hình TMDB API key.");
        }

        String keyword = query == null ? "" : query.trim();
        int safePage = Math.max(page, 1);
        if (keyword.length() < MIN_SEARCH_QUERY_LENGTH) {
            return emptySearchResponse(safePage);
        }

        TmdbMovieSearchResponse response = requestMovieSearch(keyword, language, safePage);
        if (isEmptySearchResult(response) && !"en-US".equalsIgnoreCase(language)) {
            response = requestMovieSearch(keyword, "en-US", safePage);
        }
        return response;
    }

    @Transactional
    public MovieResponse fetchMovieAsMovieResponse(Long tmdbId, String language) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("TMDB API key is not configured");
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chưa cấu hình TMDB API key.");
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/movie/" + tmdbId)
                .queryParam("api_key", apiKey)
                .queryParam("language", language)
                .queryParam("append_to_response", "credits,videos,release_dates")
                .toUriString();

        try {
            TmdbMovieDetailResponse tmdbMovie = restTemplate.getForObject(url, TmdbMovieDetailResponse.class);
            return tmdbMovie == null ? null : mapToMovieResponse(tmdbMovie);
        } catch (HttpClientErrorException.Unauthorized ex) {
            log.warn("TMDB rejected API key while fetching movie {}", tmdbId);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "TMDB API key không hợp lệ.");
        } catch (RestClientException ex) {
            log.warn("Cannot fetch movie from TMDB: {}", ex.getMessage());
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể kết nối TMDB. Vui lòng thử lại sau.");
        }
    }

    private TmdbMovieSearchResponse requestMovieSearch(String query, String language, int page) {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/search/movie")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("language", language)
                .queryParam("page", page)
                .build()
                .encode()
                .toUriString();

        try {
            TmdbMovieSearchResponse response = restTemplate.getForObject(url, TmdbMovieSearchResponse.class);
            return response == null ? new TmdbMovieSearchResponse() : response;
        } catch (HttpClientErrorException.BadRequest ex) {
            log.warn("TMDB rejected movie search query '{}': {}", query, ex.getResponseBodyAsString());
            return emptySearchResponse(page);
        } catch (HttpClientErrorException.Unauthorized ex) {
            log.warn("TMDB rejected API key while searching movies");
            throw new AppException(ErrorCode.VALIDATION_ERROR, "TMDB API key không hợp lệ.");
        } catch (RestClientException ex) {
            log.warn("Cannot search movies from TMDB: {}", ex.getMessage());
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể kết nối TMDB. Vui lòng thử lại sau.");
        }
    }

    private boolean isEmptySearchResult(TmdbMovieSearchResponse response) {
        return response == null || response.getResults() == null || response.getResults().isEmpty();
    }

    private TmdbMovieSearchResponse emptySearchResponse(int page) {
        return TmdbMovieSearchResponse.builder()
                .page(Math.max(page, 1))
                .totalPages(0)
                .totalResults(0)
                .build();
    }

    private MovieResponse mapToMovieResponse(TmdbMovieDetailResponse tmdb) {
        TmdbMovieDetailResponse.Credits credits = tmdb.getCredits();
        TmdbMovieDetailResponse.Videos videos = tmdb.getVideos();

        String directors = safeList(credits == null ? null : credits.getCrew()).stream()
                .filter(crew -> "Director".equalsIgnoreCase(crew.getJob()))
                .map(TmdbMovieDetailResponse.Crew::getName)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));

        String actors = safeList(credits == null ? null : credits.getCast()).stream()
                .limit(5)
                .map(TmdbMovieDetailResponse.Cast::getName)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));

        String productionCompany = safeList(tmdb.getProductionCompanies()).stream()
                .map(TmdbMovieDetailResponse.ProductionCompany::getName)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElse("");

        String trailer = safeList(videos == null ? null : videos.getResults()).stream()
                .filter(video -> "YouTube".equalsIgnoreCase(video.getSite()))
                .filter(video -> "Trailer".equalsIgnoreCase(video.getType()))
                .map(video -> "https://www.youtube.com/watch?v=" + video.getKey())
                .findFirst()
                .orElse("");

        String ageRating = resolveAgeRating(tmdb.getReleaseDates());

        Set<GenreResponse> genreResponses = safeList(tmdb.getGenres()).stream()
                .map(this::findOrCreateGenre)
                .filter(Objects::nonNull)
                .map(this::toGenreResponse)
                .collect(Collectors.toSet());

        LocalDate releaseDate = parseReleaseDate(tmdb.getReleaseDate());
        MovieStatus status = resolveStatus(releaseDate);

        return MovieResponse.builder()
                .movieNameVn(nullToEmpty(tmdb.getTitle()))
                .movieNameEnglish(nullToEmpty(tmdb.getOriginalTitle()))
                .content(nullToEmpty(tmdb.getOverview()))
                .duration(tmdb.getRuntime())
                .director(directors)
                .actor(actors)
                .movieProductionCompany(productionCompany)
                .rating(tmdb.getVoteAverage())
                .ageRating(ageRating)
                .smallImage(resolveImageUrl(tmdb.getPosterPath()))
                .largeImage(resolveImageUrl(tmdb.getBackdropPath()))
                .backdropImage(resolveImageUrl(tmdb.getBackdropPath()))
                .fromDate(releaseDate)
                .toDate(releaseDate == null ? null : releaseDate.plusMonths(1))
                .status(status)
                .genres(genreResponses)
                .trailer(trailer)
                .formats(List.of())
                .showOnHero(false)
                .isHot(false)
                .build();
    }

    private Genre findOrCreateGenre(TmdbMovieDetailResponse.Genre tmdbGenre) {
        if (tmdbGenre == null) {
            return null;
        }

        String localNameById = TMDB_GENRE_ID_TO_LOCAL_NAME.get(tmdbGenre.getId());
        if (hasText(localNameById)) {
            return findExistingGenre(localNameById)
                    .orElseGet(() -> createGenre(localNameById));
        }

        String tmdbName = tmdbGenre.getName();
        if (!hasText(tmdbName)) {
            return null;
        }

        Optional<Genre> exactMatch = findExistingGenre(tmdbName);
        if (exactMatch.isPresent()) {
            return exactMatch.get();
        }

        String localNameByAlias = TMDB_GENRE_NAME_TO_LOCAL_NAME.get(normalizeGenreName(tmdbName));
        String genreName = hasText(localNameByAlias) ? localNameByAlias : tmdbName.trim();
        return findExistingGenre(genreName)
                .orElseGet(() -> createGenre(genreName));
    }

    private Optional<Genre> findExistingGenre(String name) {
        if (!hasText(name)) {
            return Optional.empty();
        }
        String trimmedName = name.trim();
        Optional<Genre> exactMatch = genreRepository.findByNameIgnoreCase(trimmedName);
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        String normalizedName = normalizeGenreName(trimmedName);
        return genreRepository.findAll().stream()
                .filter(genre -> hasText(genre.getName()))
                .filter(genre -> normalizeGenreName(genre.getName()).equals(normalizedName))
                .findFirst();
    }

    private Genre createGenre(String name) {
        String trimmedName = name.trim();
        try {
            return genreRepository.save(Genre.builder()
                    .name(trimmedName)
                    .description("Tự động tạo từ TMDB")
                    .slug(toGenreSlug(trimmedName))
                    .status(GenreStatus.ACTIVE)
                    .source(GenreSource.TMDB)
                    .build());
        } catch (DataIntegrityViolationException ex) {
            return genreRepository.findByNameIgnoreCase(trimmedName).orElseThrow(() -> ex);
        }
    }

    private GenreResponse toGenreResponse(Genre genre) {
        return GenreResponse.builder()
                .genreId(genre.getGenreId())
                .name(genre.getName())
                .description(genre.getDescription())
                .slug(genre.getSlug())
                .colorCode(genre.getColorCode())
                .displayOrder(genre.getDisplayOrder())
                .status(genre.getStatus() == null ? GenreStatus.ACTIVE : genre.getStatus())
                .source(genre.getSource() == null ? GenreSource.TMDB : genre.getSource())
                .build();
    }

    private LocalDate parseReleaseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (Exception ex) {
            log.warn("Cannot parse TMDB release date: {}", value);
            return null;
        }
    }

    private MovieStatus resolveStatus(LocalDate releaseDate) {
        if (releaseDate == null) {
            return MovieStatus.COMING_SOON;
        }
        return releaseDate.isAfter(LocalDate.now()) ? MovieStatus.COMING_SOON : MovieStatus.NOW_SHOWING;
    }

    private String resolveAgeRating(TmdbMovieDetailResponse.ReleaseDates releaseDates) {
        if (releaseDates == null || releaseDates.getResults() == null) {
            return "";
        }

        return findCertificationByCountry(releaseDates, "VN")
                .or(() -> findCertificationByCountry(releaseDates, "US"))
                .map(this::normalizeAgeRating)
                .orElse("");
    }

    private Optional<String> findCertificationByCountry(TmdbMovieDetailResponse.ReleaseDates releaseDates, String countryCode) {
        return releaseDates.getResults().stream()
                .filter(country -> countryCode.equalsIgnoreCase(country.getIso31661()))
                .flatMap(country -> safeList(country.getReleaseDates()).stream())
                .map(TmdbMovieDetailResponse.ReleaseDateItem::getCertification)
                .filter(certification -> certification != null && !certification.isBlank())
                .findFirst()
                .map(String::trim);
    }

    private String normalizeAgeRating(String certification) {
        if (certification == null || certification.isBlank()) {
            return "";
        }

        String normalized = certification.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "G", "PG" -> "P";
            case "PG-13", "13", "T13" -> "C13";
            case "16", "T16" -> "C16";
            case "18", "T18", "R", "NC-17" -> "C18";
            default -> normalized;
        };
    }

    private String resolveImageUrl(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        return imageBaseUrl + path;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? Collections.emptyList() : values;
    }

    private static Map<String, String> createGenreAliasMap() {
        Map<String, String> aliases = new HashMap<>();
        aliases.put("action", "Hành động");
        aliases.put("hanh dong", "Hành động");
        aliases.put("adventure", "Phiêu lưu");
        aliases.put("phieu luu", "Phiêu lưu");
        aliases.put("animation", "Hoạt hình");
        aliases.put("hoat hinh", "Hoạt hình");
        aliases.put("comedy", "Hài hước");
        aliases.put("hai", "Hài hước");
        aliases.put("hai huoc", "Hài hước");
        aliases.put("horror", "Kinh dị");
        aliases.put("kinh di", "Kinh dị");
        aliases.put("romance", "Tình cảm");
        aliases.put("lang man", "Tình cảm");
        aliases.put("tinh cam", "Tình cảm");
        aliases.put("science fiction", "Khoa học viễn tưởng");
        aliases.put("sci-fi", "Khoa học viễn tưởng");
        aliases.put("khoa hoc vien tuong", "Khoa học viễn tưởng");
        return aliases;
    }

    private static String normalizeGenreName(String value) {
        String normalized = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT).trim();
    }

    private static String toGenreSlug(String value) {
        String slug = normalizeGenreName(value.replace('đ', 'd').replace('Đ', 'D'))
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "the-loai" : slug;
    }
}
