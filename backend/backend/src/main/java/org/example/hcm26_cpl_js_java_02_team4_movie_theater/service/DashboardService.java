package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.DashboardShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.DashboardResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.MovieMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final ShowtimeRepository showtimeRepository;

    private final MovieMapper movieMapper;
    private final ShowtimeMapper showtimeMapper;

    public DashboardResponse getDashboardStats() {
        long totalMovies = movieRepository.count();
        long totalUsers = userRepository.count();
        long totalCinemaRooms = cinemaRoomRepository.count();
        long totalShowtimes = showtimeRepository.count();

        // Get top 5 newest movies
        Page<Movie> recentMoviesPage = movieRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "movieId")));
        List<MovieResponse> topMovies = recentMoviesPage.getContent().stream()
                .map(movieMapper::toMovieResponse)
                .collect(Collectors.toList());

        // Get top 5 newest showtimes
        Page<Showtime> recentShowtimesPage = showtimeRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "showtimeId")));
        List<DashboardShowtimeResponse> recentShowtimes = recentShowtimesPage.getContent().stream()
                .map(this::toDashboardShowtimeResponse)
                .collect(Collectors.toList());

        return DashboardResponse.builder()
                .totalMovies(totalMovies)
                .totalUsers(totalUsers)
                .totalCinemaRooms(totalCinemaRooms)
                .totalShowtimes(totalShowtimes)
                .topMovies(topMovies)
                .recentShowtimes(recentShowtimes)
                .build();
    }

    private DashboardShowtimeResponse toDashboardShowtimeResponse(Showtime showtime) {
        MoviePresentation presentation = showtimeMapper.resolveDisplayPresentation(showtime);
        return DashboardShowtimeResponse.builder()
                .showtimeId(showtime.getShowtimeId())
                .movieName(showtime.getMovie() != null ? showtime.getMovie().getMovieNameVn() : "")
                .cinemaRoomName(showtime.getCinemaRoom() != null ? showtime.getCinemaRoom().getCinemaRoomName() : "")
                .cinemaRoomType(showtime.getCinemaRoom() != null && showtime.getCinemaRoom().getType() != null ? showtime.getCinemaRoom().getType().name() : "")
                .seatQuantity(showtime.getCinemaRoom() != null && showtime.getCinemaRoom().getSeatQuantity() != null ? showtime.getCinemaRoom().getSeatQuantity() : 100)
                .presentationId(presentation == null ? null : presentation.getPresentationId())
                .presentationName(presentation == null ? null : presentation.getDisplayName())
                .presentationFormat(presentation == null ? null : presentation.getFormat())
                .projectionType(presentation == null ? null : presentation.getProjectionType())
                .languageType(presentation == null ? null : presentation.getLanguageType())
                .showDate(showtime.getShowDate())
                .startTime(showtime.getStartTime())
                .build();
    }
}
