package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@RequiredArgsConstructor
public class StartupSecurityValidationConfig {

    private static final int HS512_MIN_KEY_BYTES = 64;

    private final Environment environment;

    @Value("${app.security.require-safe-secrets:false}")
    private boolean requireSafeSecrets;

    @Bean
    ApplicationRunner validateSensitiveConfigurationOnStartup() {
        return args -> {
            if (!shouldValidate()) {
                return;
            }

            List<String> invalidProperties = new ArrayList<>();
            requiredSecretProperties().forEach((property, reason) -> {
                String value = environment.getProperty(property);
                if (!hasText(value) || isUnsafePlaceholder(value)) {
                    invalidProperties.add(property + " (" + reason + ")");
                }
            });

            String jwtSignerKey = environment.getProperty("jwt.signerKey");
            if (hasText(jwtSignerKey) && jwtSignerKey.getBytes(StandardCharsets.UTF_8).length < HS512_MIN_KEY_BYTES) {
                invalidProperties.add("jwt.signerKey (must be at least 64 bytes for HS512)");
            }

            String dbPassword = environment.getProperty("spring.datasource.password");
            if ("root".equalsIgnoreCase(trimToEmpty(dbPassword)) || "postgres".equalsIgnoreCase(trimToEmpty(dbPassword))) {
                invalidProperties.add("spring.datasource.password (must not use a common default database password)");
            }

            String adminSetupEnabled = environment.getProperty("app.setup.admin.enabled", "false");
            String adminPassword = environment.getProperty("app.setup.admin.password");
            if (Boolean.parseBoolean(adminSetupEnabled)
                    && (!hasText(adminPassword) || isUnsafeAdminPassword(adminPassword))) {
                invalidProperties.add("app.setup.admin.password (must be strong when admin setup is enabled)");
            }

            if (!invalidProperties.isEmpty()) {
                throw new IllegalStateException(
                        "Unsafe or missing production secrets: " + String.join(", ", invalidProperties));
            }
        };
    }

    private boolean shouldValidate() {
        return requireSafeSecrets || Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
    }

    private Map<String, String> requiredSecretProperties() {
        Map<String, String> properties = new LinkedHashMap<>();
        properties.put("jwt.signerKey", "JWT signing key");
        properties.put("spring.datasource.password", "database password");
        properties.put("spring.mail.username", "mail account");
        properties.put("spring.mail.password", "mail password");
        properties.put("cloudinary.cloud-name", "Cloudinary cloud name");
        properties.put("cloudinary.api-key", "Cloudinary API key");
        properties.put("cloudinary.api-secret", "Cloudinary API secret");
        properties.put("zalopay.app-id", "ZaloPay app ID");
        properties.put("zalopay.key1", "ZaloPay key1");
        properties.put("zalopay.key2", "ZaloPay key2");
        properties.put("momo.partner-code", "MoMo partner code");
        properties.put("momo.access-key", "MoMo access key");
        properties.put("momo.secret-key", "MoMo secret key");
        properties.put("app.tmdb.api-key", "TMDB API key");
        properties.put("app.google-sheets.api-key", "Google Sheets API key");
        return properties;
    }

    private boolean isUnsafePlaceholder(String value) {
        String normalized = trimToEmpty(value).toLowerCase();
        return normalized.contains("change-me")
                || normalized.contains("your_")
                || normalized.contains("placeholder")
                || normalized.contains("dummy")
                || normalized.contains("example");
    }

    private boolean isUnsafeAdminPassword(String password) {
        String normalized = trimToEmpty(password).toLowerCase();
        return normalized.length() < 12
                || "admin".equals(normalized)
                || "admin123".equals(normalized)
                || "password".equals(normalized)
                || "123456".equals(normalized)
                || isUnsafePlaceholder(normalized);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
