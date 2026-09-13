package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.DashboardShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.DashboardResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.FinancialDailyResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.FinancialMovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.FinancialPaymentMethodResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.FinancialRoomResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.FinancialSummaryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie.MovieResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.MovieMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final ShowtimeRepository showtimeRepository;
    private final JdbcTemplate jdbcTemplate;

    private final MovieMapper movieMapper;
    private final ShowtimeMapper showtimeMapper;

    public DashboardResponse getDashboardStats() {
        return getDashboardStats(null, null);
    }

    public DashboardResponse getDashboardStats(LocalDate fromDate, LocalDate toDate) {
        DateRange range = resolveDateRange(fromDate, toDate);
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
                .financialSummary(getFinancialSummary(range))
                .build();
    }

    private FinancialSummaryResponse getFinancialSummary(DateRange range) {
        LocalDateTime fromTime = range.fromDate().atStartOfDay();
        LocalDateTime toTime = range.toDate().plusDays(1).atStartOfDay();

        Map<String, Object> totals = jdbcTemplate.queryForMap("""
                SELECT COUNT(*) AS total_bookings,
                       COUNT(*) FILTER (WHERE status = 'SUCCESS') AS successful_bookings,
                       COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_bookings,
                       COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_bookings,
                       COALESCE(SUM(CASE WHEN status = 'SUCCESS'
                           THEN COALESCE(original_amount, total_amount, 0) ELSE 0 END), 0) AS gross_sales,
                       COALESCE(SUM(CASE WHEN status = 'SUCCESS'
                           THEN COALESCE(discount_amount,
                               GREATEST(COALESCE(original_amount, total_amount, 0) - COALESCE(total_amount, 0), 0), 0)
                           ELSE 0 END), 0) AS discount_amount,
                       COALESCE(SUM(CASE WHEN status = 'SUCCESS'
                           THEN COALESCE(total_amount, 0) ELSE 0 END), 0) AS net_sales,
                       COALESCE(SUM(CASE WHEN status = 'SUCCESS'
                           THEN COALESCE(ticket_subtotal,
                               (SELECT COALESCE(SUM(t.price), 0) FROM ticket t WHERE t.booking_id = booking.booking_id), 0)
                           ELSE 0 END), 0) AS ticket_revenue,
                       COALESCE(SUM(CASE WHEN status = 'SUCCESS'
                           THEN COALESCE(concession_subtotal,
                               (SELECT COALESCE(SUM(bc.price), 0) FROM booking_combo bc WHERE bc.booking_id = booking.booking_id)
                               + (SELECT COALESCE(SUM(bfi.price), 0) FROM booking_food_item bfi WHERE bfi.booking_id = booking.booking_id), 0)
                           ELSE 0 END), 0) AS concession_revenue,
                       COALESCE(SUM(CASE WHEN status = 'CANCELLED'
                           THEN COALESCE(total_amount, 0) ELSE 0 END), 0) AS cancelled_amount,
                       COALESCE(SUM(CASE WHEN status = 'PENDING'
                           THEN COALESCE(total_amount, 0) ELSE 0 END), 0) AS pending_amount
                FROM booking
                WHERE created_at >= ? AND created_at < ?
                """, fromTime, toTime);

        Map<String, Object> seatTotals = jdbcTemplate.queryForMap("""
                SELECT COUNT(ss.showtime_seat_id) AS seat_capacity,
                       COUNT(*) FILTER (WHERE ss.status = 'BOOKED') AS booked_seats
                FROM showtime st
                JOIN showtime_seat ss ON ss.showtime_id = st.showtime_id
                WHERE st.show_date >= ? AND st.show_date <= ?
                  AND (st.status IS NULL OR st.status <> 'CANCELLED')
                """, range.fromDate(), range.toDate());

        List<FinancialDailyResponse> daily = jdbcTemplate.query("""
                WITH days AS (
                    SELECT generate_series(?::date, ?::date, interval '1 day')::date AS report_date
                )
                SELECT d.report_date,
                       COUNT(b.booking_id) FILTER (WHERE b.status = 'SUCCESS') AS bookings,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN (SELECT COUNT(*) FROM ticket t WHERE t.booking_id = b.booking_id) ELSE 0 END), 0) AS tickets,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN COALESCE(b.original_amount, b.total_amount, 0) ELSE 0 END), 0) AS gross_sales,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN COALESCE(b.discount_amount,
                               GREATEST(COALESCE(b.original_amount, b.total_amount, 0) - COALESCE(b.total_amount, 0), 0), 0)
                           ELSE 0 END), 0) AS discount_amount,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN COALESCE(b.total_amount, 0) ELSE 0 END), 0) AS net_sales,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN COALESCE(b.ticket_subtotal,
                               (SELECT COALESCE(SUM(t.price), 0) FROM ticket t WHERE t.booking_id = b.booking_id), 0)
                           ELSE 0 END), 0) AS ticket_revenue,
                       COALESCE(SUM(CASE WHEN b.status = 'SUCCESS'
                           THEN COALESCE(b.concession_subtotal,
                               (SELECT COALESCE(SUM(bc.price), 0) FROM booking_combo bc WHERE bc.booking_id = b.booking_id)
                               + (SELECT COALESCE(SUM(bfi.price), 0) FROM booking_food_item bfi WHERE bfi.booking_id = b.booking_id), 0)
                           ELSE 0 END), 0) AS concession_revenue
                FROM days d
                LEFT JOIN booking b ON b.created_at >= d.report_date::timestamp
                    AND b.created_at < (d.report_date + interval '1 day')::timestamp
                GROUP BY d.report_date
                ORDER BY d.report_date
                """, (rs, rowNum) -> FinancialDailyResponse.builder()
                .date(rs.getObject("report_date", LocalDate.class))
                .bookings(rs.getLong("bookings"))
                .tickets(rs.getLong("tickets"))
                .grossSales(rs.getLong("gross_sales"))
                .discountAmount(rs.getLong("discount_amount"))
                .netSales(rs.getLong("net_sales"))
                .ticketRevenue(rs.getLong("ticket_revenue"))
                .concessionRevenue(rs.getLong("concession_revenue"))
                .build(), range.fromDate(), range.toDate());

        List<FinancialPaymentMethodResponse> paymentMethods = jdbcTemplate.query("""
                SELECT COALESCE(payment_method, 'UNKNOWN') AS payment_method,
                       COUNT(*) AS bookings,
                       COALESCE(SUM(total_amount), 0) AS amount
                FROM booking
                WHERE status = 'SUCCESS' AND created_at >= ? AND created_at < ?
                GROUP BY COALESCE(payment_method, 'UNKNOWN')
                ORDER BY amount DESC
                """, (rs, rowNum) -> FinancialPaymentMethodResponse.builder()
                .paymentMethod(rs.getString("payment_method"))
                .bookings(rs.getLong("bookings"))
                .amount(rs.getLong("amount"))
                .build(), fromTime, toTime);

        List<FinancialMovieResponse> topMovies = jdbcTemplate.query("""
                SELECT movie_id, movie_name, COUNT(*) AS bookings,
                       COALESCE(SUM(tickets), 0) AS tickets,
                       COALESCE(SUM(net_sales), 0) AS net_sales
                FROM (
                    SELECT b.booking_id, m.movie_id, m.movie_name_vn AS movie_name,
                           COALESCE(b.total_amount, 0) AS net_sales,
                           COUNT(t.ticket_id) AS tickets
                    FROM booking b
                    JOIN showtime st ON st.showtime_id = b.showtime_id
                    JOIN movie m ON m.movie_id = st.movie_id
                    LEFT JOIN ticket t ON t.booking_id = b.booking_id
                    WHERE b.status = 'SUCCESS' AND b.created_at >= ? AND b.created_at < ?
                    GROUP BY b.booking_id, m.movie_id, m.movie_name_vn, b.total_amount
                ) sales
                GROUP BY movie_id, movie_name
                ORDER BY net_sales DESC, tickets DESC
                LIMIT 10
                """, (rs, rowNum) -> FinancialMovieResponse.builder()
                .movieId(rs.getLong("movie_id"))
                .movieName(rs.getString("movie_name"))
                .bookings(rs.getLong("bookings"))
                .tickets(rs.getLong("tickets"))
                .netSales(rs.getLong("net_sales"))
                .build(), fromTime, toTime);

        List<FinancialRoomResponse> roomOccupancy = jdbcTemplate.query("""
                SELECT cr.cinema_room_id, cr.cinema_room_name,
                       COUNT(ss.showtime_seat_id) AS seat_capacity,
                       COUNT(*) FILTER (WHERE ss.status = 'BOOKED') AS booked_seats
                FROM showtime st
                JOIN cinema_room cr ON cr.cinema_room_id = st.cinema_room_id
                JOIN showtime_seat ss ON ss.showtime_id = st.showtime_id
                WHERE st.show_date >= ? AND st.show_date <= ?
                  AND (st.status IS NULL OR st.status <> 'CANCELLED')
                GROUP BY cr.cinema_room_id, cr.cinema_room_name
                ORDER BY booked_seats DESC, cr.cinema_room_name
                """, (rs, rowNum) -> {
                    long capacity = rs.getLong("seat_capacity");
                    long booked = rs.getLong("booked_seats");
                    return FinancialRoomResponse.builder()
                            .roomId(rs.getLong("cinema_room_id"))
                            .roomName(rs.getString("cinema_room_name"))
                            .seatCapacity(capacity)
                            .bookedSeats(booked)
                            .occupancyRate(capacity == 0 ? 0d : (booked * 100d) / capacity)
                            .build();
                }, range.fromDate(), range.toDate());

        long netSales = number(totals, "net_sales");
        long successfulBookings = number(totals, "successful_bookings");
        long bookedSeats = number(seatTotals, "booked_seats");
        long seatCapacity = number(seatTotals, "seat_capacity");

        long cashCollected = amountFor(paymentMethods, "CASH");
        long bankTransferCollected = amountFor(paymentMethods, "BANK_TRANSFER");
        long momoCollected = amountFor(paymentMethods, "MOMO");
        long zaloPayCollected = amountFor(paymentMethods, "ZALOPAY");
        long otherCollected = paymentMethods.stream()
                .filter(item -> !List.of("CASH", "BANK_TRANSFER", "MOMO", "ZALOPAY").contains(item.getPaymentMethod()))
                .mapToLong(FinancialPaymentMethodResponse::getAmount)
                .sum();

        return FinancialSummaryResponse.builder()
                .fromDate(range.fromDate())
                .toDate(range.toDate())
                .totalBookings(number(totals, "total_bookings"))
                .successfulBookings(successfulBookings)
                .cancelledBookings(number(totals, "cancelled_bookings"))
                .pendingBookings(number(totals, "pending_bookings"))
                .ticketsSold(daily.stream().mapToLong(FinancialDailyResponse::getTickets).sum())
                .seatCapacity(seatCapacity)
                .bookedSeats(bookedSeats)
                .occupancyRate(seatCapacity == 0 ? 0d : (bookedSeats * 100d) / seatCapacity)
                .grossSales(number(totals, "gross_sales"))
                .discountAmount(number(totals, "discount_amount"))
                .netSales(netSales)
                .ticketRevenue(number(totals, "ticket_revenue"))
                .concessionRevenue(number(totals, "concession_revenue"))
                .cancelledAmount(number(totals, "cancelled_amount"))
                .pendingAmount(number(totals, "pending_amount"))
                .averageOrderValue(successfulBookings == 0 ? 0 : netSales / successfulBookings)
                .cashCollected(cashCollected)
                .bankTransferCollected(bankTransferCollected)
                .momoCollected(momoCollected)
                .zaloPayCollected(zaloPayCollected)
                .otherCollected(otherCollected)
                .daily(daily)
                .paymentMethods(paymentMethods)
                .topMovies(topMovies)
                .roomOccupancy(roomOccupancy)
                .build();
    }

    private DateRange resolveDateRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate to = toDate == null ? LocalDate.now() : toDate;
        LocalDate from = fromDate == null ? to.minusDays(6) : fromDate;
        if (from.isAfter(to) || ChronoUnit.DAYS.between(from, to) > 366) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng thời gian báo cáo không hợp lệ (tối đa 367 ngày).");
        }
        return new DateRange(from, to);
    }

    private long amountFor(List<FinancialPaymentMethodResponse> methods, String paymentMethod) {
        return methods.stream()
                .filter(item -> paymentMethod.equals(item.getPaymentMethod()))
                .mapToLong(FinancialPaymentMethodResponse::getAmount)
                .sum();
    }

    private long number(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private record DateRange(LocalDate fromDate, LocalDate toDate) {
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
