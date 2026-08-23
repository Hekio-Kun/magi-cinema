package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    Page<Seat> findByCinemaRoom_CinemaRoomId(Long cinemaRoomId, Pageable pageable);

    Page<Seat> findByStatus(SeatStatus status, Pageable pageable);

    Page<Seat> findByCinemaRoom_CinemaRoomIdAndStatus(Long cinemaRoomId, SeatStatus status, Pageable pageable);

    List<Seat> findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(Long cinemaRoomId);

    Optional<Seat> findByCinemaRoom_CinemaRoomIdAndSeatCode(Long cinemaRoomId, String seatCode);

    boolean existsByCinemaRoom_CinemaRoomIdAndSeatCode(Long cinemaRoomId, String seatCode);

    boolean existsByCinemaRoom_CinemaRoomIdAndSeatCodeIgnoreCase(Long cinemaRoomId, String seatCode);

    boolean existsByCinemaRoom_CinemaRoomIdAndSeatCodeIgnoreCaseAndSeatIdNot(
            Long cinemaRoomId,
            String seatCode,
            Long seatId);

    boolean existsByCinemaRoom_CinemaRoomIdAndSeatRowIgnoreCaseAndSeatNumber(
            Long cinemaRoomId,
            String seatRow,
            Integer seatNumber);

    boolean existsByCinemaRoom_CinemaRoomIdAndSeatRowIgnoreCaseAndSeatNumberAndSeatIdNot(
            Long cinemaRoomId,
            String seatRow,
            Integer seatNumber,
            Long seatId);
}
