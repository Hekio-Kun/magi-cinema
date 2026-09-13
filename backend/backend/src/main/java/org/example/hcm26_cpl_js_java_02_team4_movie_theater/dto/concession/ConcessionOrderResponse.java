package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrderResponse {
    Long orderId;
    String orderCode;
    String customerName;
    String customerPhone;
    Long totalAmount;
    Long costAmount;
    Long profitAmount;
    Long cashReceived;
    Long changeAmount;
    PaymentMethod paymentMethod;
    ConcessionOrderStatus status;
    String soldByUsername;
    String cancelReason;
    LocalDateTime createdAt;
    LocalDateTime cancelledAt;
    List<ConcessionOrderItemResponse> items;
}
