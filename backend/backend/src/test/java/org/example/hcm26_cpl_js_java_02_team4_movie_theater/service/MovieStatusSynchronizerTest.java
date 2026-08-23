package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MovieStatusSynchronizerTest {

    @Mock MovieRepository movieRepository;
    @InjectMocks MovieStatusSynchronizer movieStatusSynchronizer;

    @Test
    void synchronizesStatusesFromDatesAndKeepsMovieActiveThroughItsEndDate() {
        LocalDate today = LocalDate.of(2026, 8, 2);
        Movie startingToday = movie(
                1L,
                MovieStatus.COMING_SOON,
                today,
                today.plusDays(7),
                true,
                true);
        Movie staleComingSoon = movie(
                2L,
                MovieStatus.COMING_SOON,
                today.minusDays(10),
                today.minusDays(1),
                true,
                true);
        Movie expiredNowShowing = movie(
                3L,
                MovieStatus.NOW_SHOWING,
                today.minusDays(10),
                today.minusDays(1),
                true,
                true);
        Movie endingToday = movie(
                4L,
                MovieStatus.NOW_SHOWING,
                today.minusDays(10),
                today,
                true,
                true);

        when(movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.COMING_SOON))
                .thenReturn(List.of(startingToday, staleComingSoon));
        when(movieRepository.findByStatusOrderByMovieIdDesc(MovieStatus.NOW_SHOWING))
                .thenReturn(List.of(expiredNowShowing, endingToday));

        MovieStatusSynchronizer.SyncResult result = movieStatusSynchronizer.synchronize(today);

        assertEquals(1, result.activatedCount());
        assertEquals(2, result.endedCount());
        assertEquals(MovieStatus.NOW_SHOWING, startingToday.getStatus());
        assertEquals(MovieStatus.ENDED, staleComingSoon.getStatus());
        assertEquals(MovieStatus.ENDED, expiredNowShowing.getStatus());
        assertFalse(staleComingSoon.getShowOnHero());
        assertFalse(staleComingSoon.getIsHot());
        assertFalse(expiredNowShowing.getShowOnHero());
        assertFalse(expiredNowShowing.getIsHot());
        assertEquals(MovieStatus.NOW_SHOWING, endingToday.getStatus());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Movie>> changedMovies = ArgumentCaptor.forClass(List.class);
        verify(movieRepository).saveAll(changedMovies.capture());
        assertEquals(List.of(startingToday, staleComingSoon, expiredNowShowing), changedMovies.getValue());
    }

    private Movie movie(
            Long movieId,
            MovieStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            boolean showOnHero,
            boolean hot) {
        return Movie.builder()
                .movieId(movieId)
                .movieNameVn("Movie " + movieId)
                .status(status)
                .fromDate(fromDate)
                .toDate(toDate)
                .showOnHero(showOnHero)
                .isHot(hot)
                .build();
    }
}
