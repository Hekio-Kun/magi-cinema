package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.realtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatStatusUpdateMessage {
    String type;
    Long showtimeId;
    List<SeatStatusUpdateItem> seats;
    LocalDateTime occurredAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatStatusUpdateItem {
        Long showtimeSeatId;
        ShowtimeSeatStatus status;
        String selectionHoldToken;
    }
}
