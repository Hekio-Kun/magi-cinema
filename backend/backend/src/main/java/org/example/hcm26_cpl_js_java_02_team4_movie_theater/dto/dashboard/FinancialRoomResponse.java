package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialRoomResponse {
    private Long roomId;
    private String roomName;
    private long seatCapacity;
    private long bookedSeats;
    private double occupancyRate;
}
