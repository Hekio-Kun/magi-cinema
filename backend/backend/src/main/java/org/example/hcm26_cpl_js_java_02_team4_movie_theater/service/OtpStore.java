package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class OtpStore {

    private record Entry(String otp, Instant expiry) {}

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();

    public void save(String key, String otp, long ttlSeconds) {
        store.put(key, new Entry(otp, Instant.now().plusSeconds(ttlSeconds)));
    }

    public String get(String key) {
        Entry entry = store.get(key);
        if (entry == null || Instant.now().isAfter(entry.expiry())) {
            store.remove(key);
            return null;
        }
        return entry.otp();
    }

    public void delete(String key) {
        store.remove(key);
    }

    public boolean hasKey(String key) {
        return get(key) != null;
    }

    @Scheduled(fixedRate = 300000)
    public void removeExpiredEntries() {
        Instant now = Instant.now();
        store.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiry()));
    }
}
