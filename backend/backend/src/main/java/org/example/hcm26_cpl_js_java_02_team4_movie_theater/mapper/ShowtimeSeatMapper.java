package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TicketPricingService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceBreakdown;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ShowtimeSeatMapper {

    private final TicketPricingService ticketPricingService;

    public ShowtimeSeatResponse toShowtimeSeatResponse(ShowtimeSeat showtimeSeat) {
        if (showtimeSeat == null) {
            return null;
        }

        Showtime showtime = showtimeSeat.getShowtime();
        Seat seat = showtimeSeat.getSeat();
        CinemaRoom cinemaRoom = seat == null ? null : seat.getCinemaRoom();
        TicketPriceBreakdown price = showtime == null || seat == null
                ? null
                : ticketPricingService.calculatePriceBreakdown(showtime, seat.getType(), false);

        return ShowtimeSeatResponse.builder()
                .showtimeSeatId(showtimeSeat.getShowtimeSeatId())
                .showtimeId(showtime == null ? null : showtime.getShowtimeId())
                .seatId(seat == null ? null : seat.getSeatId())
                .cinemaRoomId(cinemaRoom == null ? null : cinemaRoom.getCinemaRoomId())
                .cinemaRoomName(cinemaRoom == null ? null : cinemaRoom.getCinemaRoomName())
                .seatRow(seat == null ? null : seat.getSeatRow())
                .seatNumber(seat == null ? null : seat.getSeatNumber())
                .seatCode(seat == null ? null : seat.getSeatCode())
                .seatType(seat == null ? null : seat.getType())
                .basePrice(price == null ? null : price.getBasePrice())
                .seatSurcharge(price == null ? null : price.getSeatSurcharge())
                .scheduleAdjustment(price == null ? null : price.getScheduleAdjustment())
                .finalPrice(price == null ? null : price.getFinalPrice())
                .appliedPricingRules(price == null ? List.of() : price.getAppliedRules())
                .showDate(showtime == null ? null : showtime.getShowDate())
                .startTime(showtime == null ? null : showtime.getStartTime())
                .endTime(showtime == null ? null : showtime.getEndTime())
                .status(showtimeSeat.getStatus())
                .createdAt(showtimeSeat.getCreatedAt())
                .updatedAt(showtimeSeat.getUpdatedAt())
                .build();
    }

    public List<ShowtimeSeatResponse> toShowtimeSeatResponseList(List<ShowtimeSeat> showtimeSeats) {
        if (showtimeSeats == null) {
            return List.of();
        }
        return showtimeSeats.stream()
                .map(this::toShowtimeSeatResponse)
                .toList();
    }
}
