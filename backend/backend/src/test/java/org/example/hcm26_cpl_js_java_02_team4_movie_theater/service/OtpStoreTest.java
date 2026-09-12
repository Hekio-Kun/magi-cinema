package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class OtpStoreTest {
    private final OtpStore store = new OtpStore(
            Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), ZoneOffset.UTC));

    @Test
    void incorrectCodeDoesNotConsumeValidOtp() {
        store.save("member@example.com", "123456", 300);

        assertEquals(OtpStore.ConsumeResult.INVALID, store.consume("member@example.com", "000000"));
        assertEquals(OtpStore.ConsumeResult.VERIFIED, store.consume("member@example.com", "123456"));
        assertEquals(OtpStore.ConsumeResult.EXPIRED, store.consume("member@example.com", "123456"));
    }

    @Test
    void otpIsExpiredAtItsExactExpiryTime() {
        store.save("member@example.com", "123456", 0);

        assertNull(store.get("member@example.com"));
        assertEquals(OtpStore.ConsumeResult.EXPIRED, store.consume("member@example.com", "123456"));
    }

    @Test
    void cleanupPreservesUnexpiredOtp() {
        store.save("expired", "123456", -1);
        store.save("active", "654321", 300);

        store.removeExpiredEntries();

        assertNull(store.get("expired"));
        assertEquals("654321", store.get("active"));
    }

    @Test
    void concurrentRequestsCanConsumeAnOtpOnlyOnce() throws Exception {
        store.save("member@example.com", "123456", 300);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(8)) {
            List<Future<OtpStore.ConsumeResult>> results = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                results.add(executor.submit(() -> {
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    return store.consume("member@example.com", "123456");
                }));
            }
            start.countDown();
            long verified = 0;
            for (var result : results) {
                if (result.get(5, TimeUnit.SECONDS) == OtpStore.ConsumeResult.VERIFIED) {
                    verified++;
                }
            }
            assertEquals(1, verified);
        }
    }
}
