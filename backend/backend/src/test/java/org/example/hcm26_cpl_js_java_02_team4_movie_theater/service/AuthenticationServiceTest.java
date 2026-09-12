package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.RegisterRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.VerifyOtpRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.UserMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
    @Mock UserRepository userRepository;
    @Mock UserProfileRepository userProfileRepository;
    @Mock RoleRepository roleRepository;
    @Mock UserMapper userMapper;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock EmailService emailService;
    @Mock OtpStore otpStore;
    @InjectMocks AuthenticationService authenticationService;

    @Test
    void storesTheSameNormalizedEmailUsedToVerifyOtp() {
        RegisterRequest registration = validRegistration();
        User mappedUser = User.builder().userId("user-id").username("member")
                .email(registration.getEmail()).build();
        when(otpStore.consume("member@example.com", "123456")).thenReturn(OtpStore.ConsumeResult.VERIFIED);
        when(userMapper.toUser(registration)).thenReturn(mappedUser);
        when(roleRepository.findByRoleName("CUSTOMER"))
                .thenReturn(Optional.of(Role.builder().roleName("CUSTOMER").build()));
        when(userRepository.saveAndFlush(mappedUser)).thenReturn(mappedUser);

        authenticationService.verifyOtpAndRegister(new VerifyOtpRequest(registration, "123456"));

        assertEquals("member@example.com", mappedUser.getEmail());
        ArgumentCaptor<UserProfile> profile = ArgumentCaptor.forClass(UserProfile.class);
        verify(userProfileRepository).save(profile.capture());
        assertEquals(mappedUser.getEmail(), profile.getValue().getEmail());
        assertEquals("123456789", profile.getValue().getIdentityCard());
    }

    @Test
    void rechecksIdentityCardAtFinalRegistrationStep() {
        RegisterRequest registration = validRegistration();
        when(otpStore.consume("member@example.com", "123456")).thenReturn(OtpStore.ConsumeResult.VERIFIED);
        when(userProfileRepository.existsByIdentityCard("123456789")).thenReturn(true);

        AppException exception = assertThrows(AppException.class, () ->
                authenticationService.verifyOtpAndRegister(new VerifyOtpRequest(registration, "123456")));

        assertEquals(ErrorCode.IDENTITY_CARD_EXISTED, exception.getErrorCode());
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsAnAlreadyConsumedOtpBeforeCreatingUser() {
        when(otpStore.consume("member@example.com", "123456")).thenReturn(OtpStore.ConsumeResult.EXPIRED);

        AppException exception = assertThrows(AppException.class, () ->
                authenticationService.verifyOtpAndRegister(new VerifyOtpRequest(validRegistration(), "123456")));

        assertEquals(ErrorCode.OTP_EXPIRED, exception.getErrorCode());
        verifyNoInteractions(userRepository, userMapper);
    }

    private RegisterRequest validRegistration() {
        return RegisterRequest.builder().username("member").email("Member@Example.com")
                .password("ValidPassword1!").fullName("Khách hàng").phoneNumber("0912345678")
                .dateOfBirth(LocalDate.of(2000, 1, 1)).identityCard(" 123456789 ").build();
    }
}
