package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeSeatResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Seat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeSeatMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.SeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.springframework.data.domain.Page;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.PageRequests;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimeSeatService {

    ShowtimeSeatRepository showtimeSeatRepository;
    ShowtimeRepository showtimeRepository;
    SeatRepository seatRepository;
    ShowtimeSeatMapper showtimeSeatMapper;
    SeatRealtimeService seatRealtimeService;

    @Transactional
    public PageResponse<ShowtimeSeatResponse> getShowtimeSeats(
            Long showtimeId,
            ShowtimeSeatStatus status,
            int page,
            int size) {
        Pageable pageable = PageRequests.bounded(page, size,
                Sort.by("seat.seatRow").ascending()
                        .and(Sort.by("seat.seatNumber").ascending())
                        .and(Sort.by("showtimeSeatId").ascending()));
        Page<ShowtimeSeat> showtimeSeatPage;

        if (showtimeId != null && status != null) {
            synchronizeActiveSeatsForShowtime(showtimeId);
            showtimeSeatPage = showtimeSeatRepository.findByShowtime_ShowtimeIdAndStatusAndSeat_Status(
                    showtimeId,
                    status,
                    SeatStatus.ACTIVE,
                    pageable);
        } else if (showtimeId != null) {
            synchronizeActiveSeatsForShowtime(showtimeId);
            showtimeSeatPage = showtimeSeatRepository.findByShowtime_ShowtimeIdAndSeat_Status(
                    showtimeId,
                    SeatStatus.ACTIVE,
                    pageable);
        } else if (status != null) {
            showtimeSeatPage = showtimeSeatRepository.findByStatus(status, pageable);
        } else {
            showtimeSeatPage = showtimeSeatRepository.findAll(pageable);
        }

        List<ShowtimeSeatResponse> responses = showtimeSeatMapper.toShowtimeSeatResponseList(showtimeSeatPage.getContent());
        return PageResponse.<ShowtimeSeatResponse>builder()
                .page(pageable.getPageNumber())
                .totalPages(showtimeSeatPage.getTotalPages())
                .size(pageable.getPageSize())
                .totalElements(showtimeSeatPage.getTotalElements())
                .content(responses)
                .build();
    }

    @Transactional(readOnly = true)
    public ShowtimeSeatResponse getShowtimeSeatById(Long showtimeSeatId) {
        return showtimeSeatMapper.toShowtimeSeatResponse(getShowtimeSeat(showtimeSeatId));
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ShowtimeSeatResponse createShowtimeSeat(ShowtimeSeatCreationRequest request) {
        Showtime showtime = getShowtime(request.getShowtimeId());
        Seat seat = getSeat(request.getSeatId());
        validateSeatForShowtime(showtime, seat);

        if (showtimeSeatRepository.existsByShowtime_ShowtimeIdAndSeat_SeatId(request.getShowtimeId(), request.getSeatId())) {
            throw new AppException(ErrorCode.SHOWTIME_SEAT_EXISTED);
        }

        ShowtimeSeat showtimeSeat = ShowtimeSeat.builder()
                .showtime(showtime)
                .seat(seat)
                .status(resolveStatus(request.getStatus()))
                .build();

        showtimeSeat = showtimeSeatRepository.save(showtimeSeat);
        seatRealtimeService.publishSeatStatusChangeAfterCommit(showtime.getShowtimeId(), List.of(showtimeSeat));
        return showtimeSeatMapper.toShowtimeSeatResponse(showtimeSeat);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ShowtimeSeatResponse updateShowtimeSeat(Long showtimeSeatId, ShowtimeSeatUpdateRequest request) {
        ShowtimeSeat showtimeSeat = getShowtimeSeat(showtimeSeatId);
        Showtime showtime = getShowtime(request.getShowtimeId());
        Seat seat = getSeat(request.getSeatId());
        validateSeatForShowtime(showtime, seat);

        boolean duplicated = showtimeSeatRepository.existsByShowtime_ShowtimeIdAndSeat_SeatIdAndShowtimeSeatIdNot(
                request.getShowtimeId(),
                request.getSeatId(),
                showtimeSeatId);
        if (duplicated) {
            throw new AppException(ErrorCode.SHOWTIME_SEAT_EXISTED);
        }

        showtimeSeat.setShowtime(showtime);
        showtimeSeat.setSeat(seat);
        showtimeSeat.setStatus(request.getStatus());
        if (request.getStatus() != ShowtimeSeatStatus.HOLDING) {
            showtimeSeat.setSelectionHeldByUserId(null);
            showtimeSeat.setSelectionHoldToken(null);
            showtimeSeat.setSelectionHoldExpiresAt(null);
        }

        showtimeSeat = showtimeSeatRepository.save(showtimeSeat);
        seatRealtimeService.publishSeatStatusChangeAfterCommit(showtime.getShowtimeId(), List.of(showtimeSeat));
        return showtimeSeatMapper.toShowtimeSeatResponse(showtimeSeat);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public void deleteShowtimeSeat(Long showtimeSeatId) {
        showtimeSeatRepository.delete(getShowtimeSeat(showtimeSeatId));
    }

    private ShowtimeSeat getShowtimeSeat(Long showtimeSeatId) {
        return showtimeSeatRepository.findById(showtimeSeatId)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_SEAT_NOT_FOUND));
    }

    private Showtime getShowtime(Long showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
    }

    private Seat getSeat(Long seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));
    }

    private void validateSeatForShowtime(Showtime showtime, Seat seat) {
        Long showtimeRoomId = showtime.getCinemaRoom() == null ? null : showtime.getCinemaRoom().getCinemaRoomId();
        Long seatRoomId = seat.getCinemaRoom() == null ? null : seat.getCinemaRoom().getCinemaRoomId();

        if (showtimeRoomId == null || !showtimeRoomId.equals(seatRoomId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế phải thuộc cùng phòng chiếu với suất chiếu");
        }

        if (seat.getStatus() != SeatStatus.ACTIVE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ có thể gán ghế đang hoạt động cho suất chiếu");
        }
    }

    private ShowtimeSeatStatus resolveStatus(ShowtimeSeatStatus status) {
        return status == null ? ShowtimeSeatStatus.AVAILABLE : status;
    }

    private void synchronizeActiveSeatsForShowtime(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        if (showtime.getCinemaRoom() == null || showtime.getCinemaRoom().getCinemaRoomId() == null) {
            return;
        }

        Long cinemaRoomId = showtime.getCinemaRoom().getCinemaRoomId();
        List<Seat> activeSeats = seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(cinemaRoomId)
                .stream()
                .filter(seat -> seat.getStatus() == SeatStatus.ACTIVE)
                .toList();
        if (activeSeats.isEmpty()) {
            return;
        }

        Set<Long> existingSeatIds = showtimeSeatRepository.findByShowtime_ShowtimeId(showtimeId).stream()
                .map(ShowtimeSeat::getSeat)
                .filter(java.util.Objects::nonNull)
                .map(Seat::getSeatId)
                .collect(Collectors.toSet());

        List<ShowtimeSeat> missingSeats = activeSeats.stream()
                .filter(seat -> !existingSeatIds.contains(seat.getSeatId()))
                .map(seat -> ShowtimeSeat.builder()
                        .showtime(showtime)
                        .seat(seat)
                        .status(ShowtimeSeatStatus.AVAILABLE)
                        .build())
                .toList();
        if (!missingSeats.isEmpty()) {
            showtimeSeatRepository.saveAll(missingSeats);
        }
    }

    @Transactional
    public void deleteSeatsByShowtimeId(Long showtimeId) {
        showtimeSeatRepository.deleteByShowtime_ShowtimeId(showtimeId);
    }

    @Transactional
    public void generateSeatsForShowtime(Showtime showtime) {
        if (showtime.getCinemaRoom() == null || showtime.getCinemaRoom().getCinemaRoomId() == null) {
            return;
        }
        Long cinemaRoomId = showtime.getCinemaRoom().getCinemaRoomId();
        List<Seat> seats = seatRepository.findByCinemaRoom_CinemaRoomIdOrderBySeatRowAscSeatNumberAsc(cinemaRoomId);
        
        List<ShowtimeSeat> showtimeSeats = seats.stream()
                .filter(seat -> seat.getStatus() == SeatStatus.ACTIVE)
                .map(seat -> ShowtimeSeat.builder()
                        .showtime(showtime)
                        .seat(seat)
                        .status(ShowtimeSeatStatus.AVAILABLE)
                        .build())
                .toList();
                
        showtimeSeatRepository.saveAll(showtimeSeats);
    }
}
