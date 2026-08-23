package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select room from CinemaRoom room where room.cinemaRoomId in :ids order by room.cinemaRoomId")
    List<CinemaRoom> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    boolean existsByCinemaRoomName(String cinemaRoomName);

    Page<CinemaRoom> findByStatus(RoomStatus status, Pageable pageable);

    Page<CinemaRoom> findByCinemaRoomNameContainingIgnoreCase(String keyword, Pageable pageable);

    Page<CinemaRoom> findByCinemaRoomNameContainingIgnoreCaseAndStatus(
            String keyword,
            RoomStatus status,
            Pageable pageable);
}
