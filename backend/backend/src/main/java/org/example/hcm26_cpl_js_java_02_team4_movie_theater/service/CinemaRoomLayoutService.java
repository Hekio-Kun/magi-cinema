package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomSeatSummaryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomOperationalSummaryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.SeatLayoutRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.SeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Applies a complete physical seat template as one transaction.  This keeps
 * the admin flow fast while making sure a partially generated layout can
 * never be visible to customers.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaRoomLayoutService {

    CinemaRoomRepository cinemaRoomRepository;
    SeatRepository seatRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    SeatMapper seatMapper;
    CinemaRoomEditGuard cinemaRoomEditGuard;

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    public CinemaRoomSeatSummaryResponse getSeatSummary(Long roomId) {
        CinemaRoom room = getRoom(roomId);
        return toSummary(room, seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(roomId));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('SHOWTIME_MANAGE', 'BOOKING_VIEW')")
    public CinemaRoomOperationalSummaryResponse getOperationalSummary() {
        List<CinemaRoom> rooms = cinemaRoomRepository.findAll();
        List<Seat> seats = seatRepository.findAll();
        return CinemaRoomOperationalSummaryResponse.builder()
                .totalRooms(rooms.size())
                .activeRooms((int) rooms.stream().filter(room -> room.getStatus() == RoomStatus.ACTIVE).count())
                .inactiveRooms((int) rooms.stream().filter(room -> room.getStatus() == RoomStatus.INACTIVE).count())
                .maintenanceRooms((int) rooms.stream().filter(room -> room.getStatus() == RoomStatus.MAINTENANCE).count())
                .totalSeats(seats.size())
                .activeSeats(countByStatus(seats, SeatStatus.ACTIVE))
                .maintenanceSeats(countByStatus(seats, SeatStatus.MAINTENANCE))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public List<SeatResponse> applyLayout(Long roomId, SeatLayoutRequest request) {
        CinemaRoom room = getRoom(roomId);
        cinemaRoomEditGuard.ensureEditable(roomId);

        // Existing showtime seats are historical records used on tickets. A
        // coordinate change would silently change the seat printed on those
        // tickets, so a full rebuild is intentionally limited to rooms that
        // have not been published to a showtime yet.
        if (showtimeSeatRepository.existsBySeat_CinemaRoom_CinemaRoomId(roomId)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phòng đã có dữ liệu suất chiếu. Hãy chỉnh loại hoặc trạng thái từng ghế; chỉ có thể tạo lại sơ đồ cho phòng chưa phát hành suất chiếu.");
        }

        int quantity = request.getSeatQuantity();
        int perRow = request.getSeatsPerRow();
        int rowCount = (int) Math.ceil(quantity / (double) perRow);
        int vipRows = request.getVipRowsFromBack() == null ? 0 : request.getVipRowsFromBack();
        int coupleCount = request.getCoupleSeatsOnLastRow() == null ? 0 : request.getCoupleSeatsOnLastRow();
        int accessibleCount = request.getAccessibleSeatsOnFirstRow() == null ? 0 : request.getAccessibleSeatsOnFirstRow();

        if (vipRows > rowCount) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số hàng VIP vượt quá số hàng của phòng.");
        }
        if (coupleCount > 0 && coupleCount % 2 != 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế đôi phải có số lượng chẵn để tạo thành từng cặp.");
        }
        int lastRowCapacity = quantity - ((rowCount - 1) * perRow);
        if (coupleCount > lastRowCapacity) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số ghế đôi vượt quá sức chứa của hàng cuối.");
        }
        if (accessibleCount > Math.min(perRow, quantity)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số ghế hỗ trợ vượt quá sức chứa của hàng đầu.");
        }

        List<Seat> existing = seatRepository
                .findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(roomId)
                .stream()
                .sorted(Comparator.comparingInt((Seat seat) -> toSeatRowIndex(seat.getSeatRow()))
                        .thenComparing(Seat::getSeatNumber)
                        .thenComparing(Seat::getSeatId))
                .toList();

        // Move all existing rows to a temporary namespace before assigning the
        // new positions. This avoids unique-key collisions when the admin
        // changes the number of seats per row (e.g. A10 becoming B2).
        for (int i = 0; i < existing.size(); i++) {
            Seat seat = existing.get(i);
            int temporaryNumber = 10_000 + i;
            seat.setSeatRow("TMP");
            seat.setSeatNumber(temporaryNumber);
            seat.setSeatCode("TMP" + temporaryNumber);
        }
        if (!existing.isEmpty()) {
            seatRepository.saveAllAndFlush(existing);
        }

        List<Seat> result = new ArrayList<>(quantity);
        for (int index = 0; index < quantity; index++) {
            int rowIndex = index / perRow;
            int number = index % perRow + 1;
            String row = buildSeatRow(rowIndex);
            Seat seat = index < existing.size()
                    ? existing.get(index)
                    : Seat.builder().cinemaRoom(room).status(SeatStatus.ACTIVE).build();

            seat.setCinemaRoom(room);
            seat.setSeatRow(row);
            seat.setSeatNumber(number);
            seat.setSeatCode(row + number);
            seat.setType(resolveType(index, rowIndex, rowCount, number, perRow,
                    vipRows, coupleCount, accessibleCount));
            if (seat.getStatus() == null) {
                seat.setStatus(SeatStatus.ACTIVE);
            }
            result.add(seat);
        }

        if (existing.size() > quantity) {
            seatRepository.deleteAll(existing.subList(quantity, existing.size()));
        }
        seatRepository.saveAllAndFlush(result);

        room.setSeatQuantity(quantity);
        room.setSeatsPerRow(perRow);
        cinemaRoomRepository.save(room);
        return seatMapper.toSeatResponseList(result);
    }

    private SeatType resolveType(
            int index,
            int rowIndex,
            int rowCount,
            int number,
            int perRow,
            int vipRows,
            int coupleCount,
            int accessibleCount) {
        if (rowIndex == 0 && number <= accessibleCount) {
            return SeatType.DISABLED;
        }
        if (rowIndex == rowCount - 1 && coupleCount > 0) {
            int lastRowCapacity = Math.min(perRow, index + 1);
            int start = Math.max(1, (lastRowCapacity - coupleCount) / 2 + 1);
            if (number >= start && number < start + coupleCount) {
                return SeatType.COUPLE;
            }
        }
        if (rowIndex >= rowCount - vipRows) {
            return SeatType.VIP;
        }
        return SeatType.NORMAL;
    }

    private CinemaRoomSeatSummaryResponse toSummary(CinemaRoom room, List<Seat> seats) {
        Set<String> rows = seats.stream().map(Seat::getSeatRow).collect(Collectors.toCollection(HashSet::new));
        return CinemaRoomSeatSummaryResponse.builder()
                .cinemaRoomId(room.getCinemaRoomId())
                .totalSeats(seats.size())
                .activeSeats(countByStatus(seats, SeatStatus.ACTIVE))
                .inactiveSeats(countByStatus(seats, SeatStatus.INACTIVE))
                .maintenanceSeats(countByStatus(seats, SeatStatus.MAINTENANCE))
                .normalSeats(countByType(seats, SeatType.NORMAL))
                .vipSeats(countByType(seats, SeatType.VIP))
                .coupleSeats(countByType(seats, SeatType.COUPLE))
                .accessibleSeats(countByType(seats, SeatType.DISABLED))
                .rowCount(rows.size())
                .seatsPerRow(room.getSeatsPerRow())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private int countByStatus(List<Seat> seats, SeatStatus status) {
        return (int) seats.stream().filter(seat -> seat.getStatus() == status).count();
    }

    private int countByType(List<Seat> seats, SeatType type) {
        return (int) seats.stream().filter(seat -> seat.getType() == type).count();
    }

    private CinemaRoom getRoom(Long roomId) {
        return cinemaRoomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));
    }

    private int toSeatRowIndex(String seatRow) {
        if (seatRow == null || seatRow.isBlank()) {
            return Integer.MAX_VALUE;
        }
        int index = 0;
        for (char current : seatRow.trim().toUpperCase().toCharArray()) {
            if (current < 'A' || current > 'Z') {
                return Integer.MAX_VALUE;
            }
            index = index * 26 + (current - 'A' + 1);
        }
        return index;
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
