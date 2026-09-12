package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.AuthenticationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.RegisterRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.ResendOtpRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.VerifyOtpRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.AuthenticationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.UserMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Locale;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {

    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    EmailService emailService;
    OtpStore otpStore;

    private static final String DEFAULT_USER_ROLE = "CUSTOMER";
    private static final long OTP_TTL_SECONDS = 300;
    private static final long COOLDOWN_TTL_SECONDS = 60;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public void initiateRegistration(RegisterRequest request) {
        String emailKey = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(emailKey)) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                && userProfileRepository.existsByPhoneNumber(request.getPhoneNumber().trim())) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        if (request.getIdentityCard() != null && !request.getIdentityCard().isBlank()
                && userProfileRepository.existsByIdentityCard(request.getIdentityCard().trim())) {
            throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
        }

        String otp = generateOtp();
        otpStore.save(emailKey, otp, OTP_TTL_SECONDS);
        emailService.sendOtpEmail(emailKey, otp);
        log.info("OTP sent to email: {}", emailKey);
    }

    public void checkRegistrationStep1(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(email.trim().toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
    }

    public void resendOtp(ResendOtpRequest request) {
        String emailKey = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(emailKey)) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        String cooldownKey = "cooldown:" + emailKey;
        if (otpStore.hasKey(cooldownKey)) {
            throw new AppException(ErrorCode.RESEND_OTP_TOO_FAST);
        }

        String newOtp = generateOtp();
        otpStore.save(emailKey, newOtp, OTP_TTL_SECONDS);
        otpStore.save(cooldownKey, "locked", COOLDOWN_TTL_SECONDS);

        emailService.sendOtpEmail(emailKey, newOtp);
        log.info("OTP resent to email: {}", emailKey);
    }

    @Transactional
    public UserResponse verifyOtpAndRegister(VerifyOtpRequest request) {
        RegisterRequest registerRequest = request.getRegisterRequest();
        String emailKey = registerRequest.getEmail().trim().toLowerCase(Locale.ROOT);
        String inputOtp = request.getOtp() != null ? request.getOtp().trim() : "";

        OtpStore.ConsumeResult otpResult = otpStore.consume(emailKey, inputOtp);
        if (otpResult == OtpStore.ConsumeResult.EXPIRED) {
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }
        if (otpResult == OtpStore.ConsumeResult.INVALID) {
            throw new AppException(ErrorCode.OTP_INVALID);
        }

        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(emailKey)) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (userProfileRepository.existsByPhoneNumber(registerRequest.getPhoneNumber().trim())) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        String identityCard = registerRequest.getIdentityCard() == null
                ? null : registerRequest.getIdentityCard().trim();
        if (identityCard != null && !identityCard.isBlank()
                && userProfileRepository.existsByIdentityCard(identityCard)) {
            throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
        }

        User user = userMapper.toUser(registerRequest);
        user.setEmail(emailKey);
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setStatus(UserStatus.ACTIVE);

        Role userRole = roleRepository.findByRoleName(DEFAULT_USER_ROLE)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        HashSet<Role> roles = new HashSet<>();
        roles.add(userRole);
        user.setRoles(roles);

        user = userRepository.saveAndFlush(user);

        UserProfile userProfile = UserProfile.builder()
                .userId(user.getUserId())
                .fullName(registerRequest.getFullName())
                .phoneNumber(registerRequest.getPhoneNumber().trim())
                .dateOfBirth(registerRequest.getDateOfBirth())
                .dateOfBirthUpdatedAt(registerRequest.getDateOfBirth() == null ? null : LocalDateTime.now())
                .gender(registerRequest.getGender())
                .address(registerRequest.getAddress())
                .identityCard(identityCard == null || identityCard.isBlank() ? null : identityCard)
                .email(emailKey)
                .isActive(true)
                .loyaltyPoints(0)
                .build();

        userProfileRepository.save(userProfile);
        log.info("User registered successfully: {}", user.getUsername());

        return userMapper.toUserResponse(user);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }

        if (user.getStatus() == null || user.getStatus() == UserStatus.DELETED) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new AppException(ErrorCode.USER_LOCKED);
        }

        if (user.getStatus() == UserStatus.BANNED) {
            throw new AppException(ErrorCode.USER_LOCKED);
        }

        String token = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .token(token)
                .isAuthenticated(true)
                .build();
    }

    private String generateOtp() {
        return String.format(Locale.ROOT, "%06d", SECURE_RANDOM.nextInt(1_000_000));
    }
}
