package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
public class BookingSchemaMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    ApplicationRunner removeObsoleteTicketSeatConstraint() {
        return args -> {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS ticket DROP CONSTRAINT IF EXISTS uk_ticket_showtime_seat");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS booking ADD COLUMN IF NOT EXISTS booking_channel VARCHAR(20)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS booking ADD COLUMN IF NOT EXISTS sold_by_user_id VARCHAR(36)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS booking ADD COLUMN IF NOT EXISTS counter_customer_type VARCHAR(20)");
            jdbcTemplate.update("UPDATE booking SET booking_channel = 'ONLINE' WHERE booking_channel IS NULL");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS booking ALTER COLUMN booking_channel SET DEFAULT 'ONLINE'");
        };
    }
}
