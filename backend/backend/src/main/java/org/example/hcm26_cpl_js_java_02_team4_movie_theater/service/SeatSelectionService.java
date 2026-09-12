package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.persistence.EntityManager;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.SeatSelectionHoldResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatSelectionService {

    static final int MAX_SEATS_PER_SELECTION = 8;
    static final int EARLY_BOOKING_WINDOW_DAYS = 7;

    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    UserRepository userRepository;
    SeatRealtimeService seatRealtimeService;
    EntityManager entityManager;

    @NonFinal
    @Value("${seat-selection.hold-duration-seconds:180}")
    long holdDurationSeconds = 180;

    @Transactional
    public SeatSelectionHoldResponse getCurrentSelection(Long showtimeId, String clientToken) {
        if (showtimeId == null || !showtimeRepository.existsById(showtimeId)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }
        if (clientToken == null || clientToken.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã phiên chọn ghế không hợp lệ.");
        }

        User user = getCurrentUser();
        List<ShowtimeSeat> currentSelection =
                showtimeSeatRepository.findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        showtimeId,
                        user.getUserId(),
                        clientToken);
        if (currentSelection.isEmpty()) {
            return emptyResponse(showtimeId);
        }

        List<ShowtimeSeat> lockedSeats = lockAndRefreshSeats(
                currentSelection.stream().map(ShowtimeSeat::getShowtimeSeatId).toList());
        LocalDateTime now = LocalDateTime.now();
        List<ShowtimeSeat> activeSelection = new ArrayList<>();
        List<ShowtimeSeat> releasedSeats = new ArrayList<>();
        List<ShowtimeSeat> seatsToSave = new ArrayList<>();

        for (ShowtimeSeat seat : lockedSeats) {
            boolean active = seat.getStatus() == ShowtimeSeatStatus.HOLDING
                    && user.getUserId().equals(seat.getSelectionHeldByUserId())
                    && clientToken.equals(seat.getSelectionHoldToken())
                    && seat.getSelectionHoldExpiresAt() != null
                    && seat.getSelectionHoldExpiresAt().isAfter(now);
            if (active) {
                activeSelection.add(seat);
                continue;
            }

            if (user.getUserId().equals(seat.getSelectionHeldByUserId())
                    && clientToken.equals(seat.getSelectionHoldToken())) {
                if (seat.getStatus() == ShowtimeSeatStatus.HOLDING) {
                    seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
                    releasedSeats.add(seat);
                }
                clearSelectionHold(seat);
                seatsToSave.add(seat);
            }
        }

        if (!seatsToSave.isEmpty()) {
            showtimeSeatRepository.saveAll(seatsToSave);
        }
        if (!releasedSeats.isEmpty()) {
            seatRealtimeService.publishSeatStatusChangeAfterCommit(showtimeId, releasedSeats);
        }
        return response(showtimeId, activeSelection);
    }

    @Transactional
    public void releaseCurrentUserSelection(Long showtimeId) {
        if (showtimeId == null || !showtimeRepository.existsById(showtimeId)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }

        User user = getCurrentUser();
        List<ShowtimeSeat> userSelection =
                showtimeSeatRepository.findByShowtime_ShowtimeIdAndSelectionHeldByUserId(
                        showtimeId,
                        user.getUserId());
        if (userSelection.isEmpty()) {
            return;
        }

        List<ShowtimeSeat> lockedSeats = lockAndRefreshSeats(
                userSelection.stream().map(ShowtimeSeat::getShowtimeSeatId).toList());
        List<ShowtimeSeat> releasedSeats = new ArrayList<>();
        List<ShowtimeSeat> seatsToSave = new ArrayList<>();

        for (ShowtimeSeat seat : lockedSeats) {
            if (!user.getUserId().equals(seat.getSelectionHeldByUserId())) {
                continue;
            }
            if (seat.getStatus() == ShowtimeSeatStatus.HOLDING) {
                seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
                releasedSeats.add(seat);
            }
            clearSelectionHold(seat);
            seatsToSave.add(seat);
        }

        if (!seatsToSave.isEmpty()) {
            showtimeSeatRepository.saveAll(seatsToSave);
        }
        if (!releasedSeats.isEmpty()) {
            seatRealtimeService.publishSeatStatusChangeAfterCommit(showtimeId, releasedSeats);
        }
    }

    @Transactional
    public SeatSelectionHoldResponse updateSelection(SeatSelectionHoldRequest request) {
        validateRequest(request);
        User user = getCurrentUser();
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        if (!request.getShowtimeSeatIds().isEmpty()) {
            validateShowtimeForSelection(showtime);
        }

        List<Long> requestedIds = new ArrayList<>(new LinkedHashSet<>(request.getShowtimeSeatIds()));
        if (requestedIds.size() != request.getShowtimeSeatIds().size()) {
            throw new AppException(ErrorCode.INVALID_SEAT_SELECTION, "Danh sách ghế đang chọn bị trùng.");
        }

        List<ShowtimeSeat> existingSelection =
                showtimeSeatRepository.findByShowtime_ShowtimeIdAndSelectionHeldByUserIdAndSelectionHoldToken(
                        showtime.getShowtimeId(),
                        user.getUserId(),
                        request.getClientToken());
        Set<Long> idsToLock = new LinkedHashSet<>(requestedIds);
        existingSelection.stream()
                .map(ShowtimeSeat::getShowtimeSeatId)
                .forEach(idsToLock::add);

        List<ShowtimeSeat> lockedSeats = idsToLock.isEmpty()
                ? List.of()
                : lockAndRefreshSeats(idsToLock);
        Map<Long, ShowtimeSeat> seatsById = lockedSeats.stream()
                .collect(Collectors.toMap(ShowtimeSeat::getShowtimeSeatId, Function.identity()));
        if (requestedIds.stream().anyMatch(id -> !seatsById.containsKey(id))) {
            throw new AppException(ErrorCode.INVALID_SEAT_SELECTION, "Một số ghế không tồn tại.");
        }

        Set<Long> requestedIdSet = Set.copyOf(requestedIds);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime activeSelectionExpiresAt = lockedSeats.stream()
                .filter(seat -> seat.getStatus() == ShowtimeSeatStatus.HOLDING)
                .filter(seat -> user.getUserId().equals(seat.getSelectionHeldByUserId()))
                .filter(seat -> request.getClientToken().equals(seat.getSelectionHoldToken()))
                .map(ShowtimeSeat::getSelectionHoldExpiresAt)
                .filter(java.util.Objects::nonNull)
                .filter(expiration -> expiration.isAfter(now))
                .min(LocalDateTime::compareTo)
                .orElse(null);
        LocalDateTime expiresAt = requestedIds.isEmpty()
                ? null
                : activeSelectionExpiresAt != null
                        ? activeSelectionExpiresAt
                        : now.plusSeconds(Math.max(30, holdDurationSeconds));
        List<ShowtimeSeat> changedSeats = new ArrayList<>();
        List<ShowtimeSeat> seatsToSave = new ArrayList<>();

        for (ShowtimeSeat seat : lockedSeats) {
            boolean requested = requestedIdSet.contains(seat.getShowtimeSeatId());
            boolean ownedByCurrentSelection =
                    user.getUserId().equals(seat.getSelectionHeldByUserId())
                    && request.getClientToken().equals(seat.getSelectionHoldToken());

            if (!requested) {
                if (ownedByCurrentSelection) {
                    if (seat.getStatus() == ShowtimeSeatStatus.HOLDING) {
                        seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
                        changedSeats.add(seat);
                    }
                    clearSelectionHold(seat);
                    seatsToSave.add(seat);
                }
                continue;
            }

            validateSeatBelongsToShowtime(showtime, seat);
            if (seat.getSeat() == null || seat.getSeat().getStatus() != SeatStatus.ACTIVE) {
                throw new AppException(
                        ErrorCode.INVALID_SEAT_SELECTION,
                        "Ghế " + seatLabel(seat) + " hiện không khả dụng.");
            }
            if (seat.getStatus() == ShowtimeSeatStatus.BOOKED) {
                throw new AppException(
                        ErrorCode.INVALID_SEAT_SELECTION,
                        "Ghế " + seatLabel(seat) + " đã được bán.");
            }

            boolean expiredSelectionHold = seat.getSelectionHoldExpiresAt() != null
                    && !seat.getSelectionHoldExpiresAt().isAfter(now);
            boolean canAcquire = seat.getStatus() == ShowtimeSeatStatus.AVAILABLE
                    || ownedByCurrentSelection
                    || (seat.getStatus() == ShowtimeSeatStatus.HOLDING
                        && seat.getSelectionHeldByUserId() != null
                        && expiredSelectionHold);
            if (!canAcquire) {
                throw new AppException(
                        ErrorCode.INVALID_SEAT_SELECTION,
                        "Ghế " + seatLabel(seat) + " vừa được khách khác chọn. Vui lòng chọn ghế khác.");
            }

            boolean realtimeIdentityChanged = seat.getStatus() != ShowtimeSeatStatus.HOLDING
                    || !request.getClientToken().equals(seat.getSelectionHoldToken());
            seat.setStatus(ShowtimeSeatStatus.HOLDING);
            seat.setSelectionHeldByUserId(user.getUserId());
            seat.setSelectionHoldToken(request.getClientToken());
            seat.setSelectionHoldExpiresAt(expiresAt);
            seatsToSave.add(seat);
            if (realtimeIdentityChanged) {
                changedSeats.add(seat);
            }
        }

        if (!seatsToSave.isEmpty()) {
            showtimeSeatRepository.saveAll(seatsToSave);
        }
        if (!changedSeats.isEmpty()) {
            seatRealtimeService.publishSeatStatusChangeAfterCommit(showtime.getShowtimeId(), changedSeats);
        }

        return SeatSelectionHoldResponse.builder()
                .showtimeId(showtime.getShowtimeId())
                .showtimeSeatIds(requestedIds)
                .clientToken(request.getClientToken())
                .expiresAt(expiresAt)
                .build();
    }

    @Scheduled(fixedDelayString = "${seat-selection.cleanup-delay-ms:15000}")
    @Transactional
    public void releaseExpiredSelectionHolds() {
        LocalDateTime now = LocalDateTime.now();
        List<ShowtimeSeat> expiredCandidates = showtimeSeatRepository.findExpiredSelectionHolds(now);
        if (expiredCandidates.isEmpty()) {
            return;
        }

        List<ShowtimeSeat> lockedSeats = lockAndRefreshSeats(
                expiredCandidates.stream().map(ShowtimeSeat::getShowtimeSeatId).toList());
        List<ShowtimeSeat> releasedSeats = lockedSeats.stream()
                .filter(seat -> seat.getStatus() == ShowtimeSeatStatus.HOLDING)
                .filter(seat -> seat.getSelectionHeldByUserId() != null)
                .filter(seat -> seat.getSelectionHoldExpiresAt() != null)
                .filter(seat -> !seat.getSelectionHoldExpiresAt().isAfter(now))
                .peek(seat -> {
                    seat.setStatus(ShowtimeSeatStatus.AVAILABLE);
                    clearSelectionHold(seat);
                })
                .toList();
        if (releasedSeats.isEmpty()) {
            return;
        }

        showtimeSeatRepository.saveAll(releasedSeats);
        releasedSeats.stream()
                .filter(seat -> seat.getShowtime() != null)
                .collect(Collectors.groupingBy(seat -> seat.getShowtime().getShowtimeId()))
                .forEach((showtimeId, seats) ->
                        seatRealtimeService.publishSeatStatusChangeAfterCommit(showtimeId, seats));
        log.debug("Released {} expired seat selection holds", releasedSeats.size());
    }

    private void validateRequest(SeatSelectionHoldRequest request) {
        if (request == null
                || request.getShowtimeId() == null
                || request.getShowtimeSeatIds() == null
                || request.getClientToken() == null
                || request.getClientToken().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin giữ ghế không hợp lệ.");
        }
        if (request.getShowtimeSeatIds().size() > MAX_SEATS_PER_SELECTION) {
            throw new AppException(ErrorCode.INVALID_SEAT_QUANTITY);
        }
        if (request.getShowtimeSeatIds().stream().anyMatch(java.util.Objects::isNull)
                || request.getClientToken().length() > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin giữ ghế không hợp lệ.");
        }
    }

    private List<ShowtimeSeat> lockAndRefreshSeats(Collection<Long> ids) {
        List<ShowtimeSeat> seats = showtimeSeatRepository.findAllByIdForUpdate(ids);
        // Ghế có thể đã nằm trong persistence context trước khi chờ khoá.
        // Đọc lại để không ghi đè trạng thái vừa được booking hoặc phiên khác cập nhật.
        seats.forEach(entityManager::refresh);
        return seats;
    }

    private void validateShowtimeForSelection(Showtime showtime) {
        if (showtime.getStatus() == ShowtimeStatus.CANCELLED
                || showtime.getStatus() == ShowtimeStatus.COMPLETED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không còn nhận đặt vé.");
        }
        if (showtime.getMovie() == null
                || showtime.getMovie().getStatus() == MovieStatus.INACTIVE
                || showtime.getMovie().getStatus() == MovieStatus.ENDED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phim không còn nhận đặt vé.");
        }
        if (showtime.getCinemaRoom() == null || showtime.getCinemaRoom().getStatus() != RoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phòng chiếu không hoạt động.");
        }
        if (showtime.getShowDate() == null || showtime.getStartTime() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không hợp lệ.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = LocalDateTime.of(showtime.getShowDate(), showtime.getStartTime());
        if (!startsAt.isAfter(now)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu đã bắt đầu hoặc đã kết thúc.");
        }
        if (now.isBefore(startsAt.minusDays(EARLY_BOOKING_WINDOW_DAYS))) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Suất chiếu chỉ mở đặt vé trước giờ chiếu tối đa 7 ngày.");
        }
    }

    private void validateSeatBelongsToShowtime(Showtime showtime, ShowtimeSeat seat) {
        if (seat.getShowtime() == null
                || !showtime.getShowtimeId().equals(seat.getShowtime().getShowtimeId())) {
            throw new AppException(ErrorCode.INVALID_SEAT_SELECTION, "Ghế không thuộc suất chiếu này.");
        }
    }

    private SeatSelectionHoldResponse response(Long showtimeId, List<ShowtimeSeat> seats) {
        List<ShowtimeSeat> sortedSeats = seats.stream()
                .sorted(Comparator.comparing(ShowtimeSeat::getShowtimeSeatId))
                .toList();
        return SeatSelectionHoldResponse.builder()
                .showtimeId(showtimeId)
                .showtimeSeatIds(sortedSeats.stream().map(ShowtimeSeat::getShowtimeSeatId).toList())
                .clientToken(sortedSeats.isEmpty() ? null : sortedSeats.get(0).getSelectionHoldToken())
                .expiresAt(sortedSeats.stream()
                        .map(ShowtimeSeat::getSelectionHoldExpiresAt)
                        .filter(java.util.Objects::nonNull)
                        .min(LocalDateTime::compareTo)
                        .orElse(null))
                .build();
    }

    private SeatSelectionHoldResponse emptyResponse(Long showtimeId) {
        return SeatSelectionHoldResponse.builder()
                .showtimeId(showtimeId)
                .showtimeSeatIds(List.of())
                .build();
    }

    private void clearSelectionHold(ShowtimeSeat seat) {
        seat.setSelectionHeldByUserId(null);
        seat.setSelectionHoldToken(null);
        seat.setSelectionHoldExpiresAt(null);
    }

    private String seatLabel(ShowtimeSeat seat) {
        return seat.getSeat() == null || seat.getSeat().getSeatCode() == null
                ? String.valueOf(seat.getShowtimeSeatId())
                : seat.getSeat().getSeatCode();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}
