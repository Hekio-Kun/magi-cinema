package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {
    
    @EntityGraph(attributePaths = {"seat"})
    Page<ShowtimeSeat> findByShowtime_ShowtimeId(Long showtimeId, Pageable pageable);

    @EntityGraph(attributePaths = {"seat"})
    Page<ShowtimeSeat> findByShowtime_ShowtimeIdAndStatus(Long showtimeId, ShowtimeSeatStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"seat"})
    Page<ShowtimeSeat> findByShowtime_ShowtimeIdAndSeat_Status(Long showtimeId, SeatStatus seatStatus, Pageable pageable);

    @EntityGraph(attributePaths = {"seat"})
    Page<ShowtimeSeat> findByShowtime_ShowtimeIdAndStatusAndSeat_Status(
            Long showtimeId,
            ShowtimeSeatStatus status,
            SeatStatus seatStatus,
            Pageable pageable);

    @EntityGraph(attributePaths = {"seat"})
    Page<ShowtimeSeat> findByStatus(ShowtimeSeatStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"seat"})
    List<ShowtimeSeat> findByShowtime_ShowtimeId(Long showtimeId);

    @EntityGraph(attributePaths = {"seat", "showtime"})
    List<ShowtimeSeat> findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
            Long showtimeId,
            String selectionHeldByUserId,
            String selectionHoldToken);

    @EntityGraph(attributePaths = {"seat", "showtime"})
    List<ShowtimeSeat> findByShowtime_ShowtimeIdAndSelectionHeldByUserId(
            Long showtimeId,
            String selectionHeldByUserId);

    @Query("""
            SELECT ss
            FROM ShowtimeSeat ss
            JOIN FETCH ss.showtime st
            JOIN FETCH ss.seat seat
            WHERE ss.selectionHoldExpiresAt IS NOT NULL
              AND ss.selectionHoldExpiresAt <= :expiresBefore
            ORDER BY ss.showtimeSeatId
            """)
    List<ShowtimeSeat> findExpiredSelectionHolds(@Param("expiresBefore") java.time.LocalDateTime expiresBefore);

    @EntityGraph(attributePaths = {"seat"})
    List<ShowtimeSeat> findByShowtime_ShowtimeIdAndStatusIn(Long showtimeId, Collection<ShowtimeSeatStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT ss
            FROM ShowtimeSeat ss
            JOIN FETCH ss.showtime st
            JOIN FETCH ss.seat seat
            WHERE ss.showtimeSeatId IN :ids
            ORDER BY ss.showtimeSeatId
            """)
    List<ShowtimeSeat> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    Optional<ShowtimeSeat> findByShowtime_ShowtimeIdAndSeat_SeatId(Long showtimeId, Long seatId);

    boolean existsByShowtime_ShowtimeIdAndSeat_SeatId(Long showtimeId, Long seatId);

    boolean existsBySeat_SeatId(Long seatId);

    @Query("""
            SELECT CASE WHEN COUNT(ss) > 0 THEN true ELSE false END
            FROM ShowtimeSeat ss
            WHERE ss.seat.cinemaRoom.cinemaRoomId = :cinemaRoomId
            """)
    boolean existsBySeat_CinemaRoom_CinemaRoomId(@Param("cinemaRoomId") Long cinemaRoomId);

    boolean existsByShowtime_ShowtimeIdAndSeat_SeatIdAndShowtimeSeatIdNot(
            Long showtimeId,
            Long seatId,
            Long showtimeSeatId);

    void deleteByShowtime_ShowtimeId(Long showtimeId);

    @Query("""
            SELECT st.movie.movieId,
                   p.presentationId,
                   COUNT(ss),
                   SUM(CASE WHEN ss.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus.BOOKED THEN 1 ELSE 0 END)
            FROM ShowtimeSeat ss
            JOIN ss.showtime st
            LEFT JOIN st.presentation p
            WHERE st.showDate BETWEEN :fromDate AND :toDate
              AND st.status <> org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus.CANCELLED
            GROUP BY st.movie.movieId, p.presentationId
            """)
    List<Object[]> aggregateDemand(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT st.movie.movieId,
                   p.presentationId,
                   st.showtimeId,
                   COUNT(ss),
                   SUM(CASE WHEN ss.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus.BOOKED THEN 1 ELSE 0 END)
            FROM ShowtimeSeat ss
            JOIN ss.showtime st
            LEFT JOIN st.presentation p
            WHERE st.showDate BETWEEN :fromDate AND :toDate
              AND st.status <> org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus.CANCELLED
            GROUP BY st.movie.movieId, p.presentationId, st.showtimeId
            """)
    List<Object[]> aggregateDemandByShowtime(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);
}
