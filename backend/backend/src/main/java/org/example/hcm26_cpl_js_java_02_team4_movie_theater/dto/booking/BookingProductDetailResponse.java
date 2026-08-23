package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.*;

@Value
@Builder
public class BookingProductDetailResponse {
    String type;
    String name;
    Integer quantity;
    Long unitPrice;
    Long totalPrice;
}
