package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CounterCustomerType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingAdminResponse {
    Long bookingId;
    String username;
    String email;
    Long showtimeId;
    String movieTitle;
    String cinemaRoomName;
    Long presentationId;
    String presentationName;
    MovieFormat presentationFormat;
    MovieProjectionType projectionType;
    MovieLanguageType languageType;
    String showDate;
    String startTime;
    Integer totalAmount;
    Integer originalAmount;
    Integer discountAmount;
    String promotionCode;
    PaymentMethod paymentMethod;
    BookingStatus status;
    BookingChannel bookingChannel;
    String staffUsername;
    String staffEmail;
    CounterCustomerType counterCustomerType;
    LocalDateTime createdAt;
    List<String> seatCodes;
    List<String> combos;
    List<String> foodItems;
}
