package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceBreakdown;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.TicketPriceConfig;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketPriceConfigHistoryRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketPriceConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TicketPricingServiceTest {
    private final TicketPriceConfigRepository configRepository = mock(TicketPriceConfigRepository.class);
    private final TicketPriceConfigHistoryRepository historyRepository = mock(TicketPriceConfigHistoryRepository.class);
    private final TicketPricingService service = new TicketPricingService(configRepository, historyRepository, new ObjectMapper());
    private TicketPriceConfig config;

    @BeforeEach
    void setUp() {
        config = TicketPriceConfig.builder()
                .configId(1L)
                .standard2dPrice(75_000)
                .standard3dPrice(95_000)
                .imax3dPrice(125_000)
                .fourDx3dPrice(135_000)
                .vipSeatSurcharge(15_000)
                .coupleSeatSurcharge(75_000)
                .disabledSeatSurcharge(0)
                .u22BasePrice(55_000)
                .u22Enabled(true)
                .weekendSurcharge(10_000)
                .earlyBirdEnd(LocalTime.NOON)
                .earlyBirdDiscount(10_000)
                .primeTimeStart(LocalTime.of(18, 0))
                .primeTimeEnd(LocalTime.of(22, 0))
                .primeTimeSurcharge(10_000)
                .lateShowStart(LocalTime.of(22, 0))
                .lateShowSurcharge(5_000)
                .priceRoundingUnit(1_000)
                .updatedBy("admin")
                .version(1L)
                .build();
        when(configRepository.findById(TicketPriceConfig.SINGLETON_ID)).thenReturn(Optional.of(config));
    }

    @Test
    void earlyBirdDiscountIsAppliedAfterSeatSurcharge() {
        Showtime showtime = showtime(LocalDate.of(2026, 9, 14), LocalTime.of(10, 30), 75_000);

        TicketPriceBreakdown price = service.calculatePriceBreakdown(showtime, SeatType.VIP, false);

        assertThat(price.getBasePrice()).isEqualTo(75_000);
        assertThat(price.getSeatSurcharge()).isEqualTo(15_000);
        assertThat(price.getScheduleAdjustment()).isEqualTo(-10_000);
        assertThat(price.getFinalPrice()).isEqualTo(80_000);
        assertThat(price.getAppliedRules()).contains("Ưu đãi suất sớm", "Phụ thu ghế VIP");
    }

    @Test
    void weekendAndPrimeTimeSurchargesStack() {
        Showtime showtime = showtime(LocalDate.of(2026, 9, 19), LocalTime.of(19, 30), 75_000);

        TicketPriceBreakdown price = service.calculatePriceBreakdown(showtime, SeatType.VIP, false);

        assertThat(price.getScheduleAdjustment()).isEqualTo(20_000);
        assertThat(price.getFinalPrice()).isEqualTo(110_000);
        assertThat(price.getAppliedRules()).contains("Phụ thu cuối tuần", "Phụ thu giờ cao điểm");
    }

    @Test
    void u22UsesLowerBaseAndStillReceivesScheduleAdjustments() {
        Showtime showtime = showtime(LocalDate.of(2026, 9, 20), LocalTime.of(22, 30), 95_000);

        TicketPriceBreakdown price = service.calculatePriceBreakdown(showtime, SeatType.NORMAL, true);

        assertThat(price.getBasePrice()).isEqualTo(55_000);
        assertThat(price.getScheduleAdjustment()).isEqualTo(15_000);
        assertThat(price.getFinalPrice()).isEqualTo(70_000);
    }

    @Test
    void disabledU22PolicyIsRejectedByAuthoritativeCalculator() {
        config.setU22Enabled(false);
        Showtime showtime = showtime(LocalDate.of(2026, 9, 14), LocalTime.of(14, 0), 75_000);

        assertThatThrownBy(() -> service.calculateConfiguredU22TicketPrice(showtime, SeatType.NORMAL))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("tạm ngừng");
    }

    private Showtime showtime(LocalDate date, LocalTime time, int basePrice) {
        return Showtime.builder().showDate(date).startTime(time).basePrice(basePrice).build();
    }
}
