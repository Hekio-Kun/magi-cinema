package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MovieStatusSynchronizer {

    MovieRepository movieRepository;

    @Scheduled(
            initialDelayString = "${movie.status-sync-initial-delay-ms:60000}",
            fixedDelayString = "${movie.status-sync-delay-ms:300000}")
    @Transactional
    public void scheduledSynchronize() {
        synchronize(LocalDate.now());
    }

    @Transactional
    public SyncResult synchronizeNow() {
        return synchronize(LocalDate.now());
    }

    SyncResult synchronize(LocalDate today) {
        List<Movie> changedMovies = new ArrayList<>();
        int activatedCount = 0;
        int endedCount = 0;

        List<Movie> comingSoonMovies =
                movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.COMING_SOON);
        for (Movie movie : comingSoonMovies) {
            if (hasEnded(movie, today)) {
                markEnded(movie);
                changedMovies.add(movie);
                endedCount++;
            } else if (movie.getFromDate() != null && !movie.getFromDate().isAfter(today)) {
                movie.setStatus(MovieStatus.NOW_SHOWING);
                changedMovies.add(movie);
                activatedCount++;
            }
        }

        List<Movie> nowShowingMovies =
                movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.NOW_SHOWING);
        for (Movie movie : nowShowingMovies) {
            if (hasEnded(movie, today)) {
                markEnded(movie);
                changedMovies.add(movie);
                endedCount++;
            }
        }

        if (!changedMovies.isEmpty()) {
            movieRepository.saveAll(changedMovies);
            log.info(
                    "Synchronized movie statuses for {}: activated={}, ended={}",
                    today,
                    activatedCount,
                    endedCount);
        }

        return new SyncResult(activatedCount, endedCount);
    }

    private boolean hasEnded(Movie movie, LocalDate today) {
        return movie.getToDate() != null && movie.getToDate().isBefore(today);
    }

    private void markEnded(Movie movie) {
        movie.setStatus(MovieStatus.ENDED);
        movie.setShowOnHero(false);
        movie.setIsHot(false);
    }

    public record SyncResult(int activatedCount, int endedCount) {
    }
}
