package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.CinemaRoomMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.SeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeSeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DomainPaginationTest {
    @Mock CinemaRoomRepository cinemaRoomRepository;
    @Mock SeatRepository seatRepository;
    @Mock ShowtimeSeatRepository showtimeSeatRepository;
    @Mock CinemaRoomMapper cinemaRoomMapper;
    @Mock SeatMapper seatMapper;
    @Mock ShowtimeSeatMapper showtimeSeatMapper;
    @InjectMocks CinemaRoomService cinemaRoomService;
    @InjectMocks SeatService seatService;
    @InjectMocks ShowtimeSeatService showtimeSeatService;

    @Test
    void roomSearchCapsLargeRequestsAndReportsActualPage() {
        when(cinemaRoomRepository.findAll(any(Pageable.class))).thenAnswer(call -> {
            Pageable pageable = call.getArgument(0);
            assertEquals(0, pageable.getPageNumber());
            assertEquals(1_000, pageable.getPageSize());
            return Page.empty(pageable);
        });
        var response = cinemaRoomService.getCinemaRooms(null, null, -1, Integer.MAX_VALUE);
        assertEquals(0, response.getPage());
        assertEquals(1_000, response.getSize());
    }

    @Test
    void seatSearchNormalizesInvalidPageAndSize() {
        when(seatRepository.findAll(any(Pageable.class))).thenAnswer(call -> {
            Pageable pageable = call.getArgument(0);
            assertEquals(0, pageable.getPageNumber());
            assertEquals(1, pageable.getPageSize());
            return Page.empty(pageable);
        });
        var response = seatService.getSeats(null, null, -1, 0);
        assertEquals(0, response.getPage());
        assertEquals(1, response.getSize());
    }

    @Test
    void showtimeSeatSearchPreservesExistingFiveHundredSeatMapRequest() {
        when(showtimeSeatRepository.findAll(any(Pageable.class))).thenAnswer(call -> {
            Pageable pageable = call.getArgument(0);
            assertEquals(500, pageable.getPageSize());
            return Page.empty(pageable);
        });
        assertEquals(500, showtimeSeatService.getShowtimeSeats(null, null, 0, 500).getSize());
    }

    @Test
    void showtimeSeatSearchCapsLargeRequests() {
        when(showtimeSeatRepository.findAll(any(Pageable.class))).thenAnswer(call -> {
            Pageable pageable = call.getArgument(0);
            assertEquals(1_000, pageable.getPageSize());
            return Page.empty(pageable);
        });
        assertEquals(1_000, showtimeSeatService.getShowtimeSeats(null, null, 0, 999_999).getSize());
    }
}
