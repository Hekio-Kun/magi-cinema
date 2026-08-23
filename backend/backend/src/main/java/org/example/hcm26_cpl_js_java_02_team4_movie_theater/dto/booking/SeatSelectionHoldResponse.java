package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatSelectionHoldResponse {
    Long showtimeId;
    List<Long> showtimeSeatIds;
    String clientToken;
    LocalDateTime expiresAt;
}
