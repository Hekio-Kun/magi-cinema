package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.TicketVerificationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketVerificationService {

    static final Pattern TOKEN_PATTERN = Pattern.compile("^[a-f0-9]{32}$");
    static final int QR_SIZE = 420;

    BookingRepository bookingRepository;
    TicketRepository ticketRepository;
    ShowtimeMapper showtimeMapper;

    @NonFinal
    @Value("${app.frontend-url:http://localhost:3000}")
    String frontendUrl;

    @Transactional(readOnly = true)
    public TicketVerificationResponse verify(String rawToken) {
        Booking booking = requireBooking(rawToken);
        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(booking.getBookingId());
        MoviePresentation presentation = showtimeMapper.resolveDisplayPresentation(booking.getShowtime());
        
        boolean isSuccess = BookingStatus.SUCCESS.equals(booking.getStatus());
        boolean scanned = booking.getIsScanned() != null && booking.getIsScanned();
        boolean valid = isSuccess && !scanned;

        String msg = "Vé hợp lệ và đã thanh toán.";
        if (!isSuccess) {
            msg = "Vé chưa thanh toán hoặc đã bị hủy.";
        } else if (scanned) {
            msg = "Vé đã được sử dụng (quét mã) trước đó.";
        }

        return TicketVerificationResponse.builder()
                .bookingId(booking.getBookingId())
                .movieTitle(booking.getShowtime().getMovie().getMovieNameVn())
                .cinemaRoomName(booking.getShowtime().getCinemaRoom().getCinemaRoomName())
                .presentationName(presentation == null ? null : presentation.getDisplayName())
                .presentationFormat(presentation == null ? null : presentation.getFormat())
                .projectionType(presentation == null ? null : presentation.getProjectionType())
                .languageType(presentation == null ? null : presentation.getLanguageType())
                .showDate(booking.getShowtime().getShowDate().toString())
                .startTime(booking.getShowtime().getStartTime().toString())
                .seatCodes(tickets.stream()
                        .map(Ticket::getShowtimeSeat)
                        .map(showtimeSeat -> showtimeSeat.getSeat().getSeatCode())
                        .toList())
                .ticketCount(tickets.size())
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus())
                .bookedAt(booking.getCreatedAt())
                .validTicket(valid)
                .isScanned(scanned)
                .verificationMessage(msg)
                .build();
    }

    @Transactional
    public void markAsScanned(String rawToken) {
        Booking booking = requireBooking(rawToken);
        if (!BookingStatus.SUCCESS.equals(booking.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vé không hợp lệ để sử dụng.");
        }
        if (booking.getIsScanned() != null && booking.getIsScanned()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vé đã được sử dụng trước đó.");
        }
        booking.setIsScanned(true);
        bookingRepository.save(booking);
    }

    @Transactional(readOnly = true)
    public byte[] generateQrPng(String rawToken) {
        String token = normalizeToken(rawToken);
        requireBooking(token);
        String verificationUrl = normalizedFrontendUrl() + "/tickets/" + token;
        try {
            var matrix = new QRCodeWriter().encode(
                    verificationUrl,
                    BarcodeFormat.QR_CODE,
                    QR_SIZE,
                    QR_SIZE,
                    Map.of(
                            EncodeHintType.CHARACTER_SET, "UTF-8",
                            EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                            EncodeHintType.MARGIN, 2));
            try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                MatrixToImageWriter.writeToStream(matrix, "PNG", output);
                return output.toByteArray();
            }
        } catch (WriterException | IOException exception) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể tạo mã QR cho vé.");
        }
    }

    String verificationUrl(String token) {
        return normalizedFrontendUrl() + "/tickets/" + normalizeToken(token);
    }

    private Booking requireBooking(String rawToken) {
        String token = normalizeToken(rawToken);
        return bookingRepository.findByTicketQrToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.TICKET_QR_INVALID));
    }

    private String normalizeToken(String rawToken) {
        String token = rawToken == null ? "" : rawToken.trim().toLowerCase();
        if (!TOKEN_PATTERN.matcher(token).matches()) {
            throw new AppException(ErrorCode.TICKET_QR_INVALID);
        }
        return token;
    }

    private String normalizedFrontendUrl() {
        String value = frontendUrl == null ? "" : frontendUrl.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value.isBlank() ? "http://localhost:3000" : value;
    }
}
