package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class PostgresSearchConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    ApplicationRunner enableUnaccentExtension() {
        return args -> {
            try {
                jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS unaccent");
            } catch (Exception ex) {
                log.warn("Could not enable PostgreSQL unaccent extension. Accent-insensitive movie search requires it.", ex);
            }
        };
    }
}
