package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactAnalyticsResponse {
    long totalActive;
    long newCount;
    long inProgressCount;
    long waitingCustomerCount;
    long overdueCount;
    long resolvedTodayCount;
    long flaggedCount;
    double averageFirstResponseMinutes;
}
