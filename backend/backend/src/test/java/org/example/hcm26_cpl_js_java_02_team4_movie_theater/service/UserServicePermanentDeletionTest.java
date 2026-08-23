package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.UserMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PasswordResetTokenRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ReviewRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.StaffGoogleSheetProcessedRowRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServicePermanentDeletionTest {

    private static final String USER_ID = "staff-user-id";

    @Mock
    UserRepository userRepository;
    @Mock
    UserProfileRepository userProfileRepository;
    @Mock
    RoleRepository roleRepository;
    @Mock
    PasswordEncoder passwordEncoder;
    @Mock
    UserMapper userMapper;
    @Mock
    CloudinaryService cloudinaryService;
    @Mock
    EmailService emailService;
    @Mock
    StaffGoogleSheetProcessedRowRepository processedRowRepository;
    @Mock
    DashboardNotificationService notificationService;
    @Mock
    BookingRepository bookingRepository;
    @Mock
    ReviewRepository reviewRepository;
    @Mock
    PasswordResetTokenRepository passwordResetTokenRepository;

    @InjectMocks
    UserService userService;

    @Test
    void permanentlyDeletesDeactivatedStaffWithoutBusinessHistory() {
        User user = staffUser(UserStatus.DELETED);
        UserProfile profile = UserProfile.builder().userId(USER_ID).fullName("Nhân viên A").build();

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));
        when(passwordResetTokenRepository.findByUser(user)).thenReturn(Optional.empty());

        userService.permanentlyDeleteStaffUser(USER_ID);

        verify(passwordResetTokenRepository).flush();
        verify(userProfileRepository).delete(profile);
        verify(userProfileRepository).flush();
        verify(userRepository).delete(user);
        verify(userRepository).flush();
    }

    @Test
    void rejectsPermanentDeletionUntilStaffIsDeactivated() {
        User user = staffUser(UserStatus.INACTIVE);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        AppException exception = assertThrows(
                AppException.class,
                () -> userService.permanentlyDeleteStaffUser(USER_ID));

        assertEquals(
                "Nhân viên phải được vô hiệu hóa trước khi xóa vĩnh viễn.",
                exception.getCustomMessage());
        verify(userRepository, never()).delete(user);
    }

    @Test
    void blocksPermanentDeletionWhenBusinessHistoryExists() {
        User user = staffUser(UserStatus.DELETED);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(bookingRepository.existsByUser_UserId(USER_ID)).thenReturn(true);

        AppException exception = assertThrows(
                AppException.class,
                () -> userService.permanentlyDeleteStaffUser(USER_ID));

        assertEquals(
                "Không thể xóa vĩnh viễn nhân viên vì tài khoản còn lịch sử đặt vé hoặc đánh giá cần được lưu.",
                exception.getCustomMessage());
        verify(userRepository, never()).delete(user);
    }

    private User staffUser(UserStatus status) {
        Role role = new Role();
        role.setRoleName("STAFF");
        return User.builder()
                .userId(USER_ID)
                .username("staff-a")
                .status(status)
                .roles(Set.of(role))
                .build();
    }
}
