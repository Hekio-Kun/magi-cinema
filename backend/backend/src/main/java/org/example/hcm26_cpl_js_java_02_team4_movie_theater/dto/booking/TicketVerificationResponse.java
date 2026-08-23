package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVerificationResponse {
    Long bookingId;
    String movieTitle;
    String cinemaRoomName;
    String presentationName;
    MovieFormat presentationFormat;
    MovieProjectionType projectionType;
    MovieLanguageType languageType;
    String showDate;
    String startTime;
    List<String> seatCodes;
    Integer ticketCount;
    Integer totalAmount;
    BookingStatus status;
    LocalDateTime bookedAt;
    boolean validTicket;
    boolean isScanned;
    String verificationMessage;
}
