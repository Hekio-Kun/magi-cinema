package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaRoomEditGuard {

    private static final Set<BookingStatus> LOCKING_BOOKING_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.SUCCESS);

    private static final Set<ShowtimeStatus> LOCKING_SHOWTIME_STATUSES = Set.of(
            ShowtimeStatus.SCHEDULED,
            ShowtimeStatus.ONGOING);

    BookingRepository bookingRepository;
    ShowtimeRepository showtimeRepository;

    public void ensureEditable(Long cinemaRoomId) {
        if (bookingRepository.existsActiveBookingByCinemaRoomId(
                cinemaRoomId,
                LOCKING_BOOKING_STATUSES,
                LOCKING_SHOWTIME_STATUSES)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đã có người đặt ghế ở suất chiếu còn hiệu lực, không thể chỉnh sửa cấu hình phòng.");
        }

        if (showtimeRepository.existsLockingShowtimeByCinemaRoomId(cinemaRoomId, LOCKING_SHOWTIME_STATUSES)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đang được gán vào suất chiếu, không thể chỉnh sửa cấu hình phòng.");
        }
    }

    public void ensureCanDeactivate(Long cinemaRoomId) {
        if (bookingRepository.existsActiveBookingByCinemaRoomId(
                cinemaRoomId,
                LOCKING_BOOKING_STATUSES,
                LOCKING_SHOWTIME_STATUSES)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đã có người đặt ghế ở suất chiếu còn hiệu lực, không thể vô hiệu hóa hoặc chuyển bảo trì.");
        }

        if (showtimeRepository.existsLockingShowtimeByCinemaRoomId(cinemaRoomId, LOCKING_SHOWTIME_STATUSES)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phòng chiếu đang có suất chiếu còn hiệu lực, không thể vô hiệu hóa hoặc chuyển bảo trì.");
        }
    }
}
