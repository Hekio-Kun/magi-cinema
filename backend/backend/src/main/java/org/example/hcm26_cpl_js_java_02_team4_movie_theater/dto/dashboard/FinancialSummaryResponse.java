package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialSummaryResponse {
    private LocalDate fromDate;
    private LocalDate toDate;

    private long totalBookings;
    private long successfulBookings;
    private long cancelledBookings;
    private long pendingBookings;

    private long ticketsSold;
    private long seatCapacity;
    private long bookedSeats;
    private double occupancyRate;

    /** Giá trị niêm yết trước giảm giá của các booking thành công. */
    private long grossSales;
    private long discountAmount;
    /** Số tiền cuối cùng trên booking thành công, dùng làm doanh thu ghi nhận. */
    private long netSales;
    private long ticketRevenue;
    private long concessionRevenue;
    private long cancelledAmount;
    private long pendingAmount;
    private long averageOrderValue;

    /** Phân bổ tiền đã ghi nhận theo phương thức thanh toán. */
    private long cashCollected;
    private long bankTransferCollected;
    private long momoCollected;
    private long zaloPayCollected;
    private long otherCollected;

    private List<FinancialDailyResponse> daily;
    private List<FinancialPaymentMethodResponse> paymentMethods;
    private List<FinancialMovieResponse> topMovies;
    private List<FinancialRoomResponse> roomOccupancy;
}
