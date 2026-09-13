package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CinemaRoomOperationalSummaryResponse {
    Integer totalRooms;
    Integer activeRooms;
    Integer inactiveRooms;
    Integer maintenanceRooms;
    Integer totalSeats;
    Integer activeSeats;
    Integer maintenanceSeats;
    LocalDateTime generatedAt;
}
