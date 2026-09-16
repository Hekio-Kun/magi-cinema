package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShowtimeSeatResponse {
    Long showtimeSeatId;
    Long showtimeId;
    Long seatId;
    Long cinemaRoomId;
    String cinemaRoomName;
    String seatRow;
    Integer seatNumber;
    String seatCode;
    SeatType seatType;
    Integer basePrice;
    Integer seatSurcharge;
    Integer scheduleAdjustment;
    Integer finalPrice;
    List<String> appliedPricingRules;
    LocalDate showDate;
    LocalTime startTime;
    LocalTime endTime;
    ShowtimeSeatStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
