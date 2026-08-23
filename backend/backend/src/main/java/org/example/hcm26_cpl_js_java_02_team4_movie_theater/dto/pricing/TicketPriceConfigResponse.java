package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketPriceConfigResponse {
    Integer standard2dPrice;
    Integer standard3dPrice;
    Integer imax3dPrice;
    Integer fourDx3dPrice;
    Integer vipSeatSurcharge;
    Integer coupleSeatSurcharge;
    Integer disabledSeatSurcharge;
    Integer u22BasePrice;
    LocalDateTime updatedAt;
}
