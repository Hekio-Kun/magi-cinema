package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
public class PromotionSchemaMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    ApplicationRunner migratePromotionSchema() {
        return args -> {
            jdbcTemplate.update("""
                    UPDATE booking
                    SET original_amount = total_amount
                    WHERE original_amount IS NULL
                    """);
            jdbcTemplate.update("""
                    UPDATE booking
                    SET discount_amount = 0
                    WHERE discount_amount IS NULL
                    """);
            jdbcTemplate.update("""
                    UPDATE user_profiles
                    SET date_of_birth_updated_at = created_at
                    WHERE date_of_birth IS NOT NULL
                      AND date_of_birth_updated_at IS NULL
                    """);

            migratePromotionTypeConstraint("promotion", "ck_promotion_type");
            migratePromotionTypeConstraint("promotion_usage", "ck_promotion_usage_type");
            migrateBirthdayUsageHistory();

            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS total_usage_limit_type varchar(20) DEFAULT 'UNLIMITED'
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS per_customer_usage_limit_type varchar(20) DEFAULT 'UNLIMITED'
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS budget_limit integer
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS terms_and_conditions varchar(2000)
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS online_enabled boolean NOT NULL DEFAULT true
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS promotion
                    ADD COLUMN IF NOT EXISTS counter_enabled boolean NOT NULL DEFAULT true
                    """);
            jdbcTemplate.update("""
                    UPDATE promotion
                    SET online_enabled = true,
                        counter_enabled = false
                    WHERE promotion_type = 'E_WALLET'
                    """);

            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_budget_limit");
            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_priority");
            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_channel");
            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_budget_limit CHECK (budget_limit IS NULL OR budget_limit >= 1000)
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_priority CHECK (priority BETWEEN 0 AND 100)
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_channel CHECK (online_enabled OR counter_enabled)
                    """);

            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_total_usage_limit");
            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_customer_usage_limit");
            jdbcTemplate.execute("ALTER TABLE promotion DROP CONSTRAINT IF EXISTS ck_promotion_usage_limit_order");

            jdbcTemplate.update("UPDATE promotion SET total_usage_limit = NULL WHERE total_usage_limit <= 0");
            jdbcTemplate.update("UPDATE promotion SET per_customer_usage_limit = NULL WHERE per_customer_usage_limit <= 0");
            jdbcTemplate.update("""
                    UPDATE promotion
                    SET total_usage_limit_type = CASE
                        WHEN total_usage_limit IS NULL THEN 'UNLIMITED'
                        ELSE 'LIMITED'
                    END,
                    per_customer_usage_limit_type = CASE
                        WHEN per_customer_usage_limit IS NULL THEN 'UNLIMITED'
                        ELSE 'LIMITED'
                    END
                    """);

            jdbcTemplate.execute("ALTER TABLE promotion ALTER COLUMN total_usage_limit_type SET DEFAULT 'UNLIMITED'");
            jdbcTemplate.execute("ALTER TABLE promotion ALTER COLUMN total_usage_limit_type SET NOT NULL");
            jdbcTemplate.execute("ALTER TABLE promotion ALTER COLUMN per_customer_usage_limit_type SET DEFAULT 'UNLIMITED'");
            jdbcTemplate.execute("ALTER TABLE promotion ALTER COLUMN per_customer_usage_limit_type SET NOT NULL");

            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_total_usage_limit CHECK (
                        (total_usage_limit_type = 'UNLIMITED' AND total_usage_limit IS NULL)
                        OR (total_usage_limit_type = 'LIMITED' AND total_usage_limit >= 1)
                    )
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_customer_usage_limit CHECK (
                        (per_customer_usage_limit_type = 'UNLIMITED' AND per_customer_usage_limit IS NULL)
                        OR (per_customer_usage_limit_type = 'LIMITED' AND per_customer_usage_limit >= 1)
                    )
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE promotion
                    ADD CONSTRAINT ck_promotion_usage_limit_order CHECK (
                        total_usage_limit_type = 'UNLIMITED'
                        OR per_customer_usage_limit_type = 'UNLIMITED'
                        OR per_customer_usage_limit <= total_usage_limit
                    )
                    """);
        };
    }

    private void migratePromotionTypeConstraint(String tableName, String targetConstraintName) {
        jdbcTemplate.queryForList("""
                        SELECT table_constraint.constraint_name
                        FROM information_schema.table_constraints table_constraint
                        JOIN information_schema.check_constraints check_constraint
                          ON check_constraint.constraint_schema = table_constraint.constraint_schema
                         AND check_constraint.constraint_name = table_constraint.constraint_name
                        WHERE table_constraint.table_schema = current_schema()
                          AND table_constraint.table_name = ?
                          AND table_constraint.constraint_type = 'CHECK'
                          AND check_constraint.check_clause LIKE '%promotion_type%'
                        """, String.class, tableName)
                .forEach(constraintName -> jdbcTemplate.execute(
                        "ALTER TABLE " + tableName + " DROP CONSTRAINT IF EXISTS \""
                                + constraintName.replace("\"", "\"\"")
                                + "\""));
        jdbcTemplate.execute("ALTER TABLE " + tableName
                + " DROP CONSTRAINT IF EXISTS " + targetConstraintName);
        jdbcTemplate.execute("ALTER TABLE " + tableName
                + " ADD CONSTRAINT " + targetConstraintName
                + " CHECK (promotion_type IN ('GENERAL', 'MEMBER_TIER', 'BIRTHDAY', 'LEAP_DAY_BIRTHDAY', 'E_WALLET'))");
    }

    private void migrateBirthdayUsageHistory() {
        jdbcTemplate.update("""
                UPDATE promotion_usage usage
                SET birthday_cycle_year = EXTRACT(YEAR FROM promotion.start_at)::integer
                FROM promotion
                WHERE usage.promotion_id = promotion.promotion_id
                  AND usage.promotion_type IN ('BIRTHDAY', 'LEAP_DAY_BIRTHDAY')
                  AND usage.birthday_cycle_year IS NULL
                """);
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_promotion_usage_birthday_yearly
                ON promotion_usage (user_id, birthday_cycle_year, promotion_type, status)
                WHERE promotion_type IN ('BIRTHDAY', 'LEAP_DAY_BIRTHDAY')
                """);
    }
}
