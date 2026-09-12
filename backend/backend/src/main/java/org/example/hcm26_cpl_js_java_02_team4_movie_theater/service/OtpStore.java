package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class OtpStore {

    public enum ConsumeResult { VERIFIED, INVALID, EXPIRED }

    private record Entry(String otp, Instant expiry) {}

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();
    private final Clock clock;

    public OtpStore() {
        this(Clock.systemUTC());
    }

    OtpStore(Clock clock) {
        this.clock = clock;
    }

    public void save(String key, String otp, long ttlSeconds) {
        store.put(key, new Entry(otp, clock.instant().plusSeconds(ttlSeconds)));
    }

    public String get(String key) {
        Entry entry = store.computeIfPresent(key, (ignored, current) ->
                clock.instant().isBefore(current.expiry()) ? current : null);
        return entry == null ? null : entry.otp();
    }

    /** Kiểm tra và dùng OTP một lần trong cùng thao tác nguyên tử. */
    public ConsumeResult consume(String key, String otp) {
        AtomicReference<ConsumeResult> result = new AtomicReference<>(ConsumeResult.EXPIRED);
        store.computeIfPresent(key, (ignored, entry) -> {
            if (!clock.instant().isBefore(entry.expiry())) {
                return null;
            }
            if (!entry.otp().equals(otp)) {
                result.set(ConsumeResult.INVALID);
                return entry;
            }
            result.set(ConsumeResult.VERIFIED);
            return null;
        });
        return result.get();
    }

    public void delete(String key) {
        store.remove(key);
    }

    public boolean hasKey(String key) {
        return get(key) != null;
    }

    @Scheduled(fixedRate = 300000)
    public void removeExpiredEntries() {
        Instant now = clock.instant();
        store.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiry()));
    }
}
