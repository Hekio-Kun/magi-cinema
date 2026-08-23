package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingResponse {
    Long bookingId;
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
    Integer loyaltyPointsEarned;
    String membershipPlanCode;
    String membershipPlanName;
    Integer ticketSubtotal;
    Integer concessionSubtotal;
    Integer membershipTicketDiscount;
    Integer membershipConcessionDiscount;
    Integer membershipFreeTicketsUsed;
    Integer voucherDiscount;
    BigDecimal pointMultiplierApplied;
    BigDecimal membershipTicketEarnPercent;
    BigDecimal membershipConcessionEarnPercent;
    Integer loyaltyPointsRedeemed;
    Integer membershipEligibleSpend;
    BookingStatus status;
    LocalDateTime createdAt;
    LocalDateTime holdExpiresAt;
    List<Long> showtimeSeatIds;
    List<String> seatCodes;
    List<String> combos;
    List<String> foodItems;
    List<BookingTicketDetailResponse> ticketDetails;
    List<BookingProductDetailResponse> productDetails;
    String ticketQrToken;
    String payUrl;
}
