package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeAdminRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieShowtimeByDateResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSelectionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MoviePresentationRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.MoviePresentationCompatibility;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;



@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeService {

    ShowtimeRepository showtimeRepository;
    CinemaRoomRepository cinemaRoomRepository;
    MovieRepository movieRepository;
    MoviePresentationRepository moviePresentationRepository;
    BookingRepository bookingRepository;
    ShowtimeMapper showtimeMapper;
    ShowtimeSeatService showtimeSeatService;
    TicketPricingService ticketPricingService;

    private static final Set<BookingStatus> ACTIVE_BOOKING_STATUSES = EnumSet.of(
            BookingStatus.PENDING,
            BookingStatus.SUCCESS);
    private static final List<ShowtimeStatus> UNBOOKABLE_SHOWTIME_STATUSES = List.of(
            ShowtimeStatus.CANCELLED,
            ShowtimeStatus.COMPLETED);
    private static final LocalTime DEFAULT_OPENING_TIME = LocalTime.of(8, 0);
    private static final LocalTime LATEST_FINISH_TIME = LocalTime.of(2, 0);
    private static final int DEFAULT_TURNAROUND_MINUTES = 20;
    private static final int MAX_TURNAROUND_MINUTES = 120;
    private static final int MIN_BASE_PRICE = 1_000;
    private static final int EARLY_BOOKING_WINDOW_DAYS = 7;
    private static final Pattern ISO_DATE_AT_START = Pattern.compile("^(\\d{4}-\\d{2}-\\d{2})");

    // ==========================================
    // PUBLIC - Dùng bởi ShowtimeController
    // ==========================================

    public List<LocalDate> getValidScreeningDates() {
        return showtimeRepository.findPublicScreeningDates(
                        UNBOOKABLE_SHOWTIME_STATUSES,
                        LocalDate.now(),
                        MovieStatus.INACTIVE)
                .stream()
                .filter(date -> showtimeRepository.findPublicShowtimesByDate(
                                date,
                                UNBOOKABLE_SHOWTIME_STATUSES,
                                MovieStatus.INACTIVE)
                        .stream()
                        .anyMatch(this::isBookableByTime))
                .toList();
    }

    public List<MovieShowtimeByDateResponse> getShowtimesByDate(String rawDate) {
        return getShowtimesByDate(parseDateParameter(rawDate));
    }

    public MovieShowtimesByDateResult getShowtimesByDateResult(String rawDate) {
        List<MovieShowtimeByDateResponse> showtimes = getShowtimesByDate(rawDate);
        return new MovieShowtimesByDateResult(
                showtimes,
                showtimes.isEmpty() ? "No showtime" : null);
    }

    @Transactional
    public List<MovieShowtimeByDateResponse> getShowtimesByDate(LocalDate date) {
        if (date == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }

        Map<Long, MovieShowtimeByDateResponse> moviesById = new LinkedHashMap<>();
        showtimeRepository.findPublicShowtimesByDate(date, UNBOOKABLE_SHOWTIME_STATUSES, MovieStatus.INACTIVE)
                .stream()
                .filter(this::isBookableByTime)
                .forEach(showtime -> {
                    Movie movie = showtime.getMovie();
                    MoviePresentation presentation = showtimeMapper.resolveDisplayPresentation(showtime);
                    moviesById.computeIfAbsent(movie.getMovieId(), id -> MovieShowtimeByDateResponse.builder()
                            .movieId(movie.getMovieId())
                            .movieNameVn(movie.getMovieNameVn())
                            .movieNameEnglish(movie.getMovieNameEnglish())
                            .displayName(resolveDisplayName(movie))
                            .showtimes(new ArrayList<>())
                            .build());

                    moviesById.get(movie.getMovieId()).getShowtimes().add(ShowtimeSelectionResponse.builder()
                            .showtimeId(showtime.getShowtimeId())
                            .movieId(movie.getMovieId())
                            .cinemaRoomId(showtime.getCinemaRoom() == null ? null : showtime.getCinemaRoom().getCinemaRoomId())
                            .cinemaRoomName(showtime.getCinemaRoom() == null ? null : showtime.getCinemaRoom().getCinemaRoomName())
                            .presentationId(presentation == null ? null : presentation.getPresentationId())
                            .presentationName(presentation == null ? null : presentation.getDisplayName())
                            .presentationFormat(presentation == null ? null : presentation.getFormat())
                            .projectionType(presentation == null ? null : presentation.getProjectionType())
                            .languageType(presentation == null ? null : presentation.getLanguageType())
                            .showDate(showtime.getShowDate())
                            .startTime(showtime.getStartTime())
                            .endTime(showtime.getEndTime())
                            .basePrice(TicketPricingService.resolveBasePrice(showtime))
                            .status(showtime.getStatus())
                            .seatSelectionPath(buildSeatSelectionPath(movie.getMovieId(), showtime))
                            .build());
                });

        return List.copyOf(moviesById.values());
    }

    @Transactional
    public ShowtimeResponse getPublicShowtime(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        return showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId());
    }

    @Transactional
    public List<ShowtimeResponse> getPublicShowtimesByMovie(Long movieId) {
        if (movieId == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }

        return showtimeRepository.findPublicShowtimesByMovieId(movieId, UNBOOKABLE_SHOWTIME_STATUSES).stream()
                .filter(this::isBookableByTime)
                .map(showtime -> showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId()))
                .toList();
    }

    // ==========================================
    // ADMIN
    // ==========================================

    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    @Transactional
    public List<ShowtimeResponse> getAdminShowtimes(Long movieId, Long cinemaRoomId, String rawDate, ShowtimeStatus status) {
        return getAdminShowtimes(movieId, cinemaRoomId, parseOptionalDateParameter(rawDate), status);
    }

    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    @Transactional
    public List<ShowtimeResponse> getAdminShowtimes(Long movieId, Long cinemaRoomId, LocalDate showDate, ShowtimeStatus status) {
        syncShowtimeStatuses();
        return showtimeRepository.findAdminShowtimes(movieId, cinemaRoomId, showDate, status).stream()
                .filter(showtime -> status != null || showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .map(showtime -> showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId()))
                .toList();
    }

    private LocalDate parseOptionalDateParameter(String rawDate) {
        return rawDate == null || rawDate.isBlank() ? null : parseDateParameter(rawDate);
    }

    private LocalDate parseDateParameter(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            throw invalidDateParameter();
        }

        String normalizedDate = rawDate.strip();
        Matcher matcher = ISO_DATE_AT_START.matcher(normalizedDate);
        if (!matcher.find()) {
            throw invalidDateParameter();
        }

        try {
            return LocalDate.parse(matcher.group(1));
        } catch (DateTimeParseException exception) {
            throw invalidDateParameter();
        }
    }

    private AppException invalidDateParameter() {
        return new AppException(ErrorCode.VALIDATION_ERROR, "Invalid parameter format: date. Expected YYYY-MM-DD");
    }

    public record MovieShowtimesByDateResult(List<MovieShowtimeByDateResponse> content, String message) {
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    public ShowtimeResponse getAdminShowtime(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        return showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId());
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimeResponse createShowtime(ShowtimeAdminRequest request) {
        return createShowtimes(List.of(request)).getFirst();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public List<ShowtimeResponse> createShowtimes(List<ShowtimeAdminRequest> requests) {
        return createShowtimesInternal(requests, resolveSchedulingRules());
    }

    @Transactional
    public List<ShowtimeResponse> createPlannedShowtimes(
            List<ShowtimeAdminRequest> requests,
            LocalTime openingTime,
            LocalTime latestFinishTime,
            int turnaroundMinutes) {
        return createShowtimesInternal(requests, validateSchedulingRules(
                new SchedulingRules(openingTime, latestFinishTime, turnaroundMinutes)));
    }

    private List<ShowtimeResponse> createShowtimesInternal(
            List<ShowtimeAdminRequest> requests,
            SchedulingRules schedulingRules) {
        if (requests == null || requests.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách suất chiếu không được để trống.");
        }

        requests.forEach(this::validateShowtime);
        List<Long> roomIds = requests.stream()
                .map(ShowtimeAdminRequest::getCinemaRoomId)
                .distinct()
                .sorted()
                .toList();
        // Tuần tự hóa các thao tác tạo lịch cùng phòng để tránh hai request
        // đồng thời cùng vượt qua bước kiểm tra trùng lịch.
        cinemaRoomRepository.findAllByIdForUpdate(roomIds);

        List<ShowtimeDraft> drafts = new ArrayList<>();
        for (ShowtimeAdminRequest request : requests) {
            ShowtimeDraft draft = resolveDraft(request, schedulingRules);
            ensureNoInternalOverlap(drafts, draft, schedulingRules.turnaroundMinutes());
            ensureNoOverlappingShowtime(draft, null, schedulingRules.turnaroundMinutes());
            drafts.add(draft);
        }

        List<Showtime> showtimes = drafts.stream()
                .map(draft -> Showtime.builder()
                        .movie(draft.movie())
                        .cinemaRoom(draft.cinemaRoom())
                        .presentation(draft.presentation())
                        .showDate(draft.showDate())
                        .startTime(draft.startTime())
                        .endTime(draft.endTime())
                        .basePrice(draft.basePrice())
                        .status(draft.status())
                        .build())
                .toList();

        List<Showtime> savedShowtimes = showtimeRepository.saveAll(showtimes);
        savedShowtimes.forEach(showtimeSeatService::generateSeatsForShowtime);
        return savedShowtimes.stream()
                .map(showtime -> showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId()))
                .toList();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimeResponse updateShowtime(Long showtimeId, ShowtimeAdminRequest request) {
        Showtime showtime = getShowtime(showtimeId);
        validateShowtime(request);
        cinemaRoomRepository.findAllByIdForUpdate(java.util.stream.Stream.of(
                        showtime.getCinemaRoom().getCinemaRoomId(), request.getCinemaRoomId())
                .distinct().sorted().toList());
        ensureShowtimeCanBeEdited(showtime);
        SchedulingRules schedulingRules = resolveSchedulingRules();
        ShowtimeDraft draft = resolveDraft(request, schedulingRules);
        ensureNoOverlappingShowtime(draft, showtimeId, schedulingRules.turnaroundMinutes());
        ensureEditableIfHasBookings(showtime, draft);

        boolean roomChanged = !showtime.getCinemaRoom().getCinemaRoomId()
                .equals(draft.cinemaRoom().getCinemaRoomId());

        showtime.setMovie(draft.movie());
        showtime.setCinemaRoom(draft.cinemaRoom());
        showtime.setPresentation(draft.presentation());
        showtime.setShowDate(draft.showDate());
        showtime.setStartTime(draft.startTime());
        showtime.setEndTime(draft.endTime());
        showtime.setBasePrice(draft.basePrice());
        showtime.setStatus(draft.status());

        showtime = showtimeRepository.save(showtime);
        if (roomChanged) {
            showtimeSeatService.deleteSeatsByShowtimeId(showtimeId);
            showtimeSeatService.generateSeatsForShowtime(showtime);
        }
        return showtimeMapper.toShowtimeResponse(showtime, showtime.getMovie().getMovieId());
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public void cancelShowtime(Long showtimeId) {
        cancelShowtimeInternal(showtimeId);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public int cancelShowtimes(List<Long> showtimeIds) {
        if (showtimeIds == null || showtimeIds.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách suất chiếu không được để trống.");
        }

        List<Long> uniqueShowtimeIds = showtimeIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (uniqueShowtimeIds.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách suất chiếu không hợp lệ.");
        }

        uniqueShowtimeIds.forEach(this::cancelShowtimeInternal);
        return uniqueShowtimeIds.size();
    }

    private void cancelShowtimeInternal(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        ShowtimeStatus currentStatus = resolveRealTimeStatus(showtime, LocalDateTime.now());
        if (currentStatus == ShowtimeStatus.COMPLETED || currentStatus == ShowtimeStatus.ONGOING) {
            showtime.setStatus(currentStatus);
            showtimeRepository.save(showtime);
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Không thể hủy suất chiếu đang chiếu hoặc đã kết thúc.");
        }
        if (currentStatus == ShowtimeStatus.CANCELLED) {
            return;
        }
        if (hasActiveBookings(showtimeId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Không thể hủy suất chiếu đã có đặt vé hoặc đang giữ ghế.");
        }
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);
    }

    @Scheduled(fixedDelayString = "${showtime.status-sync-delay-ms:30000}")
    @Transactional
    public void syncShowtimeStatuses() {
        LocalDateTime now = LocalDateTime.now();
        List<Showtime> candidates = showtimeRepository.findStatusSyncCandidates(
                now.toLocalDate().plusDays(1),
                UNBOOKABLE_SHOWTIME_STATUSES);

        candidates.forEach(showtime -> {
            ShowtimeStatus realTimeStatus = resolveRealTimeStatus(showtime, now);
            if (realTimeStatus != null && showtime.getStatus() != realTimeStatus) {
                showtime.setStatus(realTimeStatus);
            }
        });
    }

    // ==========================================
    // INTERNAL - Dùng bởi MovieService
    // ==========================================

    @Transactional
    public void replaceShowtimes(Movie movie, List<ShowtimeRequest> requests) {
        SchedulingRules schedulingRules = resolveSchedulingRules();
        if (requests != null && !requests.isEmpty()) {
            List<Long> roomIds = requests.stream()
                    .filter(Objects::nonNull)
                    .map(ShowtimeRequest::getCinemaRoomId)
                    .filter(Objects::nonNull)
                    .distinct().sorted().toList();
            if (!roomIds.isEmpty()) cinemaRoomRepository.findAllByIdForUpdate(roomIds);
        }
        movie.getShowtimes().forEach(st -> {
            if (st.getShowtimeId() != null) {
                showtimeSeatService.deleteSeatsByShowtimeId(st.getShowtimeId());
            }
        });
        movie.getShowtimes().clear();
        if (requests == null) {
            return;
        }

        List<Showtime> replacementShowtimes = new ArrayList<>();
        requests.stream()
                .filter(request -> request != null)
                .forEach(request -> {
                    validateShowtime(request);
                    CinemaRoom cinemaRoom = getCinemaRoom(request.getCinemaRoomId());
                    ShowtimeStatus status = resolveStatus(request.getStatus());
                    MoviePresentation presentation = resolvePresentation(movie, cinemaRoom, request.getPresentationId(), status);
                    Integer basePrice = resolveBasePrice(request.getBasePrice(), presentation);
                    validateShowtimeValues(movie, presentation, cinemaRoom, request.getShowDate(), request.getStartTime(), request.getEndTime(), status, schedulingRules);
                    ensureNoInternalOverlap(replacementShowtimes, cinemaRoom, request.getShowDate(), request.getStartTime(), request.getEndTime(), status, schedulingRules.turnaroundMinutes());
                    ensureNoOverlappingShowtimeForOtherMovie(movie, cinemaRoom, request.getShowDate(), request.getStartTime(), request.getEndTime(), status, schedulingRules.turnaroundMinutes());

                    replacementShowtimes.add(Showtime.builder()
                            .movie(movie)
                            .cinemaRoom(cinemaRoom)
                            .presentation(presentation)
                            .showDate(request.getShowDate())
                            .startTime(request.getStartTime())
                            .endTime(request.getEndTime())
                            .basePrice(basePrice)
                            .status(status)
                            .build());
                });

        movie.getShowtimes().addAll(replacementShowtimes);
    }

    // ==========================================
    // PRIVATE
    private void validateShowtime(ShowtimeRequest request) {
        if (request.getCinemaRoomId() == null
                || request.getShowDate() == null
                || request.getStartTime() == null
                || request.getEndTime() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
    }

    private void validateShowtime(ShowtimeAdminRequest request) {
        if (request == null
                || request.getMovieId() == null
                || request.getCinemaRoomId() == null
                || request.getShowDate() == null
                || request.getStartTime() == null
                || request.getEndTime() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
    }

    private ShowtimeDraft resolveDraft(ShowtimeAdminRequest request, SchedulingRules schedulingRules) {
        validateShowtime(request);
        Movie movie = getMovie(request.getMovieId());
        CinemaRoom cinemaRoom = getCinemaRoom(request.getCinemaRoomId());
        ShowtimeStatus status = resolveStatus(request.getStatus());
        ensureAdminEditableStatus(status);
        MoviePresentation presentation = resolvePresentation(movie, cinemaRoom, request.getPresentationId(), status);
        Integer basePrice = resolveBasePrice(request.getBasePrice(), presentation);
        validateShowtimeValues(movie, presentation, cinemaRoom, request.getShowDate(), request.getStartTime(), request.getEndTime(), status, schedulingRules);
        return new ShowtimeDraft(movie, cinemaRoom, presentation, request.getShowDate(), request.getStartTime(), request.getEndTime(), basePrice, status);
    }

    private void validateShowtimeValues(
            Movie movie,
            MoviePresentation presentation,
            CinemaRoom cinemaRoom,
            LocalDate showDate,
            LocalTime startTime,
            LocalTime endTime,
            ShowtimeStatus status,
            SchedulingRules schedulingRules) {
        if (startTime.equals(endTime)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giờ bắt đầu và giờ kết thúc không được trùng nhau.");
        }

        LocalDateTime startsAt = toStartDateTime(showDate, startTime);
        LocalDateTime endsAt = toEndDateTime(showDate, startTime, endTime);
        LocalDateTime latestEndsAt;
        if (schedulingRules.openingTime().isBefore(schedulingRules.latestFinishTime())) {
            if (startTime.isBefore(schedulingRules.openingTime())
                    || !startTime.isBefore(schedulingRules.latestFinishTime())) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Giờ bắt đầu phải nằm trong khung hoạt động %s–%s."
                                .formatted(schedulingRules.openingTime(), schedulingRules.latestFinishTime()));
            }
            latestEndsAt = showDate.atTime(schedulingRules.latestFinishTime());
        } else if (!startTime.isBefore(schedulingRules.openingTime())) {
            latestEndsAt = showDate.plusDays(1).atTime(schedulingRules.latestFinishTime());
        } else if (startTime.isBefore(schedulingRules.latestFinishTime())) {
            latestEndsAt = showDate.atTime(schedulingRules.latestFinishTime());
        } else {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Giờ bắt đầu phải nằm trong khung hoạt động %s–%s."
                            .formatted(schedulingRules.openingTime(), schedulingRules.latestFinishTime()));
        }

        if (!endsAt.isAfter(startsAt)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giờ kết thúc phải sau giờ bắt đầu.");
        }

        if (endsAt.isAfter(latestEndsAt)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Suất chiếu phải kết thúc không muộn hơn %s."
                            .formatted(schedulingRules.latestFinishTime()));
        }

        if (status != ShowtimeStatus.CANCELLED && cinemaRoom.getStatus() != RoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phòng chiếu đã bị vô hiệu hóa hoặc đang bảo trì, không thể tạo suất chiếu.");
        }

        if (status != ShowtimeStatus.CANCELLED
                && (movie.getStatus() == MovieStatus.INACTIVE || movie.getStatus() == MovieStatus.ENDED)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phim không còn hợp lệ để tạo suất chiếu.");
        }

        if (status != ShowtimeStatus.CANCELLED) {
            ensureMovieFormatSupportedByRoom(movie, presentation, cinemaRoom);
        }

        if (status == ShowtimeStatus.SCHEDULED
                && !startsAt.isAfter(LocalDateTime.now())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể tạo hoặc cập nhật suất chiếu trong quá khứ.");
        }

        if (movie.getDuration() != null && movie.getDuration() > 0) {
            long showtimeMinutes = Duration.between(startsAt, endsAt).toMinutes();
            if (showtimeMinutes < movie.getDuration()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Thời lượng suất chiếu phải lớn hơn hoặc bằng thời lượng phim.");
            }
        }

        if (movie.getFromDate() != null && showDate.isBefore(movie.getFromDate())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày chiếu không được trước ngày khởi chiếu của phim.");
        }

        if (movie.getToDate() != null && showDate.isAfter(movie.getToDate())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày chiếu không được sau ngày kết thúc của phim.");
        }
    }

    private void ensureEditableIfHasBookings(Showtime current, ShowtimeDraft draft) {
        if (!hasActiveBookings(current.getShowtimeId())) {
            return;
        }

        boolean coreChanged = !current.getMovie().getMovieId().equals(draft.movie().getMovieId())
                || !current.getCinemaRoom().getCinemaRoomId().equals(draft.cinemaRoom().getCinemaRoomId())
                || !Objects.equals(resolvePresentationId(current.getPresentation()), resolvePresentationId(draft.presentation()))
                || !current.getShowDate().equals(draft.showDate())
                || !current.getStartTime().equals(draft.startTime())
                || !current.getEndTime().equals(draft.endTime());
        boolean cancelling = draft.status() == ShowtimeStatus.CANCELLED;

        if (coreChanged || cancelling) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Suất chiếu đã có đặt vé hoặc đang giữ ghế, không thể đổi phim/phòng/giờ hoặc hủy.");
        }
    }

    private boolean hasActiveBookings(Long showtimeId) {
        return bookingRepository.existsByShowtime_ShowtimeIdAndStatusIn(showtimeId, ACTIVE_BOOKING_STATUSES);
    }

    private void ensureMovieFormatSupportedByRoom(Movie movie, MoviePresentation presentation, CinemaRoom cinemaRoom) {
        if (presentation != null) {
            if (!isPresentationSupportedByRoom(presentation, cinemaRoom)) {
                String roomType = cinemaRoom.getType() == null ? "STANDARD" : cinemaRoom.getType().toDisplayString();
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Phòng chiếu %s (%s) không hỗ trợ phiên bản %s của phim %s."
                                .formatted(
                                        cinemaRoom.getCinemaRoomName(),
                                        roomType,
                                        presentation.getDisplayName(),
                                        movie.getMovieNameVn()));
            }
            return;
        }

        Set<MovieFormat> movieFormats = movie.getFormats();
        if (movieFormats == null || movieFormats.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Phim chưa có định dạng chiếu, không thể tạo suất chiếu.");
        }

        Set<MovieFormat> roomFormats = MoviePresentationCompatibility.supportedFormats(cinemaRoom.getType());
        if (!supportsMovieFormat(movie, cinemaRoom)) {
            String roomType = cinemaRoom.getType() == null ? "STANDARD" : cinemaRoom.getType().toDisplayString();
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu %s (%s) không hỗ trợ định dạng của phim %s. Phim hỗ trợ: %s. Phòng hỗ trợ: %s."
                            .formatted(
                                    cinemaRoom.getCinemaRoomName(),
                                    roomType,
                                    movie.getMovieNameVn(),
                                    formatMovieFormats(movieFormats),
                                    formatMovieFormats(roomFormats)));
        }
    }

    private boolean supportsMovieFormat(Movie movie, CinemaRoom cinemaRoom) {
        Set<MovieFormat> movieFormats = movie.getFormats();
        if (movieFormats == null || movieFormats.isEmpty()) {
            return false;
        }
        return movieFormats.stream().anyMatch(MoviePresentationCompatibility.supportedFormats(cinemaRoom.getType())::contains);
    }

    private MoviePresentation resolvePresentation(
            Movie movie,
            CinemaRoom cinemaRoom,
            Long presentationId,
            ShowtimeStatus status) {
        if (presentationId != null) {
            MoviePresentation presentation = moviePresentationRepository.findById(presentationId)
                    .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy phiên bản chiếu của phim."));
            if (presentation.getMovie() == null || !movie.getMovieId().equals(presentation.getMovie().getMovieId())) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Phiên bản chiếu không thuộc phim đã chọn.");
            }
            if (status != ShowtimeStatus.CANCELLED && !isActivePresentation(presentation)) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Phiên bản chiếu đã bị ẩn, không thể tạo suất chiếu.");
            }
            return presentation;
        }

        if (movie.getPresentations() == null || movie.getPresentations().isEmpty()) {
            return null;
        }

        List<MoviePresentation> activePresentations = movie.getPresentations().stream()
                .filter(this::isActivePresentation)
                .sorted(Comparator
                        .comparing(MoviePresentation::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(MoviePresentation::getPresentationId, Comparator.nullsLast(Long::compareTo)))
                .toList();
        if (activePresentations.isEmpty()) {
            return null;
        }
        if (status == ShowtimeStatus.CANCELLED) {
            return activePresentations.getFirst();
        }
        return activePresentations.stream()
                .filter(presentation -> isPresentationSupportedByRoom(presentation, cinemaRoom))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR,
                        "Phim không có phiên bản chiếu phù hợp với phòng đã chọn."));
    }

    private boolean isPresentationSupportedByRoom(MoviePresentation presentation, CinemaRoom cinemaRoom) {
        return MoviePresentationCompatibility.isSupportedByRoom(presentation, cinemaRoom.getType());
    }

    private boolean isActivePresentation(MoviePresentation presentation) {
        return presentation != null && (presentation.getActive() == null || presentation.getActive());
    }

    private Long resolvePresentationId(MoviePresentation presentation) {
        return presentation == null ? null : presentation.getPresentationId();
    }

    private String formatMovieFormats(Set<MovieFormat> formats) {
        return formats.stream()
                .sorted(Comparator.comparing(MovieFormat::name))
                .map(MovieFormat::toDisplayString)
                .reduce((first, second) -> first + ", " + second)
                .orElse("Không có");
    }

    private ShowtimeStatus resolveStatus(ShowtimeStatus status) {
        return status == null ? ShowtimeStatus.SCHEDULED : status;
    }

    private Integer resolveBasePrice(Integer basePrice, MoviePresentation presentation) {
        if (basePrice == null) {
            return ticketPricingService.resolveConfiguredPresentationBasePrice(presentation);
        }
        if (basePrice < MIN_BASE_PRICE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giá vé gốc phải lớn hơn hoặc bằng 1.000đ.");
        }
        return basePrice;
    }

    private void ensureShowtimeCanBeEdited(Showtime showtime) {
        ShowtimeStatus currentStatus = resolveRealTimeStatus(showtime, LocalDateTime.now());
        if (currentStatus == ShowtimeStatus.ONGOING || currentStatus == ShowtimeStatus.COMPLETED) {
            showtime.setStatus(currentStatus);
            showtimeRepository.save(showtime);
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Không thể chỉnh sửa suất chiếu đang chiếu hoặc đã kết thúc.");
        }
        if (currentStatus == ShowtimeStatus.CANCELLED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể chỉnh sửa suất chiếu đã hủy.");
        }
    }

    private void ensureAdminEditableStatus(ShowtimeStatus status) {
        if (status == ShowtimeStatus.ONGOING || status == ShowtimeStatus.COMPLETED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Trạng thái Đang chiếu và Đã chiếu được hệ thống tự cập nhật theo thời gian.");
        }
    }

    private ShowtimeStatus resolveRealTimeStatus(Showtime showtime, LocalDateTime now) {
        if (showtime.getShowDate() == null || showtime.getStartTime() == null || showtime.getEndTime() == null) {
            return null;
        }
        if (showtime.getStatus() == ShowtimeStatus.CANCELLED || showtime.getStatus() == ShowtimeStatus.COMPLETED) {
            return showtime.getStatus();
        }

        LocalDateTime startsAt = toStartDateTime(showtime.getShowDate(), showtime.getStartTime());
        LocalDateTime endsAt = toEndDateTime(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime());
        if (!now.isBefore(endsAt)) {
            return ShowtimeStatus.COMPLETED;
        }
        if (!now.isBefore(startsAt)) {
            return ShowtimeStatus.ONGOING;
        }
        return ShowtimeStatus.SCHEDULED;
    }

    private void ensureNoOverlappingShowtime(
            ShowtimeDraft draft,
            Long excludedShowtimeId,
            int turnaroundMinutes) {
        if (draft.status() == ShowtimeStatus.CANCELLED) {
            return;
        }

        boolean overlapping = showtimeRepository.existsOverlappingShowtime(
                draft.cinemaRoom().getCinemaRoomId(),
                draft.showDate(),
                draft.startTime(),
                draft.endTime(),
                excludedShowtimeId,
                ShowtimeStatus.CANCELLED);
        overlapping = overlapping || hasOverlappingShowtime(draft, excludedShowtimeId, turnaroundMinutes);
        if (overlapping) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đã có suất chiếu khác trong khung giờ này hoặc chưa đủ thời gian dọn rạp.");
        }
    }

    private void ensureNoOverlappingShowtimeForOtherMovie(
            Movie movie,
            CinemaRoom cinemaRoom,
            LocalDate showDate,
            LocalTime startTime,
            LocalTime endTime,
            ShowtimeStatus status,
            int turnaroundMinutes) {
        if (status == ShowtimeStatus.CANCELLED) {
            return;
        }

        boolean overlapping = showtimeRepository.existsOverlappingShowtimeForOtherMovie(
                cinemaRoom.getCinemaRoomId(),
                showDate,
                startTime,
                endTime,
                movie.getMovieId(),
                ShowtimeStatus.CANCELLED);
        LocalDateTime startsAt = toStartDateTime(showDate, startTime);
        LocalDateTime endsAt = withTurnaround(toEndDateTime(showDate, startTime, endTime), turnaroundMinutes);
        overlapping = overlapping || showtimeRepository.findRoomShowtimesForOverlapCheck(
                        cinemaRoom.getCinemaRoomId(),
                        showDate.minusDays(1),
                        showDate.plusDays(1),
                        ShowtimeStatus.CANCELLED)
                .stream()
                .filter(showtime -> !showtime.getMovie().getMovieId().equals(movie.getMovieId()))
                .anyMatch(showtime -> intervalsOverlap(
                        startsAt,
                        endsAt,
                        toStartDateTime(showtime.getShowDate(), showtime.getStartTime()),
                        withTurnaround(
                                toEndDateTime(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime()),
                                turnaroundMinutes)));
        if (overlapping) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đã có suất chiếu khác trong khung giờ này hoặc chưa đủ thời gian dọn rạp.");
        }
    }

    private void ensureNoInternalOverlap(
            List<Showtime> showtimes,
            CinemaRoom cinemaRoom,
            LocalDate showDate,
            LocalTime startTime,
            LocalTime endTime,
            ShowtimeStatus status,
            int turnaroundMinutes) {
        if (status == ShowtimeStatus.CANCELLED) {
            return;
        }

        LocalDateTime startsAt = toStartDateTime(showDate, startTime);
        LocalDateTime endsAt = withTurnaround(toEndDateTime(showDate, startTime, endTime), turnaroundMinutes);

        boolean overlapping = showtimes.stream()
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .anyMatch(showtime -> showtime.getCinemaRoom().getCinemaRoomId().equals(cinemaRoom.getCinemaRoomId())
                        && intervalsOverlap(
                                startsAt,
                                endsAt,
                                toStartDateTime(showtime.getShowDate(), showtime.getStartTime()),
                                withTurnaround(
                                        toEndDateTime(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime()),
                                        turnaroundMinutes)));
        if (overlapping) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Có suất chiếu bị trùng phòng, khung giờ hoặc thời gian dọn rạp trong danh sách.");
        }
    }

    private void ensureNoInternalOverlap(
            List<ShowtimeDraft> drafts,
            ShowtimeDraft candidate,
            int turnaroundMinutes) {
        if (candidate.status() == ShowtimeStatus.CANCELLED) {
            return;
        }

        LocalDateTime startsAt = toStartDateTime(candidate.showDate(), candidate.startTime());
        LocalDateTime endsAt = withTurnaround(
                toEndDateTime(candidate.showDate(), candidate.startTime(), candidate.endTime()),
                turnaroundMinutes);

        boolean overlapping = drafts.stream()
                .filter(draft -> draft.status() != ShowtimeStatus.CANCELLED)
                .anyMatch(draft -> draft.cinemaRoom().getCinemaRoomId().equals(candidate.cinemaRoom().getCinemaRoomId())
                        && intervalsOverlap(
                                startsAt,
                                endsAt,
                                toStartDateTime(draft.showDate(), draft.startTime()),
                                withTurnaround(
                                        toEndDateTime(draft.showDate(), draft.startTime(), draft.endTime()),
                                        turnaroundMinutes)));
        if (overlapping) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Có suất chiếu bị trùng phòng, khung giờ hoặc thời gian dọn rạp trong danh sách tạo hàng loạt.");
        }
    }

    private boolean hasOverlappingShowtime(
            ShowtimeDraft draft,
            Long excludedShowtimeId,
            int turnaroundMinutes) {
        LocalDateTime startsAt = toStartDateTime(draft.showDate(), draft.startTime());
        LocalDateTime endsAt = withTurnaround(
                toEndDateTime(draft.showDate(), draft.startTime(), draft.endTime()),
                turnaroundMinutes);

        return showtimeRepository.findRoomShowtimesForOverlapCheck(
                        draft.cinemaRoom().getCinemaRoomId(),
                        draft.showDate().minusDays(1),
                        draft.showDate().plusDays(1),
                        ShowtimeStatus.CANCELLED)
                .stream()
                .filter(showtime -> excludedShowtimeId == null || !showtime.getShowtimeId().equals(excludedShowtimeId))
                .anyMatch(showtime -> intervalsOverlap(
                        startsAt,
                        endsAt,
                        toStartDateTime(showtime.getShowDate(), showtime.getStartTime()),
                        withTurnaround(
                                toEndDateTime(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime()),
                                turnaroundMinutes)));
    }

    private SchedulingRules resolveSchedulingRules() {
        return validateSchedulingRules(new SchedulingRules(
                DEFAULT_OPENING_TIME,
                LATEST_FINISH_TIME,
                DEFAULT_TURNAROUND_MINUTES));
    }

    private SchedulingRules validateSchedulingRules(SchedulingRules rules) {
        if (rules.openingTime() == null || rules.latestFinishTime() == null
                || rules.openingTime().equals(rules.latestFinishTime())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khung giờ hoạt động của rạp chưa hợp lệ.");
        }
        if (rules.turnaroundMinutes() < 0 || rules.turnaroundMinutes() > MAX_TURNAROUND_MINUTES) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Thời gian dọn phòng phải từ 0 đến 120 phút.");
        }
        return rules;
    }

    private LocalDateTime withTurnaround(LocalDateTime endsAt, int turnaroundMinutes) {
        return endsAt.plusMinutes(turnaroundMinutes);
    }

    private boolean intervalsOverlap(
            LocalDateTime firstStart,
            LocalDateTime firstEnd,
            LocalDateTime secondStart,
            LocalDateTime secondEnd) {
        return firstStart.isBefore(secondEnd) && firstEnd.isAfter(secondStart);
    }

    private LocalDateTime toStartDateTime(LocalDate showDate, LocalTime startTime) {
        return LocalDateTime.of(showDate, startTime);
    }

    private LocalDateTime toEndDateTime(LocalDate showDate, LocalTime startTime, LocalTime endTime) {
        LocalDate endDate = endTime.isAfter(startTime) ? showDate : showDate.plusDays(1);
        return LocalDateTime.of(endDate, endTime);
    }

    private Showtime getShowtime(Long showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
    }

    private Movie getMovie(Long movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
    }

    private CinemaRoom getCinemaRoom(Long cinemaRoomId) {
        return cinemaRoomRepository.findById(cinemaRoomId)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));
    }

    private String resolveDisplayName(Movie movie) {
        if (movie.getMovieNameVn() != null && !movie.getMovieNameVn().isBlank()) {
            return movie.getMovieNameVn();
        }
        return movie.getMovieNameEnglish();
    }

    private String buildSeatSelectionPath(Long movieId, Showtime showtime) {
        return "/seat-selection?movieId=%d&showtimeId=%d&date=%s&time=%s"
                .formatted(movieId, showtime.getShowtimeId(), showtime.getShowDate(), showtime.getStartTime());
    }

    private boolean isBookableByTime(Showtime showtime) {
        if (showtime.getShowDate() == null || showtime.getStartTime() == null || showtime.getEndTime() == null) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = toStartDateTime(showtime.getShowDate(), showtime.getStartTime());
        return startsAt.isAfter(now)
                && !now.isBefore(startsAt.minusDays(EARLY_BOOKING_WINDOW_DAYS));
    }

    private record ShowtimeDraft(
            Movie movie,
            CinemaRoom cinemaRoom,
            MoviePresentation presentation,
            LocalDate showDate,
            LocalTime startTime,
            LocalTime endTime,
            Integer basePrice,
            ShowtimeStatus status) {
    }

    private record SchedulingRules(
            LocalTime openingTime,
            LocalTime latestFinishTime,
            int turnaroundMinutes) {
    }

}
