package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.*;

@Value
@Builder
public class BookingTicketDetailResponse {
    Long ticketId;
    String seatCode;
    String seatType;
    Integer price;
}
