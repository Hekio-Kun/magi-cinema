package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MomoPaymentResponse {
    Long bookingId;
    String requestId;
    String orderId;
    Long amount;
    String payUrl;
    String shortLink;
    String deeplink;
    String qrCodeUrl;
    Integer resultCode;
    String message;
}
