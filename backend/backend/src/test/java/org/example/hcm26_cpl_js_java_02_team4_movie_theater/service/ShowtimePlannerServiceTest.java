package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerMovieRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerConfirmRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerMovieSelectionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPresentationMode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPresentationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerRecommendationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShowtimePlannerServiceTest {

    @Mock MovieRepository movieRepository;
    @Mock CinemaRoomRepository cinemaRoomRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock ShowtimeService showtimeService;
    @Mock TicketPricingService ticketPricingService;
    @InjectMocks ShowtimePlannerService plannerService;

    Movie movie;
    MoviePresentation subtitle;
    MoviePresentation dubbed;
    CinemaRoom standardRoom;
    LocalDate planDate;

    @BeforeEach
    void setUp() {
        planDate = LocalDate.now().plusDays(5);
        movie = Movie.builder()
                .movieId(1L)
                .movieNameVn("Phim kiểm thử")
                .duration(100)
                .fromDate(planDate.minusDays(2))
                .toDate(planDate.plusDays(20))
                .status(MovieStatus.NOW_SHOWING)
                .presentations(new ArrayList<>())
                .build();
        subtitle = presentation(11L, MovieFormat.STANDARD, MovieLanguageType.SUBTITLE, 0);
        dubbed = presentation(12L, MovieFormat.STANDARD, MovieLanguageType.DUBBED, 1);
        movie.setPresentations(new ArrayList<>(List.of(subtitle, dubbed)));
        standardRoom = CinemaRoom.builder()
                .cinemaRoomId(21L)
                .cinemaRoomName("Phòng 1")
                .status(RoomStatus.ACTIVE)
                .type(RoomType.STANDARD)
                .build();

        when(movieRepository.findById(1L)).thenReturn(Optional.of(movie));
        when(cinemaRoomRepository.findAllById(anyList())).thenReturn(List.of(standardRoom));
        when(showtimeRepository.findActiveShowtimesBetweenDatesAndRooms(
                any(), any(), any(ShowtimeStatus.class), anyList()))
                .thenReturn(List.of());
    }

    @Test
    void autoModeKeepsAdminQuotaAndBalancesPresentations() {
        ShowtimePlannerPreviewResponse response = plannerService.preview(request(
                4,
                ShowtimePlannerPresentationMode.AUTO,
                List.of(presentationRequest(11L, null), presentationRequest(12L, null))));

        assertTrue(response.getComplete());
        assertEquals(4, response.getTotalRequested());
        assertEquals(4, response.getTotalScheduled());
        assertEquals(2, response.getAllocations().size());
        assertEquals(4, response.getAllocations().stream().mapToInt(item -> item.getRequested()).sum());
        assertEquals(4, response.getItems().size());
        assertTrue(response.getAdditionalPossible() > 0);
        assertEquals(response.getAdditionalPossible(), response.getAdditionalByFormat().get("Standard"));
        assertTrue(response.getAllocations().stream().allMatch(item -> item.getAdditionalPossible() >= 0));
        assertTrue(response.getAllocations().getFirst().getMovieMaximumWithCurrentPlan() >= 4);
    }

    @Test
    void recommendsQuotaFromRecentOccupancyAndSplitsItByPresentation() {
        movie.setRating(7d);
        List<Object[]> history = List.of(
                new Object[]{1L, 11L, LocalDate.now().minusDays(2), 101L, 100L, 75L},
                new Object[]{1L, 11L, LocalDate.now().minusDays(2), 102L, 100L, 75L},
                new Object[]{1L, 11L, LocalDate.now().minusDays(1), 103L, 100L, 75L},
                new Object[]{1L, 11L, LocalDate.now().minusDays(1), 104L, 100L, 75L});
        when(showtimeSeatRepository.aggregatePlannerDemandByShowtime(any(), any())).thenReturn(history);

        ShowtimePlannerRecommendationResponse response = plannerService.recommendShowtimeCounts(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(2, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(18, 0))
                        .primeEndTime(LocalTime.of(22, 30))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(ShowtimePlannerMovieSelectionRequest.builder()
                                .movieId(1L)
                                .presentationIds(List.of(11L))
                                .build()))
                        .build());

        assertEquals(3, response.getTotalSuggested());
        assertTrue(response.getUsedHistoricalData());
        assertEquals(75d, response.getItems().getFirst().getAverageOccupancyRate());
        assertEquals("MEDIUM", response.getItems().getFirst().getConfidence());
        assertEquals(3, response.getItems().getFirst().getSuggestedByPresentation().get(11L));
    }

    @Test
    void standardRoomSchedulesTwoAndThreeDimensionalPresentationsSeparately() {
        MoviePresentation twoDimensional = presentation(
                11L, MovieFormat.STANDARD, MovieProjectionType.TWO_D, MovieLanguageType.SUBTITLE, 0);
        MoviePresentation threeDimensional = presentation(
                13L, MovieFormat.STANDARD, MovieProjectionType.THREE_D, MovieLanguageType.SUBTITLE, 1);
        movie.setPresentations(new ArrayList<>(List.of(twoDimensional, threeDimensional)));

        ShowtimePlannerPreviewResponse response = plannerService.preview(request(
                2,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(
                        presentationRequest(11L, 1, 75_000),
                        presentationRequest(13L, 1, 95_000))));

        assertTrue(response.getComplete());
        assertEquals(2, response.getItems().size());
        assertEquals(75_000, response.getItems().stream()
                .filter(item -> item.getPresentationId().equals(11L))
                .findFirst().orElseThrow().getBasePrice());
        assertEquals(95_000, response.getItems().stream()
                .filter(item -> item.getPresentationId().equals(13L))
                .findFirst().orElseThrow().getBasePrice());
    }

    @Test
    void spreadsMovieAcrossMorningAfternoonEveningAndLateWhenQuotaAllows() {
        ShowtimePlannerPreviewResponse response = plannerService.preview(request(
                4,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(presentationRequest(11L, 4))));

        List<LocalTime> starts = response.getItems().stream()
                .map(ShowtimePlannerPreviewItem::getStartTime)
                .toList();

        assertTrue(response.getComplete());
        assertEquals(4, response.getTotalScheduled());
        assertTrue(starts.stream().anyMatch(time -> !time.isBefore(LocalTime.of(6, 0))
                && time.isBefore(LocalTime.NOON)));
        assertTrue(starts.stream().anyMatch(time -> !time.isBefore(LocalTime.NOON)
                && time.isBefore(LocalTime.of(18, 0))));
        assertTrue(starts.stream().anyMatch(time -> !time.isBefore(LocalTime.of(18, 0))
                && time.isBefore(LocalTime.of(22, 0))));
        assertTrue(starts.stream().anyMatch(time -> !time.isBefore(LocalTime.of(22, 0))
                || time.isBefore(LocalTime.of(6, 0))));
    }

    @Test
    void maximizeModeFillsEveryPossibleSlotAndCanBeConfirmedAboveMinimumQuota() {
        ShowtimePlannerPreviewRequest plan = request(
                1,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(presentationRequest(11L, 1)));
        plan.setMaximizeSchedule(true);

        ShowtimePlannerPreviewResponse response = plannerService.preview(plan);
        ShowtimePlannerCapacityResponse capacity = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(2, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(18, 0))
                        .primeEndTime(LocalTime.of(22, 30))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(ShowtimePlannerMovieSelectionRequest.builder()
                                .movieId(1L)
                                .presentationIds(List.of(11L))
                                .build()))
                        .build());

        assertTrue(response.getComplete());
        assertEquals(1, response.getTotalRequested());
        assertEquals(capacity.getTotalMaximum(), response.getTotalScheduled());
        assertTrue(response.getTotalScheduled() > response.getTotalRequested());
        assertEquals(0, response.getAdditionalPossible());
        assertDoesNotThrow(() -> plannerService.confirm(
                ShowtimePlannerConfirmRequest.builder()
                        .plan(plan)
                        .items(response.getItems())
                        .build()));
    }

    @Test
    void maximizeModeBalancesExtraSlotsBetweenEquivalentPresentations() {
        ShowtimePlannerPreviewRequest plan = request(
                2,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(presentationRequest(11L, 1), presentationRequest(12L, 1)));
        plan.setMaximizeSchedule(true);

        ShowtimePlannerPreviewResponse response = plannerService.preview(plan);
        List<Integer> scheduledCounts = response.getAllocations().stream()
                .map(item -> item.getScheduled())
                .toList();

        assertTrue(response.getComplete());
        assertTrue(response.getTotalScheduled() > response.getTotalRequested());
        assertEquals(2, scheduledCounts.size());
        assertTrue(Math.abs(scheduledCounts.get(0) - scheduledCounts.get(1)) <= 1);
    }

    @Test
    void maximizeModeRepacksAroundLongMovieQuotaWithoutLosingRoomCapacity() {
        movie.setDuration(160);
        Movie shortMovie = Movie.builder()
                .movieId(2L)
                .movieNameVn("Phim ngắn")
                .duration(80)
                .fromDate(planDate.minusDays(2))
                .toDate(planDate.plusDays(20))
                .status(MovieStatus.NOW_SHOWING)
                .presentations(new ArrayList<>())
                .build();
        MoviePresentation shortPresentation = MoviePresentation.builder()
                .presentationId(21L)
                .movie(shortMovie)
                .format(MovieFormat.STANDARD)
                .projectionType(MovieProjectionType.TWO_D)
                .languageType(MovieLanguageType.SUBTITLE)
                .active(true)
                .sortOrder(0)
                .build();
        shortMovie.setPresentations(new ArrayList<>(List.of(shortPresentation)));
        when(movieRepository.findById(2L)).thenReturn(Optional.of(shortMovie));

        ShowtimePlannerPreviewRequest plan = ShowtimePlannerPreviewRequest.builder()
                .fromDate(planDate)
                .toDate(planDate)
                .openingTime(LocalTime.of(8, 0))
                .latestFinishTime(LocalTime.of(16, 0))
                .turnaroundMinutes(20)
                .slotIntervalMinutes(15)
                .primeStartTime(LocalTime.of(10, 0))
                .primeEndTime(LocalTime.of(12, 0))
                .maximizeSchedule(true)
                .cinemaRoomIds(List.of(21L))
                .movies(List.of(
                        ShowtimePlannerMovieRequest.builder()
                                .movieId(1L)
                                .requestedShowtimes(1)
                                .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                .presentations(List.of(presentationRequest(11L, 1)))
                                .build(),
                        ShowtimePlannerMovieRequest.builder()
                                .movieId(2L)
                                .requestedShowtimes(1)
                                .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                .presentations(List.of(presentationRequest(21L, 1)))
                                .build()))
                .build();
        ShowtimePlannerPreviewResponse response = plannerService.preview(plan);
        ShowtimePlannerCapacityResponse capacity = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(16, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(10, 0))
                        .primeEndTime(LocalTime.of(12, 0))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(
                                ShowtimePlannerMovieSelectionRequest.builder()
                                        .movieId(1L)
                                        .presentationIds(List.of(11L))
                                        .build(),
                                ShowtimePlannerMovieSelectionRequest.builder()
                                        .movieId(2L)
                                        .presentationIds(List.of(21L))
                                        .build()))
                        .build());

        assertTrue(response.getComplete());
        assertEquals(capacity.getTotalMaximum(), response.getTotalScheduled());
        assertTrue(response.getAllocations().stream().allMatch(item -> item.getScheduled() >= item.getRequested()));
    }

    @Test
    void previewReportsRemainingCapacityForASelectedZeroQuotaPresentation() {
        ShowtimePlannerPreviewResponse response = plannerService.preview(request(
                1,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(presentationRequest(11L, 1), presentationRequest(12L, 0))));

        assertTrue(response.getComplete());
        assertEquals(2, response.getAllocations().size());
        assertEquals(0, response.getAllocations().stream()
                .filter(item -> item.getPresentationId().equals(12L))
                .findFirst()
                .orElseThrow()
                .getRequested());
        assertTrue(response.getAllocations().stream()
                .filter(item -> item.getPresentationId().equals(12L))
                .findFirst()
                .orElseThrow()
                .getAdditionalPossible() > 0);
    }

    @Test
    void manualModeRejectsPresentationTotalDifferentFromMovieQuota() {
        ShowtimePlannerPreviewRequest request = request(
                5,
                ShowtimePlannerPresentationMode.MANUAL,
                List.of(presentationRequest(11L, 2), presentationRequest(12L, 2)));

        AppException error = assertThrows(AppException.class, () -> plannerService.preview(request));

        assertTrue(error.getCustomMessage().contains("phần chia phiên bản đang là 4 suất"));
    }

    @Test
    void incompatibleRoomReturnsDetailedShortageInsteadOfSilentlyChangingQuota() {
        MoviePresentation imax = presentation(13L, MovieFormat.IMAX, MovieLanguageType.SUBTITLE, 0);
        movie.setPresentations(new ArrayList<>(List.of(imax)));

        ShowtimePlannerPreviewResponse response = plannerService.preview(request(
                1,
                ShowtimePlannerPresentationMode.AUTO,
                List.of(presentationRequest(13L, null))));

        assertFalse(response.getComplete());
        assertEquals(1, response.getTotalMissing());
        assertEquals(0, response.getAdditionalPossible());
        assertEquals(0, response.getAdditionalByFormat().get("IMAX"));
        assertEquals("QUOTA_NOT_FILLED", response.getIssues().getFirst().getCode());
        assertTrue(response.getIssues().getFirst().getBlockerCounts().containsKey("Không có phòng hỗ trợ phiên bản"));
    }

    @Test
    void confirmRejectsAListThatContainsFewerItemsThanAdminQuota() {
        ShowtimePlannerPreviewRequest plan = request(
                2,
                ShowtimePlannerPresentationMode.AUTO,
                List.of(presentationRequest(11L, null)));
        ShowtimePlannerPreviewItem onlyOneItem = ShowtimePlannerPreviewItem.builder()
                .clientKey("locked-1")
                .movieId(1L)
                .presentationId(11L)
                .cinemaRoomId(21L)
                .showDate(planDate)
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(19, 40))
                .basePrice(75_000)
                .locked(true)
                .build();

        AppException error = assertThrows(AppException.class, () -> plannerService.confirm(
                ShowtimePlannerConfirmRequest.builder().plan(plan).items(List.of(onlyOneItem)).build()));

        assertTrue(error.getCustomMessage().contains("Không thể xác nhận lịch"));
    }

    @Test
    void capacityReturnsMaximumForEverySelectedPresentationBeforeQuotaIsEntered() {
        ShowtimePlannerCapacityResponse response = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(2, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(18, 0))
                        .primeEndTime(LocalTime.of(22, 30))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(ShowtimePlannerMovieSelectionRequest.builder()
                                .movieId(1L)
                                .presentationIds(List.of(11L, 12L))
                                .build()))
                        .build());

        assertEquals(2, response.getItems().size());
        assertTrue(response.getItems().stream().allMatch(item -> item.getMaximumPossible() > 0));
        assertTrue(response.getItems().stream().allMatch(item -> item.getCompatibleRoomCount() == 1));
        assertEquals(1, response.getPlanningDays());
        assertTrue(response.getTotalMaximum() > 0);
        assertEquals(response.getTotalMaximum(), response.getMaximumByFormat().get("Standard"));
        assertEquals(response.getTotalMaximum(), response.getMaximumByFormat().values().stream().mapToInt(Integer::intValue).sum());
    }

    @Test
    void capacityBreakdownByFormatAlwaysAddsUpToGlobalMaximum() {
        MoviePresentation imax = presentation(
                13L, MovieFormat.IMAX, MovieProjectionType.THREE_D, MovieLanguageType.SUBTITLE, 2);
        movie.setPresentations(new ArrayList<>(List.of(subtitle, imax)));
        CinemaRoom imaxRoom = CinemaRoom.builder()
                .cinemaRoomId(22L)
                .cinemaRoomName("Phòng IMAX")
                .status(RoomStatus.ACTIVE)
                .type(RoomType.IMAX)
                .build();
        when(cinemaRoomRepository.findAllById(anyList())).thenReturn(List.of(standardRoom, imaxRoom));

        ShowtimePlannerCapacityResponse response = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(2, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(18, 0))
                        .primeEndTime(LocalTime.of(22, 30))
                        .cinemaRoomIds(List.of(21L, 22L))
                        .movies(List.of(ShowtimePlannerMovieSelectionRequest.builder()
                                .movieId(1L)
                                .presentationIds(List.of(11L, 13L))
                                .build()))
                        .build());

        assertTrue(response.getMaximumByFormat().get("Standard") > 0);
        assertTrue(response.getMaximumByFormat().get("IMAX") > 0);
        assertEquals(response.getTotalMaximum(),
                response.getMaximumByFormat().values().stream().mapToInt(Integer::intValue).sum());
    }

    @Test
    void capacityCountsCompatibleRoomsIndependentlyWithTurnaround() {
        CinemaRoom secondStandardRoom = CinemaRoom.builder()
                .cinemaRoomId(22L)
                .cinemaRoomName("Phòng 2")
                .status(RoomStatus.ACTIVE)
                .type(RoomType.STANDARD)
                .build();
        when(cinemaRoomRepository.findAllById(anyList()))
                .thenReturn(List.of(standardRoom, secondStandardRoom));

        ShowtimePlannerCapacityResponse response = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(14, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(18, 0))
                        .primeEndTime(LocalTime.of(22, 30))
                        .cinemaRoomIds(List.of(21L, 22L))
                        .movies(List.of(ShowtimePlannerMovieSelectionRequest.builder()
                                .movieId(1L)
                                .presentationIds(List.of(11L))
                                .build()))
                        .build());

        assertEquals(6, response.getTotalMaximum());
        assertEquals(6, response.getMaximumByFormat().get("Standard"));
        assertEquals(6, response.getItems().getFirst().getMaximumPossible());
    }

    @Test
    void previewReplansForCapacityWhenPrimeTimeChoicesFragmentTheRoom() {
        movie.setDuration(150);
        Movie shortMovie = Movie.builder()
                .movieId(2L)
                .movieNameVn("Phim ngắn")
                .duration(80)
                .fromDate(planDate.minusDays(2))
                .toDate(planDate.plusDays(20))
                .status(MovieStatus.NOW_SHOWING)
                .presentations(new ArrayList<>())
                .build();
        MoviePresentation shortPresentation = MoviePresentation.builder()
                .presentationId(21L)
                .movie(shortMovie)
                .format(MovieFormat.STANDARD)
                .projectionType(MovieProjectionType.TWO_D)
                .languageType(MovieLanguageType.SUBTITLE)
                .active(true)
                .sortOrder(0)
                .build();
        shortMovie.setPresentations(new ArrayList<>(List.of(shortPresentation)));
        when(movieRepository.findById(2L)).thenReturn(Optional.of(shortMovie));

        ShowtimePlannerPreviewResponse response = plannerService.preview(
                ShowtimePlannerPreviewRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(16, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(10, 0))
                        .primeEndTime(LocalTime.of(12, 0))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(
                                ShowtimePlannerMovieRequest.builder()
                                        .movieId(1L)
                                        .requestedShowtimes(1)
                                        .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                        .presentations(List.of(presentationRequest(11L, 1)))
                                        .build(),
                                ShowtimePlannerMovieRequest.builder()
                                        .movieId(2L)
                                        .requestedShowtimes(1)
                                        .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                        .presentations(List.of(presentationRequest(21L, 1)))
                                        .build()))
                        .build());

        ShowtimePlannerCapacityResponse capacity = plannerService.calculateCapacity(
                ShowtimePlannerCapacityRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(16, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(10, 0))
                        .primeEndTime(LocalTime.of(12, 0))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(
                                ShowtimePlannerMovieSelectionRequest.builder()
                                        .movieId(1L)
                                        .presentationIds(List.of(11L))
                                        .build(),
                                ShowtimePlannerMovieSelectionRequest.builder()
                                        .movieId(2L)
                                        .presentationIds(List.of(21L))
                                        .build()))
                        .build());

        assertTrue(response.getComplete());
        assertEquals(2, response.getTotalScheduled());
        assertEquals(0, response.getTotalMissing());
        assertTrue(response.getAdditionalPossible() >= 1);
        assertTrue(response.getTotalRequested() + response.getAdditionalPossible() <= capacity.getTotalMaximum());
        assertEquals(
                response.getAllocations().stream()
                        .mapToInt(allocation -> allocation.getAdditionalPossible())
                        .sum(),
                response.getAdditionalByFormat().get("Standard"));
        assertEquals(response.getAdditionalPossible(), response.getAdditionalByFormat().get("Standard"));
        assertTrue(response.getAllocations().stream()
                .filter(allocation -> allocation.getMovieId().equals(2L))
                .findFirst()
                .orElseThrow()
                .getAdditionalPossible() >= 1);

        int longMovieAdditional = response.getAllocations().stream()
                .filter(allocation -> allocation.getMovieId().equals(1L))
                .findFirst().orElseThrow().getAdditionalPossible();
        int shortMovieAdditional = response.getAllocations().stream()
                .filter(allocation -> allocation.getMovieId().equals(2L))
                .findFirst().orElseThrow().getAdditionalPossible();
        ShowtimePlannerPreviewResponse afterUsingDisplayedCapacity = plannerService.preview(
                ShowtimePlannerPreviewRequest.builder()
                        .fromDate(planDate)
                        .toDate(planDate)
                        .openingTime(LocalTime.of(8, 0))
                        .latestFinishTime(LocalTime.of(16, 0))
                        .turnaroundMinutes(20)
                        .slotIntervalMinutes(15)
                        .primeStartTime(LocalTime.of(10, 0))
                        .primeEndTime(LocalTime.of(12, 0))
                        .cinemaRoomIds(List.of(21L))
                        .movies(List.of(
                                ShowtimePlannerMovieRequest.builder()
                                        .movieId(1L)
                                        .requestedShowtimes(1 + longMovieAdditional)
                                        .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                        .presentations(List.of(presentationRequest(11L, 1 + longMovieAdditional)))
                                        .build(),
                                ShowtimePlannerMovieRequest.builder()
                                        .movieId(2L)
                                        .requestedShowtimes(1 + shortMovieAdditional)
                                        .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                                        .presentations(List.of(presentationRequest(21L, 1 + shortMovieAdditional)))
                                        .build()))
                        .build());

        assertTrue(afterUsingDisplayedCapacity.getComplete());
        assertEquals(
                response.getTotalRequested() + response.getAdditionalPossible(),
                afterUsingDisplayedCapacity.getTotalScheduled());
    }

    private ShowtimePlannerPreviewRequest request(
            int requested,
            ShowtimePlannerPresentationMode mode,
            List<ShowtimePlannerPresentationRequest> presentations) {
        return ShowtimePlannerPreviewRequest.builder()
                .fromDate(planDate)
                .toDate(planDate)
                .openingTime(LocalTime.of(8, 0))
                .latestFinishTime(LocalTime.of(2, 0))
                .turnaroundMinutes(20)
                .slotIntervalMinutes(15)
                .primeStartTime(LocalTime.of(18, 0))
                .primeEndTime(LocalTime.of(22, 30))
                .cinemaRoomIds(List.of(21L))
                .movies(List.of(ShowtimePlannerMovieRequest.builder()
                        .movieId(1L)
                        .requestedShowtimes(requested)
                        .basePrice(75_000)
                        .presentationMode(mode)
                        .presentations(presentations)
                        .build()))
                .build();
    }

    private ShowtimePlannerPresentationRequest presentationRequest(Long id, Integer requested) {
        return presentationRequest(id, requested, null);
    }

    private ShowtimePlannerPresentationRequest presentationRequest(Long id, Integer requested, Integer basePrice) {
        return ShowtimePlannerPresentationRequest.builder()
                .presentationId(id)
                .requestedShowtimes(requested)
                .basePrice(basePrice)
                .build();
    }

    private MoviePresentation presentation(Long id, MovieFormat format, MovieLanguageType language, int order) {
        return presentation(id, format, MovieProjectionType.TWO_D, language, order);
    }

    private MoviePresentation presentation(
            Long id,
            MovieFormat format,
            MovieProjectionType projectionType,
            MovieLanguageType language,
            int order) {
        return MoviePresentation.builder()
                .presentationId(id)
                .movie(movie)
                .format(format)
                .projectionType(projectionType)
                .languageType(language)
                .active(true)
                .sortOrder(order)
                .build();
    }
}
