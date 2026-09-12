package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingLoyaltyPointsTest {

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
    @Mock MembershipService membershipService;
    @Mock PromotionService promotionService;

    @InjectMocks BookingService bookingService;

    @Test
    void successfulPaymentAwardsPointsOnceFromFinalPaidAmount() {
        User customer = User.builder()
                .userId("customer-1")
                .username("customer")
                .email("customer@example.com")
                .roles(Set.of(Role.builder().roleName("CUSTOMER").build()))
                .build();
        Showtime showtime = Showtime.builder()
                .showtimeId(10L)
                .movie(Movie.builder().status(MovieStatus.NOW_SHOWING).build())
                .cinemaRoom(CinemaRoom.builder().status(RoomStatus.ACTIVE).build())
                .showDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(19, 0))
                .status(ShowtimeStatus.SCHEDULED)
                .build();
        ShowtimeSeat showtimeSeat = ShowtimeSeat.builder()
                .showtimeSeatId(101L)
                .showtime(showtime)
                .seat(Seat.builder()
                        .seatId(201L)
                        .seatCode("A1")
                        .seatRow("A")
                        .seatNumber(1)
                        .type(SeatType.NORMAL)
                        .status(SeatStatus.ACTIVE)
                        .build())
                .status(ShowtimeSeatStatus.HOLDING)
                .build();
        Booking booking = Booking.builder()
                .bookingId(1L)
                .user(customer)
                .showtime(showtime)
                .totalAmount(110_000)
                .status(BookingStatus.PENDING)
                .build();
        Ticket ticket = Ticket.builder()
                .booking(booking)
                .showtimeSeat(showtimeSeat)
                .price(110_000)
                .build();

        when(bookingRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(ticketRepository.findByBooking_BookingId(1L)).thenReturn(List.of(ticket));
        when(showtimeSeatRepository.findByShowtime_ShowtimeId(10L)).thenReturn(List.of(showtimeSeat));
        when(membershipService.completeSuccessfulBooking(booking)).thenReturn(11);
        when(bookingComboRepository.findByBooking_BookingId(1L)).thenReturn(List.of());
        when(bookingFoodItemRepository.findByBooking_BookingId(1L)).thenReturn(List.of());

        assertTrue(bookingService.confirmBookingPayment(1L, 110_000));
        assertEquals(BookingStatus.SUCCESS, booking.getStatus());
        assertEquals(11, booking.getLoyaltyPointsEarned());
        assertEquals(ShowtimeSeatStatus.BOOKED, showtimeSeat.getStatus());

        assertTrue(bookingService.confirmBookingPayment(1L, 110_000));
        verify(membershipService, times(1)).completeSuccessfulBooking(booking);
    }
}
