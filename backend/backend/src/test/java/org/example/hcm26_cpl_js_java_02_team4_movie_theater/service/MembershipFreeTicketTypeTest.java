package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MembershipFreeTicketTypeTest {
    @Test
    void configuredTicketTypeOnlyMatchesItsPresentation() {
        assertTrue(MembershipFreeTicketType.STANDARD_2D
                .supports(MovieFormat.STANDARD, MovieProjectionType.TWO_D));
        assertFalse(MembershipFreeTicketType.STANDARD_2D
                .supports(MovieFormat.STANDARD, MovieProjectionType.THREE_D));
        assertFalse(MembershipFreeTicketType.STANDARD_2D
                .supports(MovieFormat.IMAX, MovieProjectionType.TWO_D));
        assertTrue(MembershipFreeTicketType.IMAX
                .supports(MovieFormat.IMAX, MovieProjectionType.THREE_D));
        assertTrue(MembershipFreeTicketType.ANY
                .supports(MovieFormat._4DX, MovieProjectionType.THREE_D));
    }
}
