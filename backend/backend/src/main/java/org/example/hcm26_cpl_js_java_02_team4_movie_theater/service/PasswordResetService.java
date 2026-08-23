package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.NonFinal;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PasswordResetToken;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PasswordResetTokenRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PasswordResetService {

    UserRepository userRepository;
    PasswordResetTokenRepository passwordResetTokenRepository;
    EmailService emailService;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${app.security.reset-token.expiration-minutes:10}")
    int resetTokenExpirationMinutes;

    @Transactional
    public void handleForgotPassword(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email.trim().toLowerCase());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // Generate a 6-digit OTP
            String token = String.format("%06d", new java.util.Random().nextInt(1000000));
            PasswordResetToken resetToken = passwordResetTokenRepository.findByUser(user).orElseGet(PasswordResetToken::new);
            resetToken.setToken(token);
            resetToken.setUser(user);
            resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(resetTokenExpirationMinutes));
            passwordResetTokenRepository.save(resetToken);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
            log.info("Password reset token generated for user: {}", user.getUsername());
        } else {
            log.warn("Password reset requested for non-existent email: {}", email);
        }
    }

    @Transactional
    public void handleResetPassword(String email, String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenAndUser_EmailIgnoreCase(token.trim(), email.trim())
                .orElseThrow(() -> new AppException(ErrorCode.RESET_TOKEN_INVALID));
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.delete(resetToken);
            throw new AppException(ErrorCode.RESET_TOKEN_EXPIRED);
        }
        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        log.info("Password has been reset successfully for user: {}", user.getUsername());
    }
}