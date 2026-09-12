package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.config.TokenBlacklistValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TokenBlacklistServiceTest {

    private TokenBlacklistService blacklistService;
    private TokenBlacklistValidator blacklistValidator;

    @BeforeEach
    void setUp() {
        blacklistService = new TokenBlacklistService();
        blacklistValidator = new TokenBlacklistValidator(blacklistService);
    }

    @Test
    void unblacklistedTokenReturnsFalseAndValidatesSuccessfully() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getId()).thenReturn("valid-jti-123");
        when(jwt.getTokenValue()).thenReturn("valid.token.value");

        assertFalse(blacklistService.isBlacklisted("valid-jti-123"));
        assertFalse(blacklistService.isBlacklisted("valid.token.value"));

        OAuth2TokenValidatorResult result = blacklistValidator.validate(jwt);
        assertFalse(result.hasErrors());
    }

    @Test
    void blacklistedTokenRejectsValidation() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getId()).thenReturn("revoked-jti-456");
        when(jwt.getTokenValue()).thenReturn("revoked.token.value");

        blacklistService.blacklistToken("revoked.token.value");

        OAuth2TokenValidatorResult result = blacklistValidator.validate(jwt);
        assertTrue(result.hasErrors());
        assertEquals("token_revoked", result.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void userTokensIssuedBeforeRevocationCutoffAreRejected() {
        String username = "customer1";
        Instant beforeRevocation = Instant.now().minusSeconds(60);
        Instant afterRevocation = Instant.now().plusSeconds(60);

        blacklistService.revokeAllTokensForUser(username);

        assertTrue(blacklistService.isUserTokenRevoked(username, beforeRevocation));
        assertFalse(blacklistService.isUserTokenRevoked(username, afterRevocation));

        Jwt oldJwt = mock(Jwt.class);
        when(oldJwt.getSubject()).thenReturn(username);
        when(oldJwt.getIssuedAt()).thenReturn(beforeRevocation);
        when(oldJwt.getId()).thenReturn("old-jti");
        when(oldJwt.getTokenValue()).thenReturn("old.token");

        OAuth2TokenValidatorResult result = blacklistValidator.validate(oldJwt);
        assertTrue(result.hasErrors());
        assertEquals("token_revoked", result.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void nullOrBlankTokensDoNotThrowAndReturnFalse() {
        assertFalse(blacklistService.isBlacklisted(null));
        assertFalse(blacklistService.isBlacklisted("   "));
        assertFalse(blacklistService.isRevoked(null, null));
    }
}
