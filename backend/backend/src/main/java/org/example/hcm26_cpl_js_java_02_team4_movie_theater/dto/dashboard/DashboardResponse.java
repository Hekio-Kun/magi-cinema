package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalMovies;
    private long totalUsers;
    private long totalCinemaRooms;
    private long totalShowtimes;

    private List<MovieResponse> topMovies;
    private List<DashboardShowtimeResponse> recentShowtimes;
}
