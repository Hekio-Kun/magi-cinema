package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.SeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatService {

    SeatRepository seatRepository;
    CinemaRoomRepository cinemaRoomRepository;
    SeatMapper seatMapper;
    CinemaRoomEditGuard cinemaRoomEditGuard;

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF', 'ROLE_CUSTOMER')")
    public PageResponse<SeatResponse> getSeats(Long cinemaRoomId, SeatStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("seatRow").ascending().and(Sort.by("seatNumber").ascending()));
        Page<Seat> seatPage;

        if (cinemaRoomId != null && status != null) {
            seatPage = seatRepository.findByCinemaRoom_CinemaRoomIdAndStatus(cinemaRoomId, status, pageable);
        } else if (cinemaRoomId != null) {
            seatPage = seatRepository.findByCinemaRoom_CinemaRoomId(cinemaRoomId, pageable);
        } else if (status != null) {
            seatPage = seatRepository.findByStatus(status, pageable);
        } else {
            seatPage = seatRepository.findAll(pageable);
        }

        List<SeatResponse> responses = seatMapper.toSeatResponseList(seatPage.getContent());
        return PageResponse.<SeatResponse>builder()
                .page(page)
                .totalPages(seatPage.getTotalPages())
                .size(size)
                .totalElements(seatPage.getTotalElements())
                .content(responses)
                .build();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF', 'ROLE_CUSTOMER')")
    public SeatResponse getSeatById(Long seatId) {
        return seatMapper.toSeatResponse(getSeat(seatId));
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public SeatResponse createSeat(SeatCreationRequest request) {
        CinemaRoom cinemaRoom = getCinemaRoom(request.getCinemaRoomId());
        cinemaRoomEditGuard.ensureEditable(cinemaRoom.getCinemaRoomId());
        String seatRow = normalize(request.getSeatRow());
        String seatCode = normalize(request.getSeatCode());
        ensureSeatUnique(cinemaRoom.getCinemaRoomId(), seatRow, request.getSeatNumber(), seatCode, null);

        Seat seat = Seat.builder()
                .cinemaRoom(cinemaRoom)
                .seatRow(seatRow)
                .seatNumber(request.getSeatNumber())
                .seatCode(seatCode)
                .type(resolveType(request.getType()))
                .status(resolveStatus(request.getStatus()))
                .build();

        seat = seatRepository.save(seat);
        validateCoupleSeatLayout(cinemaRoom.getCinemaRoomId());
        return seatMapper.toSeatResponse(seat);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public SeatResponse updateSeat(Long seatId, SeatUpdateRequest request) {
        Seat seat = getSeat(seatId);
        Long currentRoomId = seat.getCinemaRoom().getCinemaRoomId();
        cinemaRoomEditGuard.ensureEditable(currentRoomId);

        CinemaRoom cinemaRoom = getCinemaRoom(request.getCinemaRoomId());
        if (!cinemaRoom.getCinemaRoomId().equals(currentRoomId)) {
            cinemaRoomEditGuard.ensureEditable(cinemaRoom.getCinemaRoomId());
        }

        String seatRow = normalize(request.getSeatRow());
        String seatCode = normalize(request.getSeatCode());
        ensureSeatUnique(cinemaRoom.getCinemaRoomId(), seatRow, request.getSeatNumber(), seatCode, seatId);

        seat.setCinemaRoom(cinemaRoom);
        seat.setSeatRow(seatRow);
        seat.setSeatNumber(request.getSeatNumber());
        seat.setSeatCode(seatCode);
        seat.setType(request.getType() == null ? seat.getType() : request.getType());
        seat.setStatus(request.getStatus() == null ? seat.getStatus() : request.getStatus());

        seat = seatRepository.save(seat);
        validateCoupleSeatLayout(cinemaRoom.getCinemaRoomId());
        return seatMapper.toSeatResponse(seat);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public void deleteSeat(Long seatId) {
        Seat seat = getSeat(seatId);
        cinemaRoomEditGuard.ensureEditable(seat.getCinemaRoom().getCinemaRoomId());
        seat.setStatus(SeatStatus.INACTIVE);
        seatRepository.save(seat);
        validateCoupleSeatLayout(seat.getCinemaRoom().getCinemaRoomId());
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public void bulkUpdateSeats(org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.seat.SeatBulkUpdateRequest request) {
        List<Seat> seats = seatRepository.findAllById(request.getSeatIds());
        Set<Long> affectedRoomIds = seats.stream()
                .map(seat -> seat.getCinemaRoom().getCinemaRoomId())
                .collect(Collectors.toSet());
        affectedRoomIds.forEach(cinemaRoomEditGuard::ensureEditable);

        for (Seat seat : seats) {
            if (request.getType() != null) {
                seat.setType(request.getType());
            }
            if (request.getStatus() != null) {
                seat.setStatus(request.getStatus());
            }
        }

        seatRepository.saveAll(seats);
        affectedRoomIds.forEach(this::validateCoupleSeatLayout);
    }

    private void validateCoupleSeatLayout(Long cinemaRoomId) {
        List<Seat> roomSeats = seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(cinemaRoomId);
        String lastAvailableSeatRow = roomSeats.stream()
                .filter(this::canBeCouplePlacementRow)
                .map(Seat::getSeatRow)
                .max(this::compareSeatRows)
                .orElse(null);

        Map<String, List<Seat>> coupleSeatsByRow = roomSeats.stream()
                .filter(seat -> seat.getType() == SeatType.COUPLE && isSeatInCurrentLayout(seat))
                .collect(Collectors.groupingBy(Seat::getSeatRow));

        for (Map.Entry<String, List<Seat>> entry : coupleSeatsByRow.entrySet()) {
            if (lastAvailableSeatRow != null && !entry.getKey().equalsIgnoreCase(lastAvailableSeatRow)) {
                throw new AppException(
                        ErrorCode.INVALID_SEAT_SELECTION,
                        "Ghế đôi chỉ được cấu hình ở hàng cuối cùng còn hoạt động của phòng chiếu");
            }

            List<Seat> rowCoupleSeats = new ArrayList<>(entry.getValue());
            rowCoupleSeats.sort(Comparator.comparing(Seat::getSeatNumber).thenComparing(Seat::getSeatId));

            if (rowCoupleSeats.size() % 2 != 0) {
                throw new AppException(
                        ErrorCode.INVALID_SEAT_SELECTION,
                        "Ghế đôi ở hàng " + entry.getKey() + " phải có số lượng chẵn và đi theo từng cặp liền kề");
            }

            for (int i = 0; i < rowCoupleSeats.size(); i += 2) {
                Seat leftSeat = rowCoupleSeats.get(i);
                Seat rightSeat = rowCoupleSeats.get(i + 1);
                if (rightSeat.getSeatNumber() != leftSeat.getSeatNumber() + 1) {
                    throw new AppException(
                            ErrorCode.INVALID_SEAT_SELECTION,
                            "Ghế đôi phải là 2 ghế liền kề trong cùng một hàng, ví dụ "
                                    + leftSeat.getSeatRow() + leftSeat.getSeatNumber()
                                    + " - " + leftSeat.getSeatRow() + (leftSeat.getSeatNumber() + 1));
                }
            }
        }
    }

    private boolean canBeCouplePlacementRow(Seat seat) {
        return isSeatInCurrentLayout(seat);
    }

    private boolean isSeatInCurrentLayout(Seat seat) {
        return seat.getStatus() != SeatStatus.INACTIVE;
    }

    private int compareSeatRows(String left, String right) {
        int leftIndex = toSeatRowIndex(left);
        int rightIndex = toSeatRowIndex(right);
        if (leftIndex > 0 && rightIndex > 0) {
            return Integer.compare(leftIndex, rightIndex);
        }
        return normalize(left).compareToIgnoreCase(normalize(right));
    }

    private int toSeatRowIndex(String seatRow) {
        int index = 0;
        String normalized = normalize(seatRow);
        for (int i = 0; i < normalized.length(); i++) {
            char current = normalized.charAt(i);
            if (current < 'A' || current > 'Z') {
                return -1;
            }
            index = index * 26 + (current - 'A' + 1);
        }
        return index;
    }

    private void ensureSeatUnique(Long cinemaRoomId, String seatRow, Integer seatNumber, String seatCode, Long excludedSeatId) {
        boolean duplicatedByPosition = excludedSeatId == null
                ? seatRepository.existsByCinemaRoom_CinemaRoomIdAndSeatRowIgnoreCaseAndSeatNumber(cinemaRoomId, seatRow, seatNumber)
                : seatRepository.existsByCinemaRoom_CinemaRoomIdAndSeatRowIgnoreCaseAndSeatNumberAndSeatIdNot(
                        cinemaRoomId,
                        seatRow,
                        seatNumber,
                        excludedSeatId);
        if (duplicatedByPosition) {
            throw new AppException(ErrorCode.SEAT_EXISTED, "Ghế đã tồn tại theo hàng và số ghế trong phòng chiếu");
        }

        boolean duplicatedByCode = excludedSeatId == null
                ? seatRepository.existsByCinemaRoom_CinemaRoomIdAndSeatCodeIgnoreCase(cinemaRoomId, seatCode)
                : seatRepository.existsByCinemaRoom_CinemaRoomIdAndSeatCodeIgnoreCaseAndSeatIdNot(cinemaRoomId, seatCode, excludedSeatId);
        if (duplicatedByCode) {
            throw new AppException(ErrorCode.SEAT_EXISTED, "Mã ghế đã tồn tại trong phòng chiếu");
        }
    }

    private Seat getSeat(Long seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));
    }

    private CinemaRoom getCinemaRoom(Long cinemaRoomId) {
        return cinemaRoomRepository.findById(cinemaRoomId)
                .orElseThrow(() -> new AppException(ErrorCode.CINEMA_ROOM_NOT_FOUND));
    }

    private String normalize(String value) {
        return value.trim().toUpperCase();
    }

    private SeatType resolveType(SeatType type) {
        return type == null ? SeatType.NORMAL : type;
    }

    private SeatStatus resolveStatus(SeatStatus status) {
        return status == null ? SeatStatus.ACTIVE : status;
    }
}
