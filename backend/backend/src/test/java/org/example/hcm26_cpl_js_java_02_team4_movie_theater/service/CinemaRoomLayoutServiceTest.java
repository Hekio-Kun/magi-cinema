package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.SeatLayoutRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.SeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CinemaRoomLayoutServiceTest {

    @Mock CinemaRoomRepository cinemaRoomRepository;
    @Mock SeatRepository seatRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock SeatMapper seatMapper;
    @Mock CinemaRoomEditGuard cinemaRoomEditGuard;
    @InjectMocks CinemaRoomLayoutService layoutService;

    @Test
    void appliesTemplateWithAccessibleVipAndCoupleSeats() {
        CinemaRoom room = CinemaRoom.builder().cinemaRoomId(7L).seatQuantity(50).seatsPerRow(10).build();
        when(cinemaRoomRepository.findById(7L)).thenReturn(Optional.of(room));
        when(showtimeSeatRepository.existsBySeat_CinemaRoom_CinemaRoomId(7L)).thenReturn(false);
        when(seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(7L)).thenReturn(List.of());
        when(seatMapper.toSeatResponseList(anyList())).thenReturn(List.of());

        layoutService.applyLayout(7L, SeatLayoutRequest.builder()
                .seatQuantity(50)
                .seatsPerRow(10)
                .vipRowsFromBack(1)
                .coupleSeatsOnLastRow(2)
                .accessibleSeatsOnFirstRow(2)
                .build());

        ArgumentCaptor<List<Seat>> seatsCaptor = ArgumentCaptor.forClass(List.class);
        verify(seatRepository).saveAllAndFlush(seatsCaptor.capture());
        List<Seat> seats = seatsCaptor.getValue();
        assertEquals(50, seats.size());
        assertEquals("A1", seats.get(0).getSeatCode());
        assertEquals(SeatType.DISABLED, seats.get(0).getType());
        assertEquals(SeatType.VIP, seats.get(40).getType());
        assertEquals(SeatType.COUPLE, seats.get(44).getType());
        assertEquals(SeatType.COUPLE, seats.get(45).getType());
        assertEquals(SeatType.VIP, seats.get(49).getType());
        assertEquals(50, room.getSeatQuantity());
        assertEquals(10, room.getSeatsPerRow());
    }

    @Test
    void rejectsRebuildAfterRoomHasBeenPublishedToShowtime() {
        CinemaRoom room = CinemaRoom.builder().cinemaRoomId(8L).build();
        when(cinemaRoomRepository.findById(8L)).thenReturn(Optional.of(room));
        when(showtimeSeatRepository.existsBySeat_CinemaRoom_CinemaRoomId(8L)).thenReturn(true);

        assertThrows(AppException.class, () -> layoutService.applyLayout(8L, SeatLayoutRequest.builder()
                .seatQuantity(50).seatsPerRow(10).build()));
        verify(seatRepository, never()).saveAllAndFlush(any());
    }

    @Test
    void operationalSummaryCountsRoomsAndSeatsAcrossTheCinema() {
        when(cinemaRoomRepository.findAll()).thenReturn(List.of(
                CinemaRoom.builder().status(RoomStatus.ACTIVE).build(),
                CinemaRoom.builder().status(RoomStatus.MAINTENANCE).build(),
                CinemaRoom.builder().status(RoomStatus.INACTIVE).build()));
        when(seatRepository.findAll()).thenReturn(List.of(
                Seat.builder().status(SeatStatus.ACTIVE).build(),
                Seat.builder().status(SeatStatus.ACTIVE).build(),
                Seat.builder().status(SeatStatus.MAINTENANCE).build()));

        var summary = layoutService.getOperationalSummary();

        assertEquals(3, summary.getTotalRooms());
        assertEquals(1, summary.getActiveRooms());
        assertEquals(1, summary.getMaintenanceRooms());
        assertEquals(3, summary.getTotalSeats());
        assertEquals(2, summary.getActiveSeats());
        assertEquals(1, summary.getMaintenanceSeats());
    }
}
