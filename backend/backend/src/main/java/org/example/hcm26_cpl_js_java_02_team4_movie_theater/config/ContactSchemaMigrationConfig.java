package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
public class ContactSchemaMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    ApplicationRunner migrateContactSchema() {
        return args -> {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS ticket_code varchar(32)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS category varchar(30) DEFAULT 'OTHER'");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'NORMAL'");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS assigned_to_user_id varchar(36)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS assigned_to_name varchar(100)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS due_at timestamp");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS first_response_at timestamp");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS resolved_at timestamp");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS closed_at timestamp");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS internal_note text");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS updated_at timestamp");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS customer_contact ADD COLUMN IF NOT EXISTS workflow_migrated_at timestamp");

            jdbcTemplate.update("UPDATE customer_contact SET status = 'NEW' WHERE status IS NULL OR status = 'RECEIVED'");
            jdbcTemplate.update("UPDATE customer_contact SET status = 'RESOLVED' WHERE status = 'REPLIED'");
            jdbcTemplate.update("UPDATE customer_contact SET archived = false WHERE archived IS NULL");
            jdbcTemplate.update("UPDATE customer_contact SET category = 'OTHER' WHERE category IS NULL");
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET category = CASE
                        WHEN lower(subject) LIKE '%thanh toán%' OR lower(subject) LIKE '%đặt vé%' THEN 'BOOKING_PAYMENT'
                        WHEN lower(subject) LIKE '%nhân viên%' THEN 'STAFF_ATTITUDE'
                        WHEN lower(subject) LIKE '%hợp tác%' OR lower(subject) LIKE '%quảng cáo%' THEN 'PARTNERSHIP'
                        WHEN lower(subject) LIKE '%lịch chiếu%' OR lower(subject) LIKE '%phim%' THEN 'MOVIE_SCHEDULE'
                        WHEN lower(subject) LIKE '%dịch vụ%' OR lower(subject) LIKE '%chất lượng%' THEN 'SERVICE_QUALITY'
                        ELSE category
                    END
                    WHERE category = 'OTHER' AND workflow_migrated_at IS NULL
                    """);
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET priority = CASE
                        WHEN category IN ('BOOKING_PAYMENT', 'STAFF_ATTITUDE') THEN 'HIGH'
                        WHEN category = 'PARTNERSHIP' THEN 'LOW'
                        ELSE 'NORMAL'
                    END
                    WHERE workflow_migrated_at IS NULL
                      AND (priority IS NULL OR priority = 'NORMAL')
                    """);
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET ticket_code = 'MAGI-' || to_char(COALESCE(created_at, CURRENT_TIMESTAMP), 'YYYYMMDD')
                        || '-' || lpad(contact_id::text, 6, '0')
                    WHERE ticket_code IS NULL OR ticket_code = ''
                    """);
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET due_at = COALESCE(created_at, CURRENT_TIMESTAMP) + CASE
                        WHEN category = 'BOOKING_PAYMENT' THEN interval '8 hours'
                        WHEN category = 'STAFF_ATTITUDE' THEN interval '12 hours'
                        WHEN category = 'PARTNERSHIP' THEN interval '48 hours'
                        ELSE interval '24 hours'
                    END
                    WHERE due_at IS NULL
                    """);
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET first_response_at = replied_at
                    WHERE first_response_at IS NULL AND replied_at IS NOT NULL
                    """);
            jdbcTemplate.update("""
                    UPDATE customer_contact
                    SET resolved_at = COALESCE(replied_at, updated_at, created_at)
                    WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NULL
                    """);
            jdbcTemplate.update("""
                    INSERT INTO customer_contact_reply
                        (contact_id, reply_message, staff_name, email_delivered, created_at)
                    SELECT contact_id, admin_reply, 'Magi Cinema', true,
                           COALESCE(replied_at, updated_at, created_at, CURRENT_TIMESTAMP)
                    FROM customer_contact contact
                    WHERE admin_reply IS NOT NULL
                      AND btrim(admin_reply) <> ''
                      AND NOT EXISTS (
                          SELECT 1 FROM customer_contact_reply reply
                          WHERE reply.contact_id = contact.contact_id
                      )
                    """);

            jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_customer_contact_ticket_code ON customer_contact(ticket_code)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_customer_contact_active_status ON customer_contact(archived, status, due_at)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_customer_contact_sender_created ON customer_contact(sender_email, created_at)");
            jdbcTemplate.update("UPDATE customer_contact SET workflow_migrated_at = CURRENT_TIMESTAMP WHERE workflow_migrated_at IS NULL");
            jdbcTemplate.execute("ALTER TABLE customer_contact ALTER COLUMN workflow_migrated_at SET DEFAULT CURRENT_TIMESTAMP");
        };
    }
}
