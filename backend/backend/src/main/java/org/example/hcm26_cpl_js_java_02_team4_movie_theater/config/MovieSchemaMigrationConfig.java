package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Chuyển dữ liệu từ cờ "phim nổi bật" cũ sang công tắc Hero mới.
 * Hibernate tạo các cột mới trước khi ApplicationRunner này chạy.
 */
@Configuration
@RequiredArgsConstructor
public class MovieSchemaMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    ApplicationRunner migrateMovieHeroColumn() {
        return args -> jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'movie' AND column_name = 'is_featured'
                    ) THEN
                        UPDATE movie
                        SET show_on_hero = TRUE
                        WHERE is_featured = TRUE;

                        ALTER TABLE movie DROP COLUMN is_featured;
                    END IF;

                    UPDATE movie SET show_on_hero = FALSE WHERE show_on_hero IS NULL;
                    UPDATE movie
                    SET show_on_hero = FALSE
                    WHERE status IN ('ENDED', 'INACTIVE');
                END $$;
                """);
    }
}
