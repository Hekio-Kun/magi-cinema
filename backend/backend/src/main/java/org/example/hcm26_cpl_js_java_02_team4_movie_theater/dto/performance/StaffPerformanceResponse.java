package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.performance;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffPerformanceResponse {
    String staffUserId;
    String username;
    String fullName;
    Long shiftCount;
    Long approvedShiftCount;
    Long ticketSales;
    Long concessionSales;
    Long totalSales;
    Long cashSales;
    Long transferSales;
    Long varianceTotal;
    Long workedMinutes;
    Long lateCount;
    Long absentCount;
}
