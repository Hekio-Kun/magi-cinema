package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentTransactionStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentTransactionResponse {
    Long paymentTransactionId;
    Long bookingId;
    String movieTitle;
    PaymentMethod paymentMethod;
    String providerReference;
    String providerTransactionId;
    Long expectedAmount;
    Long receivedAmount;
    PaymentTransactionStatus status;
    String lastCallbackMessage;
    LocalDateTime createdAt;
    LocalDateTime callbackReceivedAt;
}
