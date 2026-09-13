package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountTokenValidatorTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AccountTokenValidator validator = new AccountTokenValidator(userRepository);
    private final Jwt jwt = mock(Jwt.class);

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn("staff-a");
        when(userRepository.findByUsername("staff-a")).thenReturn(Optional.of(User.builder()
                .username("staff-a")
                .status(UserStatus.ACTIVE)
                .build()));
    }

    @Test
    void activeAccountWithCurrentTokenPasses() {
        when(jwt.getIssuedAt()).thenReturn(Instant.now());

        assertFalse(validator.validate(jwt).hasErrors());
    }

    @Test
    void inactiveAccountIsRejected() {
        when(userRepository.findByUsername("staff-a")).thenReturn(Optional.of(User.builder()
                .username("staff-a")
                .status(UserStatus.BANNED)
                .build()));

        assertTrue(validator.validate(jwt).hasErrors());
    }

    @Test
    void tokenIssuedBeforeSecurityChangeIsRejected() {
        Instant changedAt = LocalDateTime.now().minusMinutes(1)
                .atZone(ZoneId.systemDefault())
                .toInstant();
        when(userRepository.findByUsername("staff-a")).thenReturn(Optional.of(User.builder()
                .username("staff-a")
                .status(UserStatus.ACTIVE)
                .passwordChangedAt(LocalDateTime.now())
                .build()));
        when(jwt.getIssuedAt()).thenReturn(changedAt);

        assertTrue(validator.validate(jwt).hasErrors());
    }
}
