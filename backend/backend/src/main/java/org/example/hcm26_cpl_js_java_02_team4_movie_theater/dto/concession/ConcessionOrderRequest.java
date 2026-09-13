package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrderRequest {
    String customerName;
    String customerPhone;

    @NotNull
    PaymentMethod paymentMethod;

    /** Số tiền khách đưa, bắt buộc khi thanh toán tiền mặt. */
    Long cashReceived;

    @NotEmpty
    @Valid
    List<ConcessionOrderItemRequest> items;
}
