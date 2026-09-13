package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.ZoneId;

/**
 * Applies account state to every bearer token, including tokens issued before a
 * role/status/password change. This keeps authorization correct after a restart,
 * where the in-memory token blacklist is empty.
 */
@Component
@RequiredArgsConstructor
public class AccountTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error ACCOUNT_INVALID = new OAuth2Error(
            "account_invalid",
            "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.",
            null);
    private static final OAuth2Error TOKEN_STALE = new OAuth2Error(
            "token_stale",
            "Token không còn hiệu lực sau khi thông tin bảo mật tài khoản thay đổi.",
            null);

    private final UserRepository userRepository;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            return OAuth2TokenValidatorResult.failure(ACCOUNT_INVALID);
        }

        User user = userRepository.findByUsername(jwt.getSubject()).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return OAuth2TokenValidatorResult.failure(ACCOUNT_INVALID);
        }

        if (user.getPasswordChangedAt() != null && jwt.getIssuedAt() != null) {
            var changedAt = user.getPasswordChangedAt()
                    .atZone(ZoneId.systemDefault())
                    .toInstant();
            if (jwt.getIssuedAt().isBefore(changedAt)) {
                return OAuth2TokenValidatorResult.failure(TOKEN_STALE);
            }
        }

        return OAuth2TokenValidatorResult.success();
    }
}
