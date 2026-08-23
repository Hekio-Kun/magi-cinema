package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CinemaRoomResponse {
    Long cinemaRoomId;
    String cinemaRoomName;
    Integer seatQuantity;
    Integer seatsPerRow;
    RoomType type;
    RoomStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
