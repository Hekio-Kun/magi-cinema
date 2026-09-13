package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialMovieResponse {
    private Long movieId;
    private String movieName;
    private long bookings;
    private long tickets;
    private long netSales;
}
