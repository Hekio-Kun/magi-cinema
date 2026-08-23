package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketVerificationServiceTest {

    static final String TOKEN = "0123456789abcdef0123456789abcdef";

    @Mock BookingRepository bookingRepository;
    @Mock TicketRepository ticketRepository;
    @Mock ShowtimeMapper showtimeMapper;

    TicketVerificationService service;

    @BeforeEach
    void setUp() {
        service = new TicketVerificationService(bookingRepository, ticketRepository, showtimeMapper);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://cinema.example/");
    }

    @Test
    void verifiesPaidTicketWithoutExposingCustomerInformation() {
        Booking booking = paidBooking();
        Seat seat = Seat.builder().seatCode("H6").build();
        ShowtimeSeat showtimeSeat = ShowtimeSeat.builder().seat(seat).build();
        Ticket ticket = Ticket.builder().booking(booking).showtimeSeat(showtimeSeat).build();
        when(bookingRepository.findByTicketQrToken(TOKEN)).thenReturn(Optional.of(booking));
        when(ticketRepository.findByBooking_BookingId(85L)).thenReturn(List.of(ticket));

        var response = service.verify(TOKEN);

        assertTrue(response.isValidTicket());
        assertEquals("Người Nhện: Khởi Đầu Mới", response.getMovieTitle());
        assertEquals("Room 6", response.getCinemaRoomName());
        assertEquals(List.of("H6"), response.getSeatCodes());
        assertEquals(320_000, response.getTotalAmount());
    }

    @Test
    void generatedQrOpensPublicTicketVerificationPage() throws Exception {
        when(bookingRepository.findByTicketQrToken(TOKEN)).thenReturn(Optional.of(paidBooking()));

        byte[] png = service.generateQrPng(TOKEN);
        var image = ImageIO.read(new ByteArrayInputStream(png));
        var bitmap = new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)));
        String payload = new MultiFormatReader().decode(bitmap).getText();

        assertEquals("https://cinema.example/tickets/" + TOKEN, payload);
    }

    @Test
    void rejectsMalformedQrTokenBeforeRepositoryLookup() {
        AppException exception = assertThrows(AppException.class, () -> service.verify("85"));

        assertEquals(ErrorCode.TICKET_QR_INVALID, exception.getErrorCode());
    }

    @Test
    void bookingGeneratesOpaqueUniqueTokens() {
        Booking first = new Booking();
        Booking second = new Booking();

        assertTrue(first.ensureTicketQrToken());
        assertTrue(second.ensureTicketQrToken());
        assertEquals(32, first.getTicketQrToken().length());
        assertNotEquals(first.getTicketQrToken(), second.getTicketQrToken());
    }

    private Booking paidBooking() {
        Movie movie = Movie.builder().movieNameVn("Người Nhện: Khởi Đầu Mới").build();
        CinemaRoom room = CinemaRoom.builder().cinemaRoomName("Room 6").build();
        Showtime showtime = Showtime.builder()
                .movie(movie)
                .cinemaRoom(room)
                .showDate(LocalDate.of(2026, 8, 6))
                .startTime(LocalTime.of(15, 0))
                .build();
        return Booking.builder()
                .bookingId(85L)
                .showtime(showtime)
                .status(BookingStatus.SUCCESS)
                .ticketQrToken(TOKEN)
                .totalAmount(320_000)
                .createdAt(LocalDateTime.of(2026, 8, 6, 14, 57))
                .build();
    }
}
