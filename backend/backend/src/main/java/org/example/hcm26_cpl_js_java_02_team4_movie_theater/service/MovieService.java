package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MoviePresentationOptionsResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MoviePresentationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieLandingPageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.MovieMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.GenreRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.MoviePresentationCompatibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class MovieService {

    MovieRepository movieRepository;
    ShowtimeService showtimeService;
    GenreRepository genreRepository;
    MovieMapper movieMapper;
    CloudinaryService cloudinaryService;
    ShowtimeSeatService showtimeSeatService;
    BookingRepository bookingRepository;
    ShowtimeRepository showtimeRepository;
    MovieStatusSynchronizer movieStatusSynchronizer;

    private static final Set<BookingStatus> LOCKING_BOOKING_STATUSES = Set.of(
            BookingStatus.SUCCESS,
            BookingStatus.PENDING);
    private static final Set<ShowtimeStatus> TERMINAL_SHOWTIME_STATUSES = Set.of(
            ShowtimeStatus.CANCELLED,
            ShowtimeStatus.COMPLETED);
    private static final List<MovieStatus> HERO_ELIGIBLE_STATUSES = List.of(
            MovieStatus.NOW_SHOWING,
            MovieStatus.COMING_SOON);
    private static final List<MovieStatus> HOT_ELIGIBLE_STATUSES = List.of(
            MovieStatus.NOW_SHOWING,
            MovieStatus.COMING_SOON);

    public PageResponse<MovieResponse> getMovies(String keyword, List<MovieStatus> statuses, Long genreId, LocalDate searchDate, String sortBy, String direction, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        
        Sort.Direction sortDir = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortProperty = (sortBy != null && !sortBy.trim().isEmpty()) ? sortBy : "movieId";
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by(sortDir, sortProperty));

        Page<Movie> moviePage = movieRepository.findMovies(normalize(keyword), statuses, genreId, searchDate, pageRequest);

        return PageResponse.<MovieResponse>builder()
                .content(movieMapper.toMovieResponseList(moviePage.getContent()))
                .page(moviePage.getNumber())
                .size(moviePage.getSize())
                .totalElements(moviePage.getTotalElements())
                .totalPages(moviePage.getTotalPages())
                .build();
    }

    public MovieResponse getMovieById(Long movieId) {
        MovieResponse response = movieMapper.toMovieResponse(getMovie(movieId));
        response.setShowtimes(showtimeService.getPublicShowtimesByMovie(movieId));
        return response;
    }

    public boolean hasBookings(Long movieId) {
        return hasActiveBookings(movieId);
    }

    public MoviePresentationOptionsResponse getPresentationOptions() {
        return new MoviePresentationOptionsResponse(
                Arrays.stream(MovieFormat.values())
                        .map(value -> new MoviePresentationOptionsResponse.Option(
                                value.name(),
                                value.toDisplayString()))
                        .toList(),
                Arrays.stream(MovieProjectionType.values())
                        .map(value -> new MoviePresentationOptionsResponse.Option(
                                value.name(),
                                value.toDisplayString()))
                        .toList(),
                Arrays.stream(MovieLanguageType.values())
                        .map(value -> new MoviePresentationOptionsResponse.Option(
                                value.name(),
                                value.toDisplayString()))
                        .toList());
    }

    public boolean hasShowtimes(Long movieId) {
        return hasActiveShowtimes(movieId);
    }

    // ==========================================
    // LANDING PAGE API
    // ==========================================

    public List<MovieLandingPageResponse> getHeroMovies() {
        return movieRepository.findByShowOnHeroTrueAndStatusInOrderByMovieIdDesc(HERO_ELIGIBLE_STATUSES).stream()
                .map(this::toLandingPageResponse)
                .toList();
    }

    public List<MovieLandingPageResponse> getNowShowingMovies() {
        return movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.NOW_SHOWING).stream()
                .map(this::toLandingPageResponse)
                .toList();
    }

    public List<MovieLandingPageResponse> getComingSoonMovies() {
        return movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.COMING_SOON).stream()
                .map(this::toLandingPageResponse)
                .toList();
    }

    private MovieLandingPageResponse toLandingPageResponse(Movie movie) {
        MovieLandingPageResponse response = movieMapper.toMovieLandingPageResponse(movie);
        if (response != null && movie != null && movie.getMovieId() != null) {
            response.setHasShowtimes(hasActiveShowtimes(movie.getMovieId()));
        }
        return response;
    }

    // ==========================================
    // WRITE
    // ==========================================

    @Transactional
    @PreAuthorize("hasAuthority('MOVIE_CREATE')")
    public MovieResponse createMovie(MovieCreationRequest request) {
        validateCreateRequest(request);
        validateDatesAndStatus(request.getStatus(), request.getFromDate(), request.getToDate());

        boolean targetShowOnHero = resolveHeroVisibilityForStatus(request.getShowOnHero(), request.getStatus());
        boolean targetHot = resolveHotForStatus(request.getIsHot(), request.getStatus());
        validateHotMovieLimit(targetHot, false);
        if (movieRepository.existsByMovieNameVnIgnoreCase(request.getMovieNameVn().trim())) {
            throw new AppException(ErrorCode.MOVIE_ALREADY_EXISTS);
        }

        Movie movie = movieMapper.toMovie(request);
        movie.setShowOnHero(targetShowOnHero);
        movie.setIsHot(targetHot);
        movie.setMovieNameVn(request.getMovieNameVn().trim());
        movie.setFormats(resolveFormats(request.getFormats()));
        syncMoviePresentations(movie, request.getPresentations());
        if (request.getGenreIds() != null) {
            List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
            movie.setGenres(new HashSet<>(genres));
        }
        showtimeService.replaceShowtimes(movie, request.getShowtimes());
        movie = movieRepository.save(movie);
        movie.getShowtimes().forEach(showtimeSeatService::generateSeatsForShowtime);

        log.info("Movie created - ID: {}, name: {}", movie.getMovieId(), movie.getMovieNameVn());
        return movieMapper.toMovieResponse(movie);
    }

    @Transactional
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public MovieResponse updateMovie(Long movieId, MovieUpdateRequest request) {
        Movie movie = getMovie(movieId);
        MovieStatus targetStatus = request.getStatus() != null ? request.getStatus() : movie.getStatus();
        boolean targetShowOnHero = resolveHeroVisibilityForStatus(
                request.getShowOnHero() != null ? request.getShowOnHero() : movie.getShowOnHero(),
                targetStatus);
        boolean targetHot = resolveHotForStatus(
                request.getIsHot() != null ? request.getIsHot() : movie.getIsHot(),
                targetStatus);
        if (hasActiveBookings(movieId) && hasOperationalChanges(movie, request, false)) {
            throw new AppException(ErrorCode.MOVIE_HAS_BOOKINGS);
        }

        if (hasActiveShowtimes(movieId) && hasOperationalChanges(movie, request, true)) {
            throw new AppException(ErrorCode.MOVIE_HAS_SHOWTIMES);
        }

        validateUpdateRequest(request);
        validateDatesAndStatus(
            targetStatus,
            request.getFromDate() != null ? request.getFromDate() : movie.getFromDate(),
            request.getToDate() != null ? request.getToDate() : movie.getToDate()
        );

        validateHotMovieLimit(targetHot, isCurrentlyCountedHot(movie));
        if (request.getMovieNameVn() != null) {
            String trimmedName = request.getMovieNameVn().trim();
            if (movieRepository.existsByMovieNameVnIgnoreCaseAndMovieIdNot(trimmedName, movieId)) {
                throw new AppException(ErrorCode.MOVIE_ALREADY_EXISTS);
            }
        }

        movieMapper.updateMovie(movie, request);
        movie.setShowOnHero(targetShowOnHero);
        movie.setIsHot(targetHot);
        if (request.getMovieNameVn() != null) {
            movie.setMovieNameVn(request.getMovieNameVn().trim());
        }
        if (request.getFormats() != null) {
            movie.setFormats(resolveFormats(request.getFormats()));
        }
        if (request.getPresentations() != null) {
            syncMoviePresentations(movie, request.getPresentations());
        }
        if (request.getGenreIds() != null) {
            List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
            movie.setGenres(new HashSet<>(genres));
        }
        if (request.getShowtimes() != null) {
            showtimeService.replaceShowtimes(movie, request.getShowtimes());
        }

        movie = movieRepository.save(movie);
        if (request.getShowtimes() != null) {
            movie.getShowtimes().forEach(showtimeSeatService::generateSeatsForShowtime);
        }
        log.info("Movie updated - ID: {}", movieId);
        return movieMapper.toMovieResponse(movie);
    }

    @Transactional
    @PreAuthorize("hasAuthority('MOVIE_UPDATE')")
    public MovieResponse updateHeroVisibility(Long movieId, Boolean showOnHero) {
        Movie movie = getMovie(movieId);
        boolean targetVisibility = resolveHeroVisibilityForStatus(showOnHero, movie.getStatus());
        if (Boolean.TRUE.equals(showOnHero) && !targetVisibility) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Chỉ phim đang chiếu hoặc sắp chiếu mới có thể hiển thị trên Hero.");
        }
        movie.setShowOnHero(targetVisibility);
        return movieMapper.toMovieResponse(movieRepository.save(movie));
    }

    @Transactional
    @PreAuthorize("hasAuthority('MOVIE_DELETE')")
    public void deleteMovie(Long movieId) {
        Movie movie = getMovie(movieId);
        
        if (bookingRepository.existsByMovieIdAndStatusIn(movieId, List.of(BookingStatus.SUCCESS, BookingStatus.PENDING))) {
            throw new AppException(ErrorCode.MOVIE_HAS_BOOKINGS);
        }
        if (showtimeRepository.existsByMovie_MovieId(movieId)) {
            throw new AppException(ErrorCode.MOVIE_HAS_SHOWTIMES, "Không thể xóa phim vì đã có suất chiếu liên kết.");
        }

        movieRepository.delete(movie);
        movieRepository.flush();

        cloudinaryService.deleteImage(movie.getSmallImage());
        cloudinaryService.deleteImage(movie.getLargeImage());
        cloudinaryService.deleteImage(movie.getBackdropImage());
        
        log.info("Movie deleted - ID: {}", movieId);
    }

    // ==========================================
    // PRIVATE
    // ==========================================

    private Movie getMovie(Long movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
    }

    private void validateCreateRequest(MovieCreationRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        if (request.getMovieNameVn() == null || request.getMovieNameVn().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        validateDuration(request.getDuration());
    }

    private void validateUpdateRequest(MovieUpdateRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        if (request.getMovieNameVn() != null && request.getMovieNameVn().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        validateDuration(request.getDuration());
    }

    private void validateDuration(Integer duration) {
        if (duration != null && duration < 1) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
    }

    /**
     * @param allowToDateAndStatus true khi phim chỉ có suất chiếu; false khi còn booking hiệu lực.
     */
    private boolean hasOperationalChanges(
            Movie movie,
            MovieUpdateRequest request,
            boolean allowToDateAndStatus) {
        if (changedText(request.getMovieNameVn(), movie.getMovieNameVn())) return true;
        if (changedText(request.getMovieNameEnglish(), movie.getMovieNameEnglish())) return true;
        if (changedText(request.getActor(), movie.getActor())) return true;
        if (changedText(request.getDirector(), movie.getDirector())) return true;
        if (changedText(request.getContent(), movie.getContent())) return true;
        if (changed(request.getDuration(), movie.getDuration())) return true;
        if (changed(request.getFromDate(), movie.getFromDate())) return true;
        if (changedText(request.getMovieProductionCompany(), movie.getMovieProductionCompany())) return true;
        if (changedText(request.getLargeImage(), movie.getLargeImage())) return true;
        if (changedText(request.getSmallImage(), movie.getSmallImage())) return true;
        if (changedText(request.getBackdropImage(), movie.getBackdropImage())) return true;
        if (changed(request.getRating(), movie.getRating())) return true;
        if (changedText(request.getAgeRating(), movie.getAgeRating())) return true;
        if (changedText(request.getTrailer(), movie.getTrailer())) return true;
        if (!allowToDateAndStatus && changed(request.getToDate(), movie.getToDate())) return true;
        if (!allowToDateAndStatus && changed(request.getStatus(), movie.getStatus())) return true;
        if (request.getFormats() != null
                && !new HashSet<>(request.getFormats()).equals(movie.getFormats())) return true;
        if (request.getGenreIds() != null) {
            Set<Long> currentGenreIds = movie.getGenres().stream()
                    .map(Genre::getGenreId)
                    .collect(Collectors.toSet());
            if (!new HashSet<>(request.getGenreIds()).equals(currentGenreIds)) return true;
        }
        if (request.getPresentations() != null
                && !normalizeRequestedPresentations(request.getPresentations())
                .equals(normalizeCurrentPresentations(movie.getPresentations()))) return true;
        return request.getShowtimes() != null;
    }

    private <T> boolean changed(T requested, T current) {
        return requested != null && !Objects.equals(requested, current);
    }

    private boolean changedText(String requested, String current) {
        return requested != null && !Objects.equals(normalize(requested), normalize(current));
    }

    private List<String> normalizeRequestedPresentations(List<MoviePresentationRequest> presentations) {
        return presentations.stream()
                .filter(Objects::nonNull)
                .map(request -> presentationKey(
                        request.getPresentationId(),
                        request.getFormat(),
                        request.getProjectionType(),
                        request.getLanguageType(),
                        request.getAudioLanguage(),
                        request.getSubtitleLanguage(),
                        request.getLabel(),
                        request.getActive(),
                        request.getSortOrder()))
                .sorted()
                .toList();
    }

    private List<String> normalizeCurrentPresentations(List<MoviePresentation> presentations) {
        if (presentations == null) return List.of();
        return presentations.stream()
                .filter(Objects::nonNull)
                .map(presentation -> presentationKey(
                        presentation.getPresentationId(),
                        presentation.getFormat(),
                        presentation.getProjectionType(),
                        presentation.getLanguageType(),
                        presentation.getAudioLanguage(),
                        presentation.getSubtitleLanguage(),
                        presentation.getLabel(),
                        presentation.getActive(),
                        presentation.getSortOrder()))
                .sorted()
                .toList();
    }

    private String presentationKey(
            Object id,
            Object format,
            Object projectionType,
            Object languageType,
            String audioLanguage,
            String subtitleLanguage,
            String label,
            Boolean active,
            Integer sortOrder) {
        return String.join("|",
                String.valueOf(id),
                String.valueOf(format),
                String.valueOf(projectionType),
                String.valueOf(languageType),
                String.valueOf(normalize(audioLanguage)),
                String.valueOf(normalize(subtitleLanguage)),
                String.valueOf(normalize(label)),
                String.valueOf(active == null || active),
                String.valueOf(sortOrder));
    }

    private boolean hasActiveBookings(Long movieId) {
        return bookingRepository
                .findByMovieIdAndStatusInWithShowtime(movieId, LOCKING_BOOKING_STATUSES)
                .stream()
                .anyMatch(booking -> isActiveShowtime(booking.getShowtime()));
    }

    private boolean hasActiveShowtimes(Long movieId) {
        return showtimeRepository.findByMovie_MovieId(movieId)
                .stream()
                .anyMatch(this::isActiveShowtime);
    }

    private boolean isActiveShowtime(Showtime showtime) {
        if (showtime == null || TERMINAL_SHOWTIME_STATUSES.contains(showtime.getStatus())) {
            return false;
        }
        if (showtime.getShowDate() == null || showtime.getStartTime() == null || showtime.getEndTime() == null) {
            return false;
        }
        return toEndDateTime(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime())
                .isAfter(LocalDateTime.now());
    }

    private LocalDateTime toEndDateTime(LocalDate showDate, LocalTime startTime, LocalTime endTime) {
        LocalDate endDate = endTime.isAfter(startTime) ? showDate : showDate.plusDays(1);
        return LocalDateTime.of(endDate, endTime);
    }

    private boolean resolveHeroVisibilityForStatus(Boolean requestedVisibility, MovieStatus status) {
        if (shouldDisablePromotionalFlags(status)) {
            return false;
        }
        return Boolean.TRUE.equals(requestedVisibility);
    }

    private boolean resolveHotForStatus(Boolean requestedHot, MovieStatus status) {
        if (shouldDisablePromotionalFlags(status)) {
            return false;
        }
        return Boolean.TRUE.equals(requestedHot);
    }

    private void validateHotMovieLimit(boolean targetHot, boolean alreadyHot) {
        if (targetHot && !alreadyHot && movieRepository.countByIsHotTrueAndStatusIn(HOT_ELIGIBLE_STATUSES) >= 3) {
            throw new AppException(ErrorCode.MAX_HOT_MOVIES_REACHED);
        }
    }

    private boolean isCurrentlyCountedHot(Movie movie) {
        return Boolean.TRUE.equals(movie.getIsHot()) && HOT_ELIGIBLE_STATUSES.contains(movie.getStatus());
    }

    private boolean shouldDisablePromotionalFlags(MovieStatus status) {
        return status == MovieStatus.ENDED || status == MovieStatus.INACTIVE;
    }

    private void validateDatesAndStatus(MovieStatus status, LocalDate fromDate, LocalDate toDate) {
        if (status == null || status == MovieStatus.INACTIVE) return;

        if (fromDate == null || toDate == null) {
            throw new AppException(ErrorCode.MOVIE_DATE_REQUIRED);
        }
        if (!toDate.isAfter(fromDate)) {
            throw new AppException(ErrorCode.MOVIE_DATE_INVALID);
        }

        LocalDate today = LocalDate.now();

        if (status == MovieStatus.COMING_SOON && !fromDate.isAfter(today)) {
            throw new AppException(ErrorCode.MOVIE_STATUS_DATE_MISMATCH,
                "Phím Sắp chiếu phải có ngày khởi chiếu trong tương lai (sau hôm nay).");
        }
        if (status == MovieStatus.NOW_SHOWING && (fromDate.isAfter(today) || toDate.isBefore(today))) {
            throw new AppException(ErrorCode.MOVIE_STATUS_DATE_MISMATCH,
                "Phim đang chiếu phải có ngày khởi chiếu không sau hôm nay và ngày kết thúc không trước hôm nay.");
        }
        if (status == MovieStatus.ENDED && !toDate.isBefore(today)) {
            throw new AppException(ErrorCode.MOVIE_STATUS_DATE_MISMATCH,
                "Phím Đã kết thúc phải có ngày kết thúc trước hôm nay.");
        }
    }

    private Set<MovieFormat> resolveFormats(List<MovieFormat> formatsList) {
        Set<MovieFormat> formats = new HashSet<>();
        if (formatsList != null && !formatsList.isEmpty()) {
            formats.addAll(formatsList);
        }
        return formats;
    }

    private void syncMoviePresentations(
            Movie movie,
            List<MoviePresentationRequest> requests) {
        if (movie.getPresentations() == null) {
            movie.setPresentations(new ArrayList<>());
        }

        if (requests == null || requests.isEmpty()) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phim phải có ít nhất 1 phiên bản chiếu do quản trị viên cấu hình.");
        }

        Map<Long, MoviePresentation> existingById = movie.getPresentations().stream()
                .filter(presentation -> presentation.getPresentationId() != null)
                .collect(Collectors.toMap(
                        MoviePresentation::getPresentationId,
                        presentation -> presentation,
                        (first, ignored) -> first));
        Set<Long> retainedIds = new HashSet<>();
        int fallbackSortOrder = 0;
        for (MoviePresentationRequest request : requests) {
            if (request == null) {
                continue;
            }
            MoviePresentation presentation = request.getPresentationId() == null
                    ? null
                    : existingById.get(request.getPresentationId());
            if (presentation == null) {
                presentation = new MoviePresentation();
                presentation.setMovie(movie);
                movie.getPresentations().add(presentation);
            } else {
                retainedIds.add(presentation.getPresentationId());
            }
            applyPresentationValues(presentation, request, fallbackSortOrder);
            fallbackSortOrder++;
        }

        movie.getPresentations().stream()
                .filter(presentation -> presentation.getPresentationId() != null)
                .filter(presentation -> !retainedIds.contains(presentation.getPresentationId()))
                .forEach(presentation -> presentation.setActive(false));

        validateDistinctActivePresentations(movie);
        if (movie.getPresentations().stream().noneMatch(this::isActivePresentation)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phim phải có ít nhất 1 phiên bản chiếu đang hoạt động.");
        }

        syncFormatsFromPresentations(movie);
    }

    private void syncFormatsFromPresentations(Movie movie) {
        Set<MovieFormat> presentationFormats = movie.getPresentations().stream()
                .filter(this::isActivePresentation)
                .map(MoviePresentation::getFormat)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        if (!presentationFormats.isEmpty()) {
            movie.setFormats(presentationFormats);
        }
    }

    private void applyPresentationValues(
            MoviePresentation presentation,
            MoviePresentationRequest request,
            int fallbackSortOrder) {
        if (request.getFormat() == null
                || request.getProjectionType() == null
                || request.getLanguageType() == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Mỗi phiên bản chiếu phải có định dạng, kiểu trình chiếu và loại ngôn ngữ.");
        }
        if (!MoviePresentationCompatibility.isProjectionAllowed(
                request.getFormat(), request.getProjectionType())) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Định dạng %s chỉ hỗ trợ kiểu trình chiếu 3D. Chỉ Standard mới được chọn 2D hoặc 3D."
                            .formatted(request.getFormat().toDisplayString()));
        }

        presentation.setFormat(request.getFormat());
        presentation.setProjectionType(request.getProjectionType());
        presentation.setLanguageType(request.getLanguageType());
        presentation.setAudioLanguage(normalize(request.getAudioLanguage()));
        presentation.setSubtitleLanguage(normalize(request.getSubtitleLanguage()));
        presentation.setLabel(normalize(request.getLabel()));
        presentation.setActive(request.getActive() == null || request.getActive());
        presentation.setSortOrder(request.getSortOrder() == null ? fallbackSortOrder : request.getSortOrder());
    }

    private void validateDistinctActivePresentations(Movie movie) {
        Set<String> identities = new HashSet<>();
        for (MoviePresentation presentation : movie.getPresentations()) {
            if (!isActivePresentation(presentation)) {
                continue;
            }
            String identity = String.join("|",
                    presentation.getFormat().name(),
                    presentation.getProjectionType().name(),
                    presentation.getLanguageType().name(),
                    Objects.toString(normalize(presentation.getAudioLanguage()), "").toLowerCase(),
                    Objects.toString(normalize(presentation.getSubtitleLanguage()), "").toLowerCase());
            if (!identities.add(identity)) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Phim đang có hai phiên bản chiếu trùng định dạng, 2D/3D và ngôn ngữ.");
            }
        }
    }

    private boolean isActivePresentation(MoviePresentation presentation) {
        return presentation != null && (presentation.getActive() == null || presentation.getActive());
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
