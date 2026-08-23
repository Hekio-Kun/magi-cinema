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
public class ZaloPayPaymentResponse {
    Long bookingId;
    String appTransId;
    Long amount;
    String orderUrl;
    String qrCode;
    String orderToken;
    String zpTransToken;
    Integer returnCode;
    String returnMessage;
    Integer subReturnCode;
    String subReturnMessage;
}
