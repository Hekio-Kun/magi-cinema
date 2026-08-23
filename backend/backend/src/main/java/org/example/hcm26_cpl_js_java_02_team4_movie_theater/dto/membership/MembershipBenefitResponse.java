package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import lombok.Builder;
import lombok.Value;
import java.time.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;

@Value @Builder
public class MembershipBenefitResponse {
    Long benefitId;
    String type;
    String status;
    Integer benefitYear;
    MembershipFreeTicketType freeTicketType;
    LocalDate expiresAt;
    LocalDateTime usedAt;
    Long bookingId;
    LocalDateTime createdAt;
}
