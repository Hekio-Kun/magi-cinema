package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface SeatMapper {

    default SeatResponse toSeatResponse(Seat seat) {
        if (seat == null) {
            return null;
        }

        CinemaRoom cinemaRoom = seat.getCinemaRoom();
        return SeatResponse.builder()
                .seatId(seat.getSeatId())
                .cinemaRoomId(cinemaRoom == null ? null : cinemaRoom.getCinemaRoomId())
                .cinemaRoomName(cinemaRoom == null ? null : cinemaRoom.getCinemaRoomName())
                .seatRow(seat.getSeatRow())
                .seatNumber(seat.getSeatNumber())
                .seatCode(seat.getSeatCode())
                .type(seat.getType())
                .status(seat.getStatus())
                .createdAt(seat.getCreatedAt())
                .updatedAt(seat.getUpdatedAt())
                .build();
    }

    default List<SeatResponse> toSeatResponseList(List<Seat> seats) {
        if (seats == null) {
            return List.of();
        }
        return seats.stream()
                .map(this::toSeatResponse)
                .toList();
    }
}
