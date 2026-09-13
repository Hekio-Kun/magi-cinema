package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {
    List<Booking> findByUser_UserIdOrderByCreatedAtDesc(String userId);
    boolean existsByUser_UserId(String userId);
    Optional<Booking> findByTicketQrToken(String ticketQrToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Booking> findFirstByUser_UserIdAndShowtime_ShowtimeIdAndStatusOrderByCreatedAtDesc(
            String userId,
            Long showtimeId,
            BookingStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.user.userId = :userId
              AND b.showtime.showtimeId = :showtimeId
              AND b.status = :status
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findByUserAndShowtimeAndStatusForUpdate(
            @Param("userId") String userId,
            @Param("showtimeId") Long showtimeId,
            @Param("status") BookingStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.bookingId = :bookingId")
    Optional<Booking> findByIdForUpdate(@Param("bookingId") Long bookingId);

    List<Booking> findByStatusAndCreatedAtBefore(BookingStatus status, LocalDateTime createdBefore);

    boolean existsByShowtime_ShowtimeId(Long showtimeId);

    boolean existsByShowtime_ShowtimeIdAndStatusIn(Long showtimeId, Collection<BookingStatus> statuses);

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM Booking b
            WHERE b.showtime.cinemaRoom.cinemaRoomId = :cinemaRoomId
              AND b.status IN :statuses
              AND (b.showtime.status IS NULL OR b.showtime.status IN :showtimeStatuses)
            """)
    boolean existsActiveBookingByCinemaRoomId(
            @Param("cinemaRoomId") Long cinemaRoomId,
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("showtimeStatuses") Collection<ShowtimeStatus> showtimeStatuses);

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM Booking b
            WHERE b.showtime.movie.movieId = :movieId
              AND b.status IN :statuses
            """)
    boolean existsByMovieIdAndStatusIn(
            @Param("movieId") Long movieId,
            @Param("statuses") Collection<BookingStatus> statuses);

    @Query("""
            SELECT b
            FROM Booking b
            JOIN FETCH b.showtime s
            WHERE s.movie.movieId = :movieId
              AND b.status IN :statuses
            """)
    List<Booking> findByMovieIdAndStatusInWithShowtime(
            @Param("movieId") Long movieId,
            @Param("statuses") Collection<BookingStatus> statuses);

    @Query("""
            SELECT b.showtime.movie.movieId,
                   p.presentationId,
                   b.showtime.showtimeId,
                   b.createdAt,
                   COUNT(t),
                   COALESCE(SUM(t.price), 0)
            FROM Booking b
            JOIN b.tickets t
            LEFT JOIN b.showtime.presentation p
            WHERE b.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus.SUCCESS
              AND b.createdAt >= :fromTime
              AND b.createdAt < :toTime
            GROUP BY b.showtime.movie.movieId, p.presentationId, b.showtime.showtimeId, b.createdAt
            """)
    List<Object[]> aggregateSuccessfulTicketSales(
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Booking b WHERE b.cashierShift.cashierShiftId = :shiftId AND b.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus.SUCCESS AND b.paymentMethod = :method")
    Long sumSuccessfulAmountByShiftAndPaymentMethod(@Param("shiftId") Long shiftId, @Param("method") PaymentMethod method);

    @Query("SELECT COALESCE(SUM(COALESCE(b.ticketSubtotal, b.totalAmount, 0)), 0) FROM Booking b WHERE b.cashierShift.cashierShiftId = :shiftId AND b.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus.SUCCESS")
    Long sumSuccessfulTicketRevenueByShift(@Param("shiftId") Long shiftId);

    @Query("SELECT COALESCE(SUM(COALESCE(b.concessionSubtotal, 0)), 0) FROM Booking b WHERE b.cashierShift.cashierShiftId = :shiftId AND b.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus.SUCCESS")
    Long sumSuccessfulConcessionRevenueByShift(@Param("shiftId") Long shiftId);
}
