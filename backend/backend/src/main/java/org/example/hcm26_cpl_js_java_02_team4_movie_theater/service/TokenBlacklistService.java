package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.nimbusds.jwt.SignedJWT;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class TokenBlacklistService {

    // Key: JWT ID (jti) hoặc chuỗi token, Value: thời điểm hết hạn (Instant)
    private final Map<String, Instant> blacklist = new ConcurrentHashMap<>();

    // Key: username, Value: thời điểm đổi mật khẩu/thu hồi toàn bộ (Instant)
    // Các token cấp trước thời điểm này sẽ bị coi là đã hết hiệu lực
    private final Map<String, Instant> userRevocationCutoff = new ConcurrentHashMap<>();

    /**
     * Thu hồi toàn bộ token hiện có của người dùng (khi đổi mật khẩu hoặc reset mật khẩu).
     */
    public void revokeAllTokensForUser(String username) {
        if (username != null && !username.isBlank()) {
            userRevocationCutoff.put(username.trim().toLowerCase(java.util.Locale.ROOT), Instant.now());
            log.info("Đã thu hồi toàn bộ token trước thời điểm hiện tại của user: {}", username);
        }
    }

    /**
     * Kiểm tra xem token của người dùng có được phát hành trước thời điểm thu hồi hay không.
     */
    public boolean isUserTokenRevoked(String username, Instant issuedAt) {
        if (username == null || username.isBlank() || issuedAt == null) {
            return false;
        }
        Instant cutoff = userRevocationCutoff.get(username.trim().toLowerCase(java.util.Locale.ROOT));
        if (cutoff == null) {
            return false;
        }
        // Nếu token được cấp phát trước thời điểm cutoff thì bị coi là đã thu hồi
        return issuedAt.isBefore(cutoff);
    }

    /**
     * Đưa token vào danh sách đen khi người dùng đăng xuất.
     */
    public void blacklistToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            Date exp = signedJWT.getJWTClaimsSet().getExpirationTime();
            String jti = signedJWT.getJWTClaimsSet().getJWTID();

            Instant expiry = exp != null ? exp.toInstant() : Instant.now().plusSeconds(86400);

            // Nếu đã có jti thì lưu theo jti (tiết kiệm bộ nhớ), đồng thời lưu token rút gọn
            if (jti != null && !jti.isBlank()) {
                blacklist.put(jti, expiry);
            }
            blacklist.put(token, expiry);

            log.info("Token đã được đưa vào blacklist thành công. JTI: {}, Expiry: {}", jti, expiry);
        } catch (Exception e) {
            log.warn("Không thể parse token để blacklist, lưu chuỗi token thô: {}", e.getMessage());
            blacklist.put(token, Instant.now().plusSeconds(86400));
        }
    }

    /**
     * Kiểm tra xem token hoặc jti có nằm trong danh sách đen hay không.
     */
    public boolean isBlacklisted(String tokenOrJti) {
        if (tokenOrJti == null || tokenOrJti.isBlank()) {
            return false;
        }

        Instant expiry = blacklist.get(tokenOrJti);
        if (expiry == null) {
            return false;
        }

        if (Instant.now().isAfter(expiry)) {
            blacklist.remove(tokenOrJti);
            return false;
        }

        return true;
    }

    /**
     * Kiểm tra nhanh cả tokenValue lẫn jti.
     */
    public boolean isRevoked(String tokenValue, String jti) {
        if (jti != null && isBlacklisted(jti)) {
            return true;
        }
        return tokenValue != null && isBlacklisted(tokenValue);
    }

    /**
     * Định kỳ dọn dẹp các token đã hết hạn khỏi blacklist để giải phóng RAM.
     * Chạy mỗi 30 phút một lần.
     */
    @Scheduled(fixedRate = 1800000)
    public void cleanupExpiredTokens() {
        Instant now = Instant.now();
        int initialSize = blacklist.size();
        blacklist.entrySet().removeIf(entry -> now.isAfter(entry.getValue()));
        int removedCount = initialSize - blacklist.size();
        if (removedCount > 0) {
            log.info("Dọn dẹp blacklist: Đã xóa {} token đã hết hạn tự nhiên khỏi bộ nhớ.", removedCount);
        }
    }
}
