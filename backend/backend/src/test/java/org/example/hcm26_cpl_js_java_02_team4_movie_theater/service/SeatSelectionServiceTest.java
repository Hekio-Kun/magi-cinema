package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatSelectionServiceTest {

    @Mock ShowtimeRepository showtimeRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock UserRepository userRepository;
    @Mock SeatRealtimeService seatRealtimeService;

    @InjectMocks SeatSelectionService seatSelectionService;

    private User user;
    private Showtime showtime;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice", "n/a", List.of()));
        user = User.builder().userId("user-1").username("alice").build();
        showtime = Showtime.builder()
                .showtimeId(10L)
                .movie(Movie.builder().movieId(20L).status(MovieStatus.NOW_SHOWING).build())
                .cinemaRoom(CinemaRoom.builder().cinemaRoomId(30L).status(RoomStatus.ACTIVE).build())
                .showDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .status(ShowtimeStatus.SCHEDULED)
                .build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        lenient().when(showtimeRepository.findById(10L)).thenReturn(Optional.of(showtime));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void selectingAvailableSeatHoldsAndPublishesImmediately() {
        ShowtimeSeat seat = seat(101L, "A1", ShowtimeSeatStatus.AVAILABLE);
        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "client-a"))
                .thenReturn(List.of());
        when(showtimeSeatRepository.findAllByIdForUpdate(anyCollection())).thenReturn(List.of(seat));

        SeatSelectionHoldResponse response = seatSelectionService.updateSelection(
                request(List.of(101L), "client-a"));

        assertEquals(List.of(101L), response.getShowtimeSeatIds());
        assertEquals(ShowtimeSeatStatus.HOLDING, seat.getStatus());
        assertEquals("user-1", seat.getSelectionHeldByUserId());
        assertEquals("client-a", seat.getSelectionHoldToken());
        assertNotNull(seat.getSelectionHoldExpiresAt());
        assertTrue(seat.getSelectionHoldExpiresAt().isAfter(LocalDateTime.now()));
        assertTrue(seat.getSelectionHoldExpiresAt().isBefore(LocalDateTime.now().plusSeconds(181)));
        verify(showtimeSeatRepository).saveAll(List.of(seat));
        verify(seatRealtimeService).publishSeatStatusChangeAfterCommit(10L, List.of(seat));
    }

    @Test
    void leavingOrOpeningBookingPageReleasesPreviousSelectionOfSameUser() {
        ShowtimeSeat oldSeat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        oldSeat.setSelectionHeldByUserId("user-1");
        oldSeat.setSelectionHoldToken("old-page");
        oldSeat.setSelectionHoldExpiresAt(LocalDateTime.now().plusMinutes(2));

        when(showtimeRepository.existsById(10L)).thenReturn(true);
        when(showtimeSeatRepository.findByShowtime_ShowtimeIdAndSelectionHeldByUserId(10L, "user-1"))
                .thenReturn(List.of(oldSeat));
        when(showtimeSeatRepository.findAllByIdForUpdate(List.of(101L))).thenReturn(List.of(oldSeat));

        seatSelectionService.releaseCurrentUserSelection(10L);

        assertEquals(ShowtimeSeatStatus.AVAILABLE, oldSeat.getStatus());
        assertNull(oldSeat.getSelectionHeldByUserId());
        assertNull(oldSeat.getSelectionHoldToken());
        assertNull(oldSeat.getSelectionHoldExpiresAt());
        verify(showtimeSeatRepository).saveAll(List.of(oldSeat));
        verify(seatRealtimeService).publishSeatStatusChangeAfterCommit(10L, List.of(oldSeat));
    }

    @Test
    void refreshingCurrentPageKeepsActiveSelectionForSameToken() {
        ShowtimeSeat heldSeat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        heldSeat.setSelectionHeldByUserId("user-1");
        heldSeat.setSelectionHoldToken("current-page");
        heldSeat.setSelectionHoldExpiresAt(LocalDateTime.now().plusMinutes(2));

        when(showtimeRepository.existsById(10L)).thenReturn(true);
        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "current-page"))
                .thenReturn(List.of(heldSeat));
        when(showtimeSeatRepository.findAllByIdForUpdate(List.of(101L))).thenReturn(List.of(heldSeat));

        SeatSelectionHoldResponse response =
                seatSelectionService.getCurrentSelection(10L, "current-page");

        assertEquals(List.of(101L), response.getShowtimeSeatIds());
        assertEquals("current-page", response.getClientToken());
        assertNotNull(response.getExpiresAt());
        verify(showtimeSeatRepository, never()).saveAll(anyList());
        verify(seatRealtimeService, never()).publishSeatStatusChangeAfterCommit(10L, List.of(heldSeat));
    }

    @Test
    void selectingSeatHeldByAnotherCustomerIsRejected() {
        ShowtimeSeat seat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        seat.setSelectionHeldByUserId("user-2");
        seat.setSelectionHoldToken("client-b");
        seat.setSelectionHoldExpiresAt(LocalDateTime.now().plusMinutes(2));
        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "client-a"))
                .thenReturn(List.of());
        when(showtimeSeatRepository.findAllByIdForUpdate(anyCollection())).thenReturn(List.of(seat));

        assertThrows(
                AppException.class,
                () -> seatSelectionService.updateSelection(request(List.of(101L), "client-a")));

        verify(showtimeSeatRepository, never()).saveAll(anyList());
        verify(seatRealtimeService, never()).publishSeatStatusChangeAfterCommit(10L, List.of(seat));
    }

    @Test
    void selectingSeatHeldByAnotherTransactionOfSameUserIsRejected() {
        ShowtimeSeat seat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        seat.setSelectionHeldByUserId("user-1");
        seat.setSelectionHoldToken("staff-transaction");
        seat.setSelectionHoldExpiresAt(LocalDateTime.now().plusMinutes(2));
        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "online-transaction"))
                .thenReturn(List.of());
        when(showtimeSeatRepository.findAllByIdForUpdate(anyCollection())).thenReturn(List.of(seat));

        assertThrows(
                AppException.class,
                () -> seatSelectionService.updateSelection(
                        request(List.of(101L), "online-transaction")));

        assertEquals(ShowtimeSeatStatus.HOLDING, seat.getStatus());
        assertEquals("staff-transaction", seat.getSelectionHoldToken());
        verify(showtimeSeatRepository, never()).saveAll(anyList());
        verify(seatRealtimeService, never()).publishSeatStatusChangeAfterCommit(10L, List.of(seat));
    }

    @Test
    void addingSeatDoesNotExtendCurrentSelectionDeadline() {
        LocalDateTime currentDeadline = LocalDateTime.now().plusMinutes(2);
        ShowtimeSeat currentSeat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        currentSeat.setSelectionHeldByUserId("user-1");
        currentSeat.setSelectionHoldToken("client-a");
        currentSeat.setSelectionHoldExpiresAt(currentDeadline);
        ShowtimeSeat addedSeat = seat(102L, "A2", ShowtimeSeatStatus.AVAILABLE);

        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "client-a"))
                .thenReturn(List.of(currentSeat));
        when(showtimeSeatRepository.findAllByIdForUpdate(anyCollection()))
                .thenReturn(List.of(currentSeat, addedSeat));

        SeatSelectionHoldResponse response = seatSelectionService.updateSelection(
                request(List.of(101L, 102L), "client-a"));

        assertEquals(currentDeadline, response.getExpiresAt());
        assertEquals(currentDeadline, currentSeat.getSelectionHoldExpiresAt());
        assertEquals(currentDeadline, addedSeat.getSelectionHoldExpiresAt());
    }

    @Test
    void replacingSelectionReleasesOldSeatAndHoldsNewSeatInOneUpdate() {
        ShowtimeSeat oldSeat = seat(101L, "A1", ShowtimeSeatStatus.HOLDING);
        oldSeat.setSelectionHeldByUserId("user-1");
        oldSeat.setSelectionHoldToken("client-a");
        oldSeat.setSelectionHoldExpiresAt(LocalDateTime.now().plusMinutes(2));
        ShowtimeSeat newSeat = seat(102L, "A2", ShowtimeSeatStatus.AVAILABLE);

        when(showtimeSeatRepository
                .findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        10L, "user-1", "client-a"))
                .thenReturn(List.of(oldSeat));
        when(showtimeSeatRepository.findAllByIdForUpdate(anyCollection()))
                .thenReturn(List.of(newSeat, oldSeat));

        SeatSelectionHoldResponse response = seatSelectionService.updateSelection(
                request(List.of(102L), "client-a"));

        assertEquals(List.of(102L), response.getShowtimeSeatIds());
        assertEquals(ShowtimeSeatStatus.AVAILABLE, oldSeat.getStatus());
        assertEquals(null, oldSeat.getSelectionHeldByUserId());
        assertEquals(ShowtimeSeatStatus.HOLDING, newSeat.getStatus());
        assertEquals("user-1", newSeat.getSelectionHeldByUserId());
        verify(showtimeSeatRepository).saveAll(List.of(newSeat, oldSeat));
        verify(seatRealtimeService).publishSeatStatusChangeAfterCommit(10L, List.of(newSeat, oldSeat));
    }

    private SeatSelectionHoldRequest request(List<Long> seatIds, String clientToken) {
        return SeatSelectionHoldRequest.builder()
                .showtimeId(10L)
                .showtimeSeatIds(seatIds)
                .clientToken(clientToken)
                .build();
    }

    private ShowtimeSeat seat(Long id, String code, ShowtimeSeatStatus status) {
        int seatNumber = Integer.parseInt(code.substring(1));
        return ShowtimeSeat.builder()
                .showtimeSeatId(id)
                .showtime(showtime)
                .seat(Seat.builder()
                        .seatId(id + 1000)
                        .seatRow(code.substring(0, 1))
                        .seatNumber(seatNumber)
                        .seatCode(code)
                        .type(SeatType.NORMAL)
                        .status(SeatStatus.ACTIVE)
                        .build())
                .status(status)
                .build();
    }
}
