package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TokenBlacklistService;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

@RequiredArgsConstructor
public class TokenBlacklistValidator implements OAuth2TokenValidator<Jwt> {

    private final TokenBlacklistService tokenBlacklistService;

    private static final OAuth2Error REVOKED_TOKEN_ERROR = new OAuth2Error(
            "token_revoked",
            "Token đã bị vô hiệu hóa hoặc đã đăng xuất.",
            null
    );

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (tokenBlacklistService == null) {
            return OAuth2TokenValidatorResult.success();
        }

        String jti = jwt.getId();
        String tokenValue = jwt.getTokenValue();

        if (tokenBlacklistService.isRevoked(tokenValue, jti)
                || tokenBlacklistService.isUserTokenRevoked(jwt.getSubject(), jwt.getIssuedAt())) {
            return OAuth2TokenValidatorResult.failure(REVOKED_TOKEN_ERROR);
        }

        return OAuth2TokenValidatorResult.success();
    }
}
