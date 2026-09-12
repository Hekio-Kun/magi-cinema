package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.CinemaRoomMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.springframework.data.domain.Page;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.PageRequests;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaRoomService {

    CinemaRoomRepository cinemaRoomRepository;
    CinemaRoomMapper cinemaRoomMapper;
    SeatRepository seatRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    CinemaRoomEditGuard cinemaRoomEditGuard;

    public PageResponse<CinemaRoomResponse> getCinemaRooms(String keyword, RoomStatus status, int page, int size) {
        Pageable pageable = PageRequests.bounded(page, size, Sort.by("createdAt").descending());
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        Page<CinemaRoom> roomPage;

        if (!normalizedKeyword.isEmpty() && status != null) {
            roomPage = cinemaRoomRepository.findByCinemaRoomNameContainingIgnoreCaseAndStatus(
                    normalizedKeyword,
                    status,
                    pageable);
        } else if (!normalizedKeyword.isEmpty()) {
            roomPage = cinemaRoomRepository.findByCinemaRoomNameContainingIgnoreCase(normalizedKeyword, pageable);
        } else if (status != null) {
            roomPage = cinemaRoomRepository.findByStatus(status, pageable);
        } else {
            roomPage = cinemaRoomRepository.findAll(pageable);
        }

        List<CinemaRoomResponse> responses = cinemaRoomMapper.toCinemaRoomResponseList(roomPage.getContent());

        return PageResponse.<CinemaRoomResponse>builder()
                .page(pageable.getPageNumber())
                .totalPages(roomPage.getTotalPages())
                .size(pageable.getPageSize())
                .totalElements(roomPage.getTotalElements())
                .content(responses)
                .build();
    }

    public CinemaRoomResponse getCinemaRoomById(Long id) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));
        return cinemaRoomMapper.toCinemaRoomResponse(room);
    }

    @Transactional
    public CinemaRoomResponse createCinemaRoom(CinemaRoomCreationRequest request) {
        if (cinemaRoomRepository.existsByCinemaRoomName(request.getCinemaRoomName())) {
            throw new AppException(ErrorCode.CINEMA_ROOM_NAME_EXISTED);
        }

        CinemaRoom room = cinemaRoomMapper.toCinemaRoom(request);
        room.setStatus(RoomStatus.ACTIVE); // Default status
        room = cinemaRoomRepository.save(room);
        syncSeatsForRoom(room, 0);

        return cinemaRoomMapper.toCinemaRoomResponse(room);
    }

    @Transactional
    public CinemaRoomResponse updateCinemaRoom(Long id, CinemaRoomUpdateRequest request) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));

        if (!room.getCinemaRoomName().equals(request.getCinemaRoomName()) && 
            cinemaRoomRepository.existsByCinemaRoomName(request.getCinemaRoomName())) {
            throw new AppException(ErrorCode.CINEMA_ROOM_NAME_EXISTED);
        }

        cinemaRoomEditGuard.ensureEditable(room.getCinemaRoomId());

        Integer previousSeatQuantity = room.getSeatQuantity();
        cinemaRoomMapper.updateCinemaRoom(room, request);
        room = cinemaRoomRepository.save(room);
        syncSeatsForRoom(room, previousSeatQuantity == null ? 0 : previousSeatQuantity);

        return cinemaRoomMapper.toCinemaRoomResponse(room);
    }

    @Transactional
    public void deleteCinemaRoom(Long id) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));
        
        cinemaRoomEditGuard.ensureCanDeactivate(room.getCinemaRoomId());

        room.setStatus(RoomStatus.INACTIVE);
        cinemaRoomRepository.save(room);
    }

    @Transactional
    public CinemaRoomResponse restoreCinemaRoom(Long id) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));

        room.setStatus(RoomStatus.ACTIVE);
        room = cinemaRoomRepository.save(room);

        return cinemaRoomMapper.toCinemaRoomResponse(room);
    }

    private void syncSeatsForRoom(CinemaRoom room, int previousSeatQuantity) {
        Integer seatQuantity = room.getSeatQuantity();
        if (seatQuantity == null || seatQuantity < 50 || seatQuantity > 200) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng ghế phải từ 50 đến 200");
        }

        List<Seat> existingSeats = seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(room.getCinemaRoomId());
        int perRow = room.getSeatsPerRow() != null && room.getSeatsPerRow() > 0 ? room.getSeatsPerRow() : 10;

        for (int index = 0; index < seatQuantity; index++) {
            String expectedRow = buildSeatRow(index / perRow);
            Integer expectedNumber = index % perRow + 1;
            String expectedCode = expectedRow + expectedNumber;

            if (index < existingSeats.size()) {
                Seat seat = existingSeats.get(index);
                boolean positionChanged = !expectedRow.equals(seat.getSeatRow()) || !expectedNumber.equals(seat.getSeatNumber());
                
                if (positionChanged) {
                    seat.setSeatRow(expectedRow);
                    seat.setSeatNumber(expectedNumber);
                    // Reset code if the layout is reflowed to avoid mismatched codes like "A6" on position "B1"
                    seat.setSeatCode(expectedCode);
                }
                if (index >= previousSeatQuantity && seat.getStatus() == SeatStatus.INACTIVE) {
                    seat.setStatus(SeatStatus.ACTIVE);
                }
                if (positionChanged || index >= previousSeatQuantity) {
                    seatRepository.save(seat);
                }
            } else {
                seatRepository.save(Seat.builder()
                        .cinemaRoom(room)
                        .seatRow(expectedRow)
                        .seatNumber(expectedNumber)
                        .seatCode(expectedCode)
                        .type(SeatType.NORMAL)
                        .status(SeatStatus.ACTIVE)
                        .build());
            }
        }

        if (existingSeats.size() > seatQuantity) {
            for (int index = seatQuantity; index < existingSeats.size(); index++) {
                Seat seat = existingSeats.get(index);
                if (showtimeSeatRepository.existsBySeat_SeatId(seat.getSeatId())) {
                    seat.setStatus(SeatStatus.INACTIVE);
                    seatRepository.save(seat);
                } else {
                    seatRepository.delete(seat);
                }
            }
        }
    }

    private String buildSeatRow(int rowIndex) {
        StringBuilder row = new StringBuilder();
        int value = rowIndex;
        do {
            row.insert(0, (char) ('A' + (value % 26)));
            value = value / 26 - 1;
        } while (value >= 0);
        return row.toString();
    }
}
