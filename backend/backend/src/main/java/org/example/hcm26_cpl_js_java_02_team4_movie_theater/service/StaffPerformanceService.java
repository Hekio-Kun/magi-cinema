package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.performance.StaffPerformanceResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffPerformanceService {
    JdbcTemplate jdbcTemplate;

    @PreAuthorize("hasAnyAuthority('SCHEDULE_MANAGE', 'USER_VIEW')")
    public List<StaffPerformanceResponse> getPerformance(LocalDate from, LocalDate to) {
        LocalDate safeFrom = from == null ? LocalDate.now().withDayOfMonth(1) : from;
        LocalDate safeTo = to == null ? LocalDate.now() : to;
        if (safeTo.isBefore(safeFrom) || safeTo.isAfter(safeFrom.plusDays(91))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng thời gian báo cáo phải từ 1 đến 92 ngày.");
        }
        String sql = """
                WITH booking_stats AS (
                    SELECT b.sold_by_user_id AS user_id,
                           COALESCE(SUM(CASE WHEN b.payment_method = 'CASH' THEN b.total_amount ELSE 0 END), 0) AS cash_sales,
                           COALESCE(SUM(CASE WHEN b.payment_method = 'BANK_TRANSFER' THEN b.total_amount ELSE 0 END), 0) AS transfer_sales,
                           COALESCE(SUM(COALESCE(b.ticket_subtotal, b.total_amount, 0)), 0) AS ticket_sales,
                           COALESCE(SUM(COALESCE(b.concession_subtotal, 0)), 0) AS concession_sales
                    FROM booking b
                    WHERE b.status = 'SUCCESS' AND b.sold_by_user_id IS NOT NULL
                      AND b.created_at >= ? AND b.created_at < ?
                    GROUP BY b.sold_by_user_id
                ), concession_stats AS (
                    SELECT co.sold_by_user_id AS user_id,
                           COALESCE(SUM(CASE WHEN co.payment_method = 'CASH' THEN co.total_amount ELSE 0 END), 0) AS cash_sales,
                           COALESCE(SUM(CASE WHEN co.payment_method = 'BANK_TRANSFER' THEN co.total_amount ELSE 0 END), 0) AS transfer_sales,
                           COALESCE(SUM(co.total_amount), 0) AS concession_sales
                    FROM concession_order co
                    WHERE co.status = 'PAID' AND co.sold_by_user_id IS NOT NULL
                      AND co.created_at >= ? AND co.created_at < ?
                    GROUP BY co.sold_by_user_id
                ), shift_stats AS (
                    SELECT cs.cashier_user_id AS user_id,
                           COUNT(*) AS shift_count,
                           COUNT(*) FILTER (WHERE cs.reconciliation_status = 'APPROVED') AS approved_shift_count,
                           COALESCE(SUM(cs.variance), 0) AS variance_total
                    FROM cashier_shift cs
                    WHERE cs.opened_at >= ? AND cs.opened_at < ?
                    GROUP BY cs.cashier_user_id
                ), attendance_stats AS (
                    SELECT a.staff_user_id AS user_id,
                           COALESCE(SUM(sa.worked_minutes), 0) AS worked_minutes,
                           COUNT(*) FILTER (WHERE sa.status = 'LATE') AS late_count,
                           COUNT(*) FILTER (WHERE sa.status = 'ABSENT') AS absent_count
                    FROM staff_shift_assignment a
                    LEFT JOIN staff_attendance sa ON sa.assignment_id = a.assignment_id
                    WHERE a.work_date >= ? AND a.work_date <= ?
                    GROUP BY a.staff_user_id
                )
                SELECT u.user_id, u.username, COALESCE(up.full_name, u.username) AS full_name,
                       COALESCE(ss.shift_count, 0), COALESCE(ss.approved_shift_count, 0),
                       COALESCE(bs.ticket_sales, 0),
                       COALESCE(bs.concession_sales, 0) + COALESCE(cs.concession_sales, 0),
                       COALESCE(bs.cash_sales, 0) + COALESCE(bs.transfer_sales, 0)
                         + COALESCE(cs.cash_sales, 0) + COALESCE(cs.transfer_sales, 0) AS total_sales,
                       COALESCE(bs.cash_sales, 0) + COALESCE(cs.cash_sales, 0),
                       COALESCE(bs.transfer_sales, 0) + COALESCE(cs.transfer_sales, 0),
                       COALESCE(ss.variance_total, 0), COALESCE(ast.worked_minutes, 0),
                       COALESCE(ast.late_count, 0), COALESCE(ast.absent_count, 0)
                FROM users u
                LEFT JOIN user_profiles up ON up.user_id = u.user_id
                LEFT JOIN user_roles ur ON ur.user_id = u.user_id
                LEFT JOIN booking_stats bs ON bs.user_id = u.user_id
                LEFT JOIN concession_stats cs ON cs.user_id = u.user_id
                LEFT JOIN shift_stats ss ON ss.user_id = u.user_id
                LEFT JOIN attendance_stats ast ON ast.user_id = u.user_id
                WHERE u.status = 'ACTIVE' AND ur.role_name IN ('STAFF', 'MANAGER')
                GROUP BY u.user_id, u.username, up.full_name, ss.shift_count, ss.approved_shift_count,
                         bs.ticket_sales, bs.concession_sales, cs.concession_sales, bs.cash_sales,
                         bs.transfer_sales, cs.cash_sales, cs.transfer_sales, ss.variance_total,
                         ast.worked_minutes, ast.late_count, ast.absent_count
                ORDER BY total_sales DESC, u.username
                """;
        LocalDateTime fromTime = safeFrom.atStartOfDay();
        LocalDateTime toTime = safeTo.plusDays(1).atStartOfDay();
        return jdbcTemplate.query(sql, ps -> {
            ps.setObject(1, fromTime); ps.setObject(2, toTime);
            ps.setObject(3, fromTime); ps.setObject(4, toTime);
            ps.setObject(5, fromTime); ps.setObject(6, toTime);
            ps.setObject(7, safeFrom); ps.setObject(8, safeTo);
        }, this::mapRow);
    }

    private StaffPerformanceResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
        return StaffPerformanceResponse.builder()
                .staffUserId(rs.getString(1)).username(rs.getString(2)).fullName(rs.getString(3))
                .shiftCount(rs.getLong(4)).approvedShiftCount(rs.getLong(5)).ticketSales(rs.getLong(6))
                .concessionSales(rs.getLong(7)).totalSales(rs.getLong(8)).cashSales(rs.getLong(9))
                .transferSales(rs.getLong(10)).varianceTotal(rs.getLong(11)).workedMinutes(rs.getLong(12))
                .lateCount(rs.getLong(13)).absentCount(rs.getLong(14)).build();
    }
}
