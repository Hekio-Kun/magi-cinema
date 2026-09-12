package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.persistence.EntityManager;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingComboRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingFoodItemRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingDomainAuditTest {
    @Mock BookingRepository bookingRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock UserRepository userRepository;
    @Mock TicketRepository ticketRepository;
    @Mock ComboRepository comboRepository;
    @Mock FoodVariantRepository foodVariantRepository;
    @Mock BookingFoodStockReservationRepository bookingFoodStockReservationRepository;
    @Mock MembershipService membershipService;
    @Mock PromotionService promotionService;
    @Mock TicketPricingService ticketPricingService;
    @Mock DashboardNotificationService dashboardNotificationService;
    @Mock EntityManager entityManager;
    @InjectMocks BookingService bookingService;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsFoodLineThatExceedsIntegerBookingAmountBeforeStockReservation() {
        BookingRequest request = bookingRequest();
        FoodVariant variant = variant(1L, 50_000L, Integer.MAX_VALUE);
        when(foodVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        request.setFoodItems(List.of(food(1L, 50_000)));

        assertInvalidBooking(request);
        verify(foodVariantRepository, never()).findAllByIdsSorted(anyCollection());
    }

    @Test
    void rejectsTotalOverflowEvenWhenEachFoodLineFits() {
        BookingRequest request = bookingRequest();
        FoodVariant variant = variant(1L, 1_100_000_000L, 10);
        when(foodVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        request.setFoodItems(List.of(food(1L, 1), food(1L, 1)));

        assertInvalidBooking(request);
        verify(foodVariantRepository, never()).findAllByIdsSorted(anyCollection());
    }

    @Test
    void rejectsOverflowingComboComponentQuantityInsteadOfSkippingItsStock() {
        BookingRequest request = bookingRequest();
        FoodVariant variant = variant(1L, 0L, 10);
        when(foodVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        Combo combo = Combo.builder().comboId(1L).name("Combo").price(0L)
                .status(ComboStatus.ACTIVE)
                .items(List.of(ComboItem.builder().foodVariant(variant).quantity(2).build())).build();
        when(comboRepository.findById(1L)).thenReturn(Optional.of(combo));
        request.setCombos(List.of(BookingComboRequest.builder().comboId(1L).quantity(Integer.MAX_VALUE).build()));

        assertInvalidBooking(request);
        verify(foodVariantRepository, never()).findAllByIdsSorted(anyCollection());
    }

    @Test
    void rejectsOverflowAcrossRepeatedStockRequirements() {
        BookingRequest request = bookingRequest();
        FoodVariant variant = variant(1L, 0L, Integer.MAX_VALUE);
        when(foodVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        request.setFoodItems(List.of(food(1L, Integer.MAX_VALUE), food(1L, 1)));

        assertInvalidBooking(request);
        verify(foodVariantRepository, never()).findAllByIdsSorted(anyCollection());
    }

    @Test
    void validatesStockAgainAfterAcquiringLock() {
        BookingRequest request = bookingRequest();
        FoodVariant variant = variant(1L, 50_000L, 10);
        when(foodVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        when(foodVariantRepository.findAllByIdsSorted(List.of(1L))).thenReturn(List.of(variant));
        doAnswer(call -> { variant.setStockQuantity(0); return null; }).when(entityManager).refresh(variant);
        request.setFoodItems(List.of(food(1L, 1)));

        assertInvalidBooking(request);
        assertEquals(0, variant.getStockQuantity());
        verify(foodVariantRepository, never()).save(any());
        verify(bookingFoodStockReservationRepository, never()).saveAll(any());
    }

    @Test
    void cancellationRestoresLatestStockWithLocksOrderedByVariantId() {
        Booking booking = Booking.builder().bookingId(20L).status(BookingStatus.PENDING).build();
        FoodVariant first = variant(1L, 0L, 10);
        FoodVariant second = variant(2L, 0L, 20);
        when(bookingRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(booking));
        when(bookingFoodStockReservationRepository.findByBooking_BookingId(20L)).thenReturn(List.of(
                BookingFoodStockReservation.builder().foodVariant(second).quantity(2).build(),
                BookingFoodStockReservation.builder().foodVariant(first).quantity(3).build()));
        when(foodVariantRepository.findAllByIdsSorted(List.of(1L, 2L))).thenReturn(List.of(first, second));
        doAnswer(call -> { first.setStockQuantity(7); return null; }).when(entityManager).refresh(first);

        bookingService.cancelBookingPayment(20L);

        assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        assertEquals(10, first.getStockQuantity());
        assertEquals(22, second.getStockQuantity());
        verify(entityManager).refresh(second);
        verify(foodVariantRepository, never()).findByFoodVariantId(anyLong());
    }

    private void assertInvalidBooking(BookingRequest request) {
        AppException exception = assertThrows(AppException.class, () -> bookingService.createPendingBooking(request));
        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    private BookingRequest bookingRequest() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice", "n/a", List.of()));
        User user = User.builder().userId("user-1").username("alice").build();
        Showtime showtime = Showtime.builder().showtimeId(10L)
                .movie(Movie.builder().status(MovieStatus.NOW_SHOWING).build())
                .cinemaRoom(CinemaRoom.builder().status(RoomStatus.ACTIVE).build())
                .status(ShowtimeStatus.SCHEDULED).showDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(19, 0)).build();
        ShowtimeSeat seat = ShowtimeSeat.builder().showtimeSeatId(100L).showtime(showtime)
                .seat(Seat.builder().seatRow("A").seatNumber(1).type(SeatType.NORMAL).status(SeatStatus.ACTIVE).build())
                .status(ShowtimeSeatStatus.AVAILABLE).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(showtimeRepository.findById(10L)).thenReturn(Optional.of(showtime));
        when(showtimeSeatRepository.findAllByIdForUpdate(List.of(100L))).thenReturn(List.of(seat));
        when(bookingRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(ticketPricingService.calculateConfiguredTicketPrice(showtime, SeatType.NORMAL)).thenReturn(100_000);
        return BookingRequest.builder().showtimeId(10L).showtimeSeatIds(List.of(100L)).build();
    }

    private FoodVariant variant(Long id, long price, int stock) {
        return FoodVariant.builder().foodVariantId(id).variantName("Bắp")
                .foodItem(FoodItem.builder().name("Bắp").isActive(true).build())
                .price(price).stockQuantity(stock).isActive(true).build();
    }

    private BookingFoodItemRequest food(Long id, int quantity) {
        return BookingFoodItemRequest.builder().foodVariantId(id).quantity(quantity).build();
    }
}
