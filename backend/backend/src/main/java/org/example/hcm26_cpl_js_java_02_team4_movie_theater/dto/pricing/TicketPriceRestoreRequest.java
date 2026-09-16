package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketPriceRestoreRequest {
    @Size(max = 300, message = "Lý do khôi phục tối đa 300 ký tự")
    String reason;
}
