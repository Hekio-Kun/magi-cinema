package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MembershipPointCalculationTest {
    @Test
    void calculatesLargeMemberBookingWithoutIntegerOverflow() {
        int points = MembershipService.calculateEarnedPoints(
                2_240_000, 1_440_000, 800_000,
                new BigDecimal("5"), new BigDecimal("3"));

        assertEquals(96_000, points);
    }

    @Test
    void calculatesTicketAndConcessionPointsUsingSnapshotRates() {
        int points = MembershipService.calculateEarnedPoints(
                2_280_000, 840_000, 1_440_000,
                new BigDecimal("5"), new BigDecimal("3"));

        assertEquals(85_200, points);
    }

    @Test
    void freeTicketAndItsSeatSurchargeDoNotEarnPoints() {
        int pointEligibleSpend = MembershipService.calculatePointEligibleSpend(
                120_000, 20_000, 100_000, 0);
        int points = MembershipService.calculateEarnedPoints(
                pointEligibleSpend, 0, 100_000,
                new BigDecimal("10"), new BigDecimal("5"));

        assertEquals(100_000, pointEligibleSpend);
        assertEquals(5_000, points);
    }
}
