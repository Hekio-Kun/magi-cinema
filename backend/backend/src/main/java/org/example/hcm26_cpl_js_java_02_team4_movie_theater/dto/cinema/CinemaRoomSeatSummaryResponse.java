package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Aggregated seat information used by the operations screen.  Keeping these
 * counters in one response avoids making the dashboard load every seat just
 * to render its summary cards.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CinemaRoomSeatSummaryResponse {
    Long cinemaRoomId;
    Integer totalSeats;
    Integer activeSeats;
    Integer inactiveSeats;
    Integer maintenanceSeats;
    Integer normalSeats;
    Integer vipSeats;
    Integer coupleSeats;
    Integer accessibleSeats;
    Integer rowCount;
    Integer seatsPerRow;
    LocalDateTime generatedAt;
}
