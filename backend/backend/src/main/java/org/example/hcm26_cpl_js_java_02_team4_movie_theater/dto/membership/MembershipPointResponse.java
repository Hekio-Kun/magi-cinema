package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

@Value @Builder
public class MembershipPointResponse {
    Long transactionId;
    Long bookingId;
    String type;
    Integer points;
    Integer balanceAfter;
    String description;
    LocalDateTime createdAt;
}
