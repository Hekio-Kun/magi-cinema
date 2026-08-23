package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatResponse {
    Long seatId;
    Long cinemaRoomId;
    String cinemaRoomName;
    String seatRow;
    Integer seatNumber;
    String seatCode;
    SeatType type;
    SeatStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
