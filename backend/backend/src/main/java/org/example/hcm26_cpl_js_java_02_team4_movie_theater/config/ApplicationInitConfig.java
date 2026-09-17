package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PermissionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;

@Slf4j
@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ApplicationInitConfig {

    private static final int MIN_ADMIN_PASSWORD_LENGTH = 12;

    PasswordEncoder passwordEncoder;
    JdbcTemplate jdbcTemplate;
    Environment environment;

    private static final Map<String, String> SYSTEM_ROLES = new LinkedHashMap<>();

    static {
        SYSTEM_ROLES.put("ADMIN", "Full system administration");
        SYSTEM_ROLES.put("MANAGER", "Cinema operation and content management");
        SYSTEM_ROLES.put("STAFF", "Daily ticket and customer support operations");
        SYSTEM_ROLES.put("CUSTOMER", "Registered customer account");
        SYSTEM_ROLES.put("GUEST", "Anonymous public visitor");
    }

    @NonFinal
    @Value("${app.setup.admin.enabled:false}")
    boolean adminSetupEnabled;

    @NonFinal
    @Value("${app.setup.admin.username:admin}")
    String adminUsername;

    @NonFinal
    @Value("${app.setup.admin.email:}")
    String adminEmail;

    @NonFinal
    @Value("${app.setup.admin.password:}")
    String adminPassword;

    @Bean
    ApplicationRunner applicationRunner(UserRepository userRepository,
                                        UserProfileRepository userProfileRepository,
                                        RoleRepository roleRepository,
                                        PermissionRepository permissionRepository) {
        return args -> {
            seedSystemRoles(roleRepository, permissionRepository);
            migrateLegacyUserRole();
            cleanupLegacyPermissions();
            fixComboStatus();
            fixGenreMetadata();
            fixLegacyFoodItemVisibility();
            migrateDefaultFoodVariants();
            fixFoodVariantStock();
            fixFoodVariantFinancials();
            linkLegacyComboItemsToFoodVariants();
            fixShowtimeBasePrice();
            migrateLegacyRoomAndMovieFormats();
            migrateLegacyMoviePresentations();
            fixCinemaRoomTypeConstraint();
            fixMembershipStatusConstraint();
            fixMembershipPointTypeConstraint();
            fixMembershipRewardRedemptionStatusConstraint();

            seedAdminUserIfEnabled(userRepository, userProfileRepository, roleRepository);
        };
    }

    private void seedAdminUserIfEnabled(UserRepository userRepository,
                                        UserProfileRepository userProfileRepository,
                                        RoleRepository roleRepository) {
        if (!adminSetupEnabled) {
            return;
        }

        validateAdminSetup();
        if (userRepository.findByUsername(adminUsername).isPresent()) {
            log.info("Admin seed skipped because username '{}' already exists.", adminUsername);
            return;
        }

        Role adminRole = roleRepository.findById("ADMIN").orElseThrow();
        HashSet<Role> roles = new HashSet<>();
        roles.add(adminRole);

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .roles(roles)
                .status(UserStatus.ACTIVE)
                .build();

        admin = userRepository.save(admin);

        UserProfile adminProfile = UserProfile.builder()
                .userId(admin.getUserId())
                .fullName("Administrator")
                .email(adminEmail)
                .isActive(true)
                .build();

        userProfileRepository.save(adminProfile);
        log.warn("Initial admin user '{}' has been created from secure setup configuration.", adminUsername);
    }

    private void validateAdminSetup() {
        if (!hasText(adminUsername) || !hasText(adminEmail) || !hasText(adminPassword)) {
            throw new IllegalStateException(
                    "Admin setup requires ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD when ADMIN_SETUP_ENABLED=true.");
        }
        if (adminPassword.length() < MIN_ADMIN_PASSWORD_LENGTH || isUnsafeAdminPassword(adminPassword)) {
            throw new IllegalStateException("ADMIN_PASSWORD is too weak for initial admin setup.");
        }
        if (isProductionProfile() && "admin".equalsIgnoreCase(adminUsername.trim())) {
            throw new IllegalStateException("Production admin setup must not use the default username 'admin'.");
        }
    }

    private boolean isUnsafeAdminPassword(String password) {
        String normalized = password.trim().toLowerCase();
        return "admin".equals(normalized)
                || "admin123".equals(normalized)
                || "password".equals(normalized)
                || "123456".equals(normalized)
                || normalized.contains("change-me");
    }

    private boolean isProductionProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void seedSystemRoles(RoleRepository roleRepository, PermissionRepository permissionRepository) {
        // Define all permissions
        String[][] allPermissions = {
                {"USER_VIEW", "View user list and details"},
                {"USER_CREATE", "Create new staff users"},
                {"USER_UPDATE", "Update user information and status"},
                {"USER_DELETE", "Soft-delete users"},
                {"ROLE_MANAGE", "Manage roles and permissions"},
                {"MOVIE_VIEW", "View movie list"},
                {"MOVIE_CREATE", "Add new movies"},
                {"MOVIE_UPDATE", "Edit movie details"},
                {"MOVIE_DELETE", "Remove movies"},
                {"SHOWTIME_MANAGE", "Manage showtimes and room assignments"},
                {"COMBO_MANAGE", "Manage combos and snacks"},
                {"PROMOTION_MANAGE", "Manage promotions and promotion usage"},
                {"CONTACT_MANAGE", "Manage customer contacts and feedback"},
                {"BOOKING_VIEW", "View booking history and reports"},
                {"BOOKING_MANAGE", "Manage bookings and ticket cancellations"},
                {"SCHEDULE_MANAGE", "Create staff schedules and manage attendance"}
        };

        Map<String, Permission> permissionMap = new LinkedHashMap<>();
        for (String[] p : allPermissions) {
            Permission permission = permissionRepository.findById(p[0])
                    .orElseGet(() -> permissionRepository.save(Permission.builder()
                            .name(p[0])
                            .description(p[1])
                            .build()));
            permissionMap.put(p[0], permission);
        }

        SYSTEM_ROLES.forEach((roleName, description) -> {
            var existingRole = roleRepository.findById(roleName);
            // Giữ quyền và mô tả mà quản trị viên đã chỉnh cho các vai trò có thể sửa.
            if (existingRole.isPresent() && ("MANAGER".equals(roleName) || "STAFF".equals(roleName))) {
                return;
            }
            Role role = existingRole
                    .orElseGet(() -> Role.builder()
                            .roleName(roleName)
                            .build());
            role.setDescription(description);

            HashSet<Permission> permissions = new HashSet<>();
            switch (roleName) {
                case "ADMIN":
                    permissions.addAll(permissionMap.values());
                    break;
                case "MANAGER":
                    permissions.add(permissionMap.get("MOVIE_VIEW"));
                    permissions.add(permissionMap.get("MOVIE_CREATE"));
                    permissions.add(permissionMap.get("MOVIE_UPDATE"));
                    permissions.add(permissionMap.get("SHOWTIME_MANAGE"));
                    permissions.add(permissionMap.get("COMBO_MANAGE"));
                    permissions.add(permissionMap.get("PROMOTION_MANAGE"));
                    permissions.add(permissionMap.get("CONTACT_MANAGE"));
                    permissions.add(permissionMap.get("BOOKING_VIEW"));
                    break;
                case "STAFF":
                    permissions.add(permissionMap.get("MOVIE_VIEW"));
                    permissions.add(permissionMap.get("BOOKING_VIEW"));
                    permissions.add(permissionMap.get("BOOKING_MANAGE"));
                    break;
                case "CUSTOMER":
                    permissions.add(permissionMap.get("MOVIE_VIEW"));
                    break;
            }
            role.setPermissions(permissions);
            roleRepository.save(role);
        });
        // Preserve custom manager/staff roles while adding this capability to
        // existing databases in an idempotent way.
        jdbcTemplate.update("INSERT INTO role_permissions (role_name, name) VALUES ('ADMIN', 'SCHEDULE_MANAGE') ON CONFLICT DO NOTHING");
        jdbcTemplate.update("INSERT INTO role_permissions (role_name, name) VALUES ('MANAGER', 'SCHEDULE_MANAGE') ON CONFLICT DO NOTHING");
    }

    private void migrateLegacyUserRole() {
        jdbcTemplate.update("""
                INSERT INTO user_roles (user_id, role_name)
                SELECT user_id, 'CUSTOMER'
                FROM user_roles
                WHERE role_name = 'USER'
                ON CONFLICT DO NOTHING
                """);
        jdbcTemplate.update("DELETE FROM user_roles WHERE role_name = 'USER'");
        jdbcTemplate.update("DELETE FROM role_permissions WHERE role_name = 'USER'");
        jdbcTemplate.update("DELETE FROM roles WHERE role_name = 'USER'");
    }

    private void cleanupLegacyPermissions() {
        jdbcTemplate.update("""
                DELETE FROM role_permissions
                WHERE name IN ('USER_READ', 'USER_WRITE', 'THEATER_READ', 'THEATER_WRITE')
                """);
        jdbcTemplate.update("""
                DELETE FROM permission
                WHERE name IN ('USER_READ', 'USER_WRITE', 'THEATER_READ', 'THEATER_WRITE')
                """);
    }

    private void fixComboStatus() {
        try {
            jdbcTemplate.update("UPDATE combo SET status = 'ACTIVE' WHERE status IS NULL");
            log.info("Fixed NULL combo status by setting to ACTIVE.");
        } catch (Exception e) {
            log.warn("Could not fix combo status: {}", e.getMessage());
        }
    }

    private void fixGenreMetadata() {
        try {
            jdbcTemplate.update("UPDATE genre SET status = 'ACTIVE' WHERE status IS NULL");
            jdbcTemplate.update("""
                    UPDATE genre
                    SET source = CASE
                        WHEN LOWER(TRIM(COALESCE(description, ''))) = LOWER('Tự động tạo từ TMDB') THEN 'TMDB'
                        ELSE 'MANUAL'
                    END
                    WHERE source IS NULL
                    """);
            jdbcTemplate.update("UPDATE genre SET color_code = '#E63946' WHERE color_code IS NULL OR color_code = ''");
            jdbcTemplate.update("UPDATE genre SET display_order = 0 WHERE display_order IS NULL");
            jdbcTemplate.update("""
                    UPDATE genre
                    SET slug = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
                        unaccent(REPLACE(REPLACE(name, 'Đ', 'D'), 'đ', 'd')),
                        '[^A-Za-z0-9]+', '-', 'g'
                    )))
                    WHERE slug IS NULL OR slug = ''
                    """);
            log.info("Backfilled operational metadata for legacy genres.");
        } catch (Exception e) {
            log.warn("Could not backfill genre metadata: {}", e.getMessage());
        }
    }

    private void migrateDefaultFoodVariants() {
        try {
            jdbcTemplate.update("""
                    INSERT INTO food_variant (food_item_id, variant_name, price, is_active, display_order, stock_quantity)
                    SELECT food_item_id, 'Mặc định', COALESCE(price, 0), is_active, 0, 0
                    FROM food_item fi
                    WHERE NOT EXISTS (
                        SELECT 1 FROM food_variant fv WHERE fv.food_item_id = fi.food_item_id
                    )
                    """);
            log.info("Migrated default food variants for legacy food items.");
        } catch (Exception e) {
            log.warn("Could not migrate default food variants: {}", e.getMessage());
        }
    }

    private void fixLegacyFoodItemVisibility() {
        try {
            jdbcTemplate.update("UPDATE food_item SET is_active = true WHERE is_active IS NULL");
            jdbcTemplate.update("UPDATE food_variant SET is_active = true WHERE is_active IS NULL");
            log.info("Fixed NULL food item and variant active flags by setting to true.");
        } catch (Exception e) {
            log.warn("Could not fix food item visibility flags: {}", e.getMessage());
        }
    }

    private void fixFoodVariantStock() {
        try {
            jdbcTemplate.update("UPDATE food_variant SET stock_quantity = 0 WHERE stock_quantity IS NULL");
            log.info("Fixed NULL food variant stock quantity by setting to 0.");
        } catch (Exception e) {
            log.warn("Could not fix food variant stock quantity: {}", e.getMessage());
        }
    }

    private void fixFoodVariantFinancials() {
        try {
            jdbcTemplate.update("UPDATE food_variant SET purchase_price = 0 WHERE purchase_price IS NULL");
            log.info("Fixed NULL food variant purchase prices by setting to 0.");
        } catch (Exception e) {
            log.warn("Could not fix food variant purchase prices: {}", e.getMessage());
        }
    }

    private void linkLegacyComboItemsToFoodVariants() {
        try {
            jdbcTemplate.update("""
                    UPDATE combo_item ci
                    SET food_variant_id = (
                        SELECT fv.food_variant_id
                        FROM food_variant fv
                        WHERE fv.food_item_id = ci.food_item_id
                        ORDER BY fv.display_order NULLS LAST, fv.food_variant_id
                        LIMIT 1
                    )
                    WHERE ci.food_variant_id IS NULL
                    """);
            log.info("Linked legacy combo items to default food variants.");
        } catch (Exception e) {
            log.warn("Could not link legacy combo items to food variants: {}", e.getMessage());
        }
    }

    private void fixShowtimeBasePrice() {
        try {
            jdbcTemplate.update("UPDATE showtime SET base_price = 75000 WHERE base_price IS NULL OR base_price <= 0");
            log.info("Fixed invalid showtime base prices by setting to 75000.");
        } catch (Exception e) {
            log.warn("Could not fix showtime base price: {}", e.getMessage());
        }
    }

    private void fixCinemaRoomTypeConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE cinema_room DROP CONSTRAINT IF EXISTS cinema_room_type_check");
            jdbcTemplate.execute("""
                    ALTER TABLE cinema_room
                    ADD CONSTRAINT cinema_room_type_check
                    CHECK (type IS NULL OR type IN ('STANDARD', 'IMAX', '4DX', 'BED', 'VIP'))
                    """);
            log.info("Fixed cinema room type constraint.");
        } catch (Exception e) {
            log.warn("Could not fix cinema room type constraint: {}", e.getMessage());
        }
    }

    private void fixMembershipStatusConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE user_memberships DROP CONSTRAINT IF EXISTS user_memberships_status_check");
            jdbcTemplate.execute("""
                    ALTER TABLE user_memberships
                    ADD CONSTRAINT user_memberships_status_check
                    CHECK (status IN ('PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'LOCKED', 'EXPIRED', 'CANCELLED'))
                    """);
            log.info("Fixed membership status constraint with LOCKED support.");
        } catch (Exception e) {
            log.warn("Could not fix membership status constraint: {}", e.getMessage());
        }
    }

    private void fixMembershipPointTypeConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE membership_point_transactions DROP CONSTRAINT IF EXISTS membership_point_transactions_type_check");
            jdbcTemplate.execute("""
                    ALTER TABLE membership_point_transactions
                    ADD CONSTRAINT membership_point_transactions_type_check
                    CHECK (type IN ('EARN', 'HOLD', 'REDEEM', 'RELEASE', 'REVERSE', 'ADJUST', 'EXPIRE'))
                    """);
            log.info("Fixed membership point transaction constraint with EXPIRE support.");
        } catch (Exception e) {
            log.warn("Could not fix membership point transaction constraint: {}", e.getMessage());
        }
    }

    private void fixMembershipRewardRedemptionStatusConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE membership_reward_redemptions DROP CONSTRAINT IF EXISTS membership_reward_redemptions_status_check");
            jdbcTemplate.execute("""
                    ALTER TABLE membership_reward_redemptions
                    ADD CONSTRAINT membership_reward_redemptions_status_check
                    CHECK (status IN ('AVAILABLE', 'HELD', 'USED', 'EXPIRED'))
                    """);
            log.info("Fixed membership reward redemption status constraint with HELD support.");
        } catch (Exception e) {
            log.warn("Could not fix membership reward redemption status constraint: {}", e.getMessage());
        }
    }

    private void migrateLegacyRoomAndMovieFormats() {
        try {
            jdbcTemplate.update("UPDATE cinema_room SET type = 'STANDARD' WHERE type IN ('SCREENX', 'DOLBY')");
            jdbcTemplate.execute("ALTER TABLE movie_type_enum DROP CONSTRAINT IF EXISTS movie_type_enum_type_name_check");
            jdbcTemplate.update("""
                    UPDATE movie_type_enum
                    SET type_name = 'STANDARD'
                    WHERE type_name IN ('_2D', '_3D', '2D', '3D', 'SCREENX', 'DOLBY')
                    """);
            jdbcTemplate.update("UPDATE movie_type_enum SET type_name = '_4DX' WHERE type_name = '4DX'");
            jdbcTemplate.update("""
                    DELETE FROM movie_type_enum older
                    USING movie_type_enum newer
                    WHERE older.movie_id = newer.movie_id
                      AND older.type_name = newer.type_name
                      AND older.ctid < newer.ctid
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE movie_type_enum
                    ADD CONSTRAINT movie_type_enum_type_name_check
                    CHECK (type_name IS NULL OR type_name IN ('STANDARD', 'IMAX', '_4DX'))
                    """);

            jdbcTemplate.execute("ALTER TABLE movie_presentation DROP CONSTRAINT IF EXISTS movie_presentation_format_projection_check");
            jdbcTemplate.execute("ALTER TABLE movie_presentation DROP CONSTRAINT IF EXISTS movie_presentation_format_check");
            jdbcTemplate.update("""
                    UPDATE movie_presentation
                    SET label = NULL
                    WHERE format = 'DOLBY'
                      AND LOWER(COALESCE(label, '')) LIKE 'dolby%'
                    """);
            jdbcTemplate.update("UPDATE movie_presentation SET format = 'STANDARD' WHERE format = 'DOLBY'");
            jdbcTemplate.update("""
                    UPDATE movie_presentation
                    SET label = NULL
                    WHERE UPPER(TRIM(COALESCE(label, ''))) ~ '^(STANDARD|IMAX|4DX|DOLBY)[[:space:]]*-[[:space:]]*(2D|3D)'
                    """);
            jdbcTemplate.update("""
                    UPDATE movie_presentation
                    SET projection_type = 'THREE_D'
                    WHERE format IN ('IMAX', '_4DX')
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE movie_presentation
                    ADD CONSTRAINT movie_presentation_format_check
                    CHECK (format IN ('STANDARD', 'IMAX', '_4DX'))
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE movie_presentation
                    ADD CONSTRAINT movie_presentation_format_projection_check
                    CHECK (format = 'STANDARD' OR projection_type = 'THREE_D')
                    """);
            log.info("Migrated legacy Dolby data to STANDARD and normalized IMAX/4DX presentations to 3D.");
        } catch (Exception e) {
            log.warn("Could not migrate legacy room/movie formats: {}", e.getMessage());
        }
    }

    private void migrateLegacyMoviePresentations() {
        try {
            jdbcTemplate.update("""
                    INSERT INTO movie_presentation (
                        movie_id, format, projection_type, language_type,
                        audio_language, subtitle_language, active, sort_order
                    )
                    SELECT m.movie_id, mte.type_name, 'TWO_D', 'SUBTITLE',
                           'Gốc', 'Tiếng Việt', true,
                           ROW_NUMBER() OVER (PARTITION BY m.movie_id ORDER BY mte.type_name)::integer - 1
                    FROM movie m
                    JOIN movie_type_enum mte ON mte.movie_id = m.movie_id
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM movie_presentation mp
                        WHERE mp.movie_id = m.movie_id AND mp.format = mte.type_name
                    )
                    """);
            jdbcTemplate.update("""
                    INSERT INTO movie_presentation (
                        movie_id, format, projection_type, language_type,
                        audio_language, subtitle_language, active, sort_order
                    )
                    SELECT m.movie_id, 'STANDARD', 'TWO_D', 'SUBTITLE',
                           'Gốc', 'Tiếng Việt', true, 0
                    FROM movie m
                    WHERE NOT EXISTS (
                        SELECT 1 FROM movie_presentation mp WHERE mp.movie_id = m.movie_id
                    )
                    """);
            jdbcTemplate.update("""
                    UPDATE showtime s
                    SET presentation_id = (
                        SELECT mp.presentation_id
                        FROM movie_presentation mp
                        JOIN cinema_room cr ON cr.cinema_room_id = s.cinema_room_id
                        WHERE mp.movie_id = s.movie_id
                          AND mp.active = true
                          AND (mp.format = cr.type OR mp.format = 'STANDARD')
                        ORDER BY CASE WHEN mp.format = cr.type THEN 0 ELSE 1 END,
                                 mp.sort_order NULLS LAST,
                                 mp.presentation_id
                        LIMIT 1
                    )
                    WHERE s.presentation_id IS NULL
                      AND EXISTS (
                          SELECT 1
                          FROM movie_presentation mp
                          JOIN cinema_room cr ON cr.cinema_room_id = s.cinema_room_id
                          WHERE mp.movie_id = s.movie_id
                            AND mp.active = true
                            AND (mp.format = cr.type OR mp.format = 'STANDARD')
                      )
                    """);
            log.info("Migrated legacy movie presentations and linked legacy showtimes.");
        } catch (Exception e) {
            log.warn("Could not migrate legacy movie presentations: {}", e.getMessage());
        }
    }

}
