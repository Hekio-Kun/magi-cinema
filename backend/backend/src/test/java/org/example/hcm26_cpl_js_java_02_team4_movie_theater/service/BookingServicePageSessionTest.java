package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingComboRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingFoodItemRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingFoodStockReservationRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodVariantRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
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
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServicePageSessionTest {

    @Mock BookingRepository bookingRepository;
    @Mock TicketRepository ticketRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock UserRepository userRepository;
    @Mock UserProfileRepository userProfileRepository;
    @Mock EmailService emailService;
    @Mock ComboRepository comboRepository;
    @Mock BookingComboRepository bookingComboRepository;
    @Mock BookingFoodItemRepository bookingFoodItemRepository;
    @Mock BookingFoodStockReservationRepository bookingFoodStockReservationRepository;
    @Mock FoodVariantRepository foodVariantRepository;
    @Mock ZaloPayPaymentService zaloPayPaymentService;
    @Mock MomoPaymentService momoPaymentService;
    @Mock SeatRealtimeService seatRealtimeService;
    @Mock DashboardNotificationService dashboardNotificationService;
    @Mock TransactionTemplate transactionTemplate;
    @Mock ShowtimeMapper showtimeMapper;
    @Mock PromotionService promotionService;
    @Mock MembershipService membershipService;

    @InjectMocks BookingService bookingService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice", "n/a", List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reopeningBookingPageCancelsPendingBookingAndReleasesItsSeat() {
        User user = User.builder().userId("user-1").username("alice").build();
        Showtime showtime = Showtime.builder().showtimeId(10L).build();
        ShowtimeSeat heldSeat = ShowtimeSeat.builder()
                .showtimeSeatId(101L)
                .showtime(showtime)
                .status(ShowtimeSeatStatus.HOLDING)
                .build();
        Booking pendingBooking = Booking.builder()
                .bookingId(201L)
                .user(user)
                .showtime(showtime)
                .status(BookingStatus.PENDING)
                .build();
        Ticket ticket = Ticket.builder()
                .ticketId(301L)
                .booking(pendingBooking)
                .showtimeSeat(heldSeat)
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(bookingRepository.findByUserAndShowtimeAndStatusForUpdate(
                "user-1", 10L, BookingStatus.PENDING))
                .thenReturn(List.of(pendingBooking));
        when(bookingFoodStockReservationRepository.findByBooking_BookingId(201L))
                .thenReturn(List.of());
        when(ticketRepository.findByBooking_BookingId(201L)).thenReturn(List.of(ticket));

        int cancelledCount = bookingService.cancelMyPendingBookingsForShowtime(10L);

        assertEquals(1, cancelledCount);
        assertEquals(BookingStatus.CANCELLED, pendingBooking.getStatus());
        assertEquals(ShowtimeSeatStatus.AVAILABLE, heldSeat.getStatus());
        verify(bookingRepository).save(pendingBooking);
        verify(showtimeSeatRepository).save(heldSeat);
        verify(seatRealtimeService).publishSeatStatusChangeAfterCommit(10L, List.of(heldSeat));
    }
}
