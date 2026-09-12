package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService();
    }

    @Test
    void allowsUpToFourFailedAttemptsWithoutBlocking() {
        String key = "testuser";

        for (int i = 1; i <= 4; i++) {
            boolean justBlocked = loginAttemptService.loginFailed(key);
            assertFalse(justBlocked, "Lần thứ " + i + " không được coi là vừa bị khóa");
            assertFalse(loginAttemptService.isBlocked(key), "Lần thứ " + i + " chưa bị khóa");
        }

        assertEquals(1, loginAttemptService.getRemainingAttempts(key));
    }

    @Test
    void blocksAccountOnFifthFailedAttempt() {
        String key = "testuser";

        for (int i = 1; i <= 4; i++) {
            loginAttemptService.loginFailed(key);
        }

        boolean justBlocked = loginAttemptService.loginFailed(key);
        assertTrue(justBlocked, "Lần thứ 5 phải trả về vừa bị khóa");
        assertTrue(loginAttemptService.isBlocked(key), "Tài khoản phải ở trạng thái bị khóa");
        assertEquals(0, loginAttemptService.getRemainingAttempts(key));
        assertTrue(loginAttemptService.getRemainingLockoutMinutes(key) > 0);
    }

    @Test
    void loginSucceededClearsLockoutAndAttempts() {
        String key = "testuser";

        for (int i = 1; i <= 5; i++) {
            loginAttemptService.loginFailed(key);
        }
        assertTrue(loginAttemptService.isBlocked(key));

        loginAttemptService.loginSucceeded(key);

        assertFalse(loginAttemptService.isBlocked(key));
        assertEquals(LoginAttemptService.MAX_ATTEMPTS, loginAttemptService.getRemainingAttempts(key));
    }

    @Test
    void caseInsensitiveAndTrimHandledCorrectly() {
        String key = "  User@Example.com  ";

        for (int i = 1; i <= 5; i++) {
            loginAttemptService.loginFailed(key);
        }

        assertTrue(loginAttemptService.isBlocked("user@example.com"));
        assertTrue(loginAttemptService.isBlocked("USER@EXAMPLE.COM"));

        loginAttemptService.loginSucceeded("user@example.com");
        assertFalse(loginAttemptService.isBlocked(key));
    }
}
