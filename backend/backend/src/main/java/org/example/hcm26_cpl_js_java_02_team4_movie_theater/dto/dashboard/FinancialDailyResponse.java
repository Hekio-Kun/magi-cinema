package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialDailyResponse {
    private LocalDate date;
    private long bookings;
    private long tickets;
    private long grossSales;
    private long discountAmount;
    private long netSales;
    private long ticketRevenue;
    private long concessionRevenue;
}
