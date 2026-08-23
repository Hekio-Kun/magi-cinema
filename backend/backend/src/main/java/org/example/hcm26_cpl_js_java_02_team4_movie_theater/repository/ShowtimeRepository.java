package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {
    @Query("""
            SELECT DISTINCT s.showDate
            FROM Showtime s
            JOIN s.movie m
            JOIN s.cinemaRoom cr
            WHERE (s.status IS NULL OR s.status NOT IN :excludedShowtimeStatuses)
              AND s.showDate >= :fromDate
              AND m.status <> :excludedMovieStatus
            ORDER BY s.showDate
            """)
    List<LocalDate> findPublicScreeningDates(
            @Param("excludedShowtimeStatuses") List<ShowtimeStatus> excludedShowtimeStatuses,
            @Param("fromDate") LocalDate fromDate,
            @Param("excludedMovieStatus") MovieStatus excludedMovieStatus);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.cinemaRoom cr
            LEFT JOIN FETCH s.presentation p
            WHERE s.showDate = :showDate
              AND (s.status IS NULL OR s.status NOT IN :excludedShowtimeStatuses)
              AND m.status <> :excludedMovieStatus
            ORDER BY m.movieNameVn, s.startTime
            """)
    List<Showtime> findPublicShowtimesByDate(
            @Param("showDate") LocalDate showDate,
            @Param("excludedShowtimeStatuses") List<ShowtimeStatus> excludedShowtimeStatuses,
            @Param("excludedMovieStatus") MovieStatus excludedMovieStatus);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.cinemaRoom cr
            LEFT JOIN FETCH s.presentation p
            WHERE m.movieId = :movieId
              AND (s.status IS NULL OR s.status NOT IN :excludedShowtimeStatuses)
            ORDER BY s.showDate, s.startTime, s.showtimeId
            """)
    List<Showtime> findPublicShowtimesByMovieId(
            @Param("movieId") Long movieId,
            @Param("excludedShowtimeStatuses") List<ShowtimeStatus> excludedShowtimeStatuses);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.cinemaRoom cr
            LEFT JOIN FETCH s.presentation p
            WHERE (cast(:movieId as long) IS NULL OR m.movieId = :movieId)
              AND (cast(:cinemaRoomId as long) IS NULL OR cr.cinemaRoomId = :cinemaRoomId)
              AND (cast(:showDate as date) IS NULL OR s.showDate = :showDate)
              AND (cast(:status as string) IS NULL OR s.status = :status)
            ORDER BY s.showDate DESC, m.movieNameVn, s.startTime
            """)
    List<Showtime> findAdminShowtimes(
            @Param("movieId") Long movieId,
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("showDate") LocalDate showDate,
            @Param("status") ShowtimeStatus status);

    @Query("""
            SELECT s
            FROM Showtime s
            WHERE s.showDate <= :toDate
              AND (s.status IS NULL OR s.status NOT IN :excludedStatuses)
            """)
    List<Showtime> findStatusSyncCandidates(
            @Param("toDate") LocalDate toDate,
            @Param("excludedStatuses") List<ShowtimeStatus> excludedStatuses);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM Showtime s
            WHERE s.cinemaRoom.cinemaRoomId = :cinemaRoomId
              AND (s.status IS NULL OR s.status IN :statuses)
            """)
    boolean existsLockingShowtimeByCinemaRoomId(
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("statuses") Collection<ShowtimeStatus> statuses);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.cinemaRoom cr
            WHERE cr.cinemaRoomId = :cinemaRoomId
              AND s.showDate BETWEEN :fromDate AND :toDate
              AND (s.status IS NULL OR s.status <> :cancelledStatus)
            """)
    List<Showtime> findRoomShowtimesForOverlapCheck(
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("cancelledStatus") ShowtimeStatus cancelledStatus);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.cinemaRoom cr
            WHERE s.showDate BETWEEN :fromDate AND :toDate
              AND (s.status IS NULL OR s.status <> :cancelledStatus)
            ORDER BY s.showDate, cr.cinemaRoomName, s.startTime
            """)
    List<Showtime> findActiveShowtimesBetweenDates(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("cancelledStatus") ShowtimeStatus cancelledStatus);

    @Query("""
            SELECT s
            FROM Showtime s
            JOIN FETCH s.cinemaRoom cr
            WHERE cr.cinemaRoomId IN :cinemaRoomIds
              AND s.showDate BETWEEN :fromDate AND :toDate
              AND (s.status IS NULL OR s.status <> :cancelledStatus)
            ORDER BY s.showDate, cr.cinemaRoomName, s.startTime
            """)
    List<Showtime> findActiveShowtimesBetweenDatesAndRooms(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("cancelledStatus") ShowtimeStatus cancelledStatus,
            @Param("cinemaRoomIds") List<Long> cinemaRoomIds);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM Showtime s
            WHERE s.cinemaRoom.cinemaRoomId = :cinemaRoomId
              AND s.showDate = :showDate
              AND s.startTime < :endTime
              AND s.endTime > :startTime
              AND (cast(:excludedShowtimeId as long) IS NULL OR s.showtimeId <> :excludedShowtimeId)
              AND (s.status IS NULL OR s.status <> :cancelledStatus)
            """)
    boolean existsOverlappingShowtime(
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("showDate") LocalDate showDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludedShowtimeId") Long excludedShowtimeId,
            @Param("cancelledStatus") ShowtimeStatus cancelledStatus);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM Showtime s
            WHERE s.cinemaRoom.cinemaRoomId = :cinemaRoomId
              AND s.showDate = :showDate
              AND s.startTime < :endTime
              AND s.endTime > :startTime
              AND (cast(:movieId as long) IS NULL OR s.movie.movieId <> :movieId)
              AND (s.status IS NULL OR s.status <> :cancelledStatus)
            """)
    boolean existsOverlappingShowtimeForOtherMovie(
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("showDate") LocalDate showDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("movieId") Long movieId,
            @Param("cancelledStatus") ShowtimeStatus cancelledStatus);

    List<Showtime> findByMovie_MovieId(Long movieId);

    boolean existsByMovie_MovieId(Long movieId);

    boolean existsByMovie_MovieIdAndStatusNot(Long movieId, ShowtimeStatus status);
}
