package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class LoginAttemptService {

    public static final int MAX_ATTEMPTS = 5;
    public static final long LOCKOUT_DURATION_MINUTES = 15;

    private static class AttemptInfo {
        int failedCount;
        Instant lockoutUntil;
        Instant lastAttemptTime;

        AttemptInfo() {
            this.failedCount = 0;
            this.lockoutUntil = null;
            this.lastAttemptTime = Instant.now();
        }
    }

    private final Map<String, AttemptInfo> attemptsCache = new ConcurrentHashMap<>();

    private String normalizeKey(String key) {
        return key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Gọi khi đăng nhập thành công để xóa bộ đếm vi phạm.
     */
    public void loginSucceeded(String key) {
        String normalized = normalizeKey(key);
        if (!normalized.isBlank()) {
            attemptsCache.remove(normalized);
        }
    }

    /**
     * Ghi nhận 1 lần đăng nhập sai.
     * @return true nếu tài khoản vừa bị khóa do chạm mốc MAX_ATTEMPTS, false nếu chưa bị khóa.
     */
    public boolean loginFailed(String key) {
        String normalized = normalizeKey(key);
        if (normalized.isBlank()) {
            return false;
        }

        AttemptInfo info = attemptsCache.computeIfAbsent(normalized, k -> new AttemptInfo());
        synchronized (info) {
            info.lastAttemptTime = Instant.now();
            // Nếu đã bị khóa và chưa hết hạn, giữ nguyên trạng thái khóa
            if (info.lockoutUntil != null && Instant.now().isBefore(info.lockoutUntil)) {
                return true;
            }

            // Nếu khóa cũ đã hết hạn thì reset lại số lần
            if (info.lockoutUntil != null && Instant.now().isAfter(info.lockoutUntil)) {
                info.failedCount = 0;
                info.lockoutUntil = null;
            }

            info.failedCount++;
            if (info.failedCount >= MAX_ATTEMPTS) {
                info.lockoutUntil = Instant.now().plus(Duration.ofMinutes(LOCKOUT_DURATION_MINUTES));
                log.warn("Định danh '{}' đã nhập sai mật khẩu {} lần. Tạm khóa trong {} phút.",
                        normalized, info.failedCount, LOCKOUT_DURATION_MINUTES);
                return true;
            }
            return false;
        }
    }

    /**
     * Kiểm tra xem định danh có đang bị khóa hay không.
     */
    public boolean isBlocked(String key) {
        String normalized = normalizeKey(key);
        if (normalized.isBlank()) {
            return false;
        }

        AttemptInfo info = attemptsCache.get(normalized);
        if (info == null || info.lockoutUntil == null) {
            return false;
        }

        if (Instant.now().isBefore(info.lockoutUntil)) {
            return true;
        }

        // Đã hết thời gian khóa
        attemptsCache.remove(normalized);
        return false;
    }

    /**
     * Lấy số phút còn lại bị khóa.
     */
    public long getRemainingLockoutMinutes(String key) {
        String normalized = normalizeKey(key);
        AttemptInfo info = attemptsCache.get(normalized);
        if (info == null || info.lockoutUntil == null) {
            return 0;
        }

        Duration remaining = Duration.between(Instant.now(), info.lockoutUntil);
        long minutes = remaining.toMinutes();
        return minutes > 0 ? minutes : (remaining.getSeconds() > 0 ? 1 : 0);
    }

    /**
     * Lấy số lần thử còn lại trước khi bị khóa.
     */
    public int getRemainingAttempts(String key) {
        String normalized = normalizeKey(key);
        AttemptInfo info = attemptsCache.get(normalized);
        if (info == null) {
            return MAX_ATTEMPTS;
        }
        int remaining = MAX_ATTEMPTS - info.failedCount;
        return Math.max(remaining, 0);
    }

    /**
     * Định kỳ dọn dẹp các mục cũ không còn hoạt động để giải phóng bộ nhớ.
     * Chạy mỗi 30 phút.
     */
    @Scheduled(fixedRate = 1800000)
    public void cleanupOldAttempts() {
        Instant threshold = Instant.now().minus(Duration.ofHours(1));
        attemptsCache.entrySet().removeIf(entry -> {
            AttemptInfo info = entry.getValue();
            return (info.lockoutUntil == null || Instant.now().isAfter(info.lockoutUntil))
                    && info.lastAttemptTime.isBefore(threshold);
        });
    }
}
