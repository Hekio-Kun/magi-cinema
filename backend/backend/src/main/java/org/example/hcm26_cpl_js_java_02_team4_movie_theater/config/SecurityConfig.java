package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.BaseErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Bật tính năng bảo mật ở cấp độ phương thức (@PreAuthorize)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SecurityConfig {

    private static final int HS512_MIN_KEY_BYTES = 64;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    ObjectMapper objectMapper;
    Environment environment;

    @NonFinal
    @Value("${jwt.signerKey:}")
    String signerKey;

    @NonFinal
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
    String[] allowedOrigins;

    @NonFinal
    String resolvedSignerKey;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                .cors(cors -> cors.configurationSource(request -> {
                    var config = new org.springframework.web.cors.CorsConfiguration();
                    config.setAllowedOrigins(java.util.Arrays.asList(allowedOrigins));
                    config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(java.util.List.of("*"));
                    config.setAllowCredentials(true);
                    return config;
                }))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(request -> request
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public endpoints (no auth required)
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/auth/login",
                                "/auth/register",
                                "/auth/register/verify",
                                "/auth/register/resend-otp",
                                "/auth/forgot-password",
                                "/auth/reset-password",
                                "/payment/zalopay/callback",
                                "/payment/momo/ipn",
                                "/contact/submit").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/auth/register/check",
                                "/memberships/plans",
                                "/bookings/tickets/**",
                                "/payment/zalopay/return",
                                "/payment/momo/return",
                                "/ws/**").permitAll()

                        // Admin dashboard and operational read-only views
                        .requestMatchers(
                                "/contact/admin/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF")
                        .requestMatchers(HttpMethod.GET,
                                "/dashboard/stats",
                                "/dashboard/notifications").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PUT,
                                "/dashboard/notifications/read-all").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.GET,
                                "/combos/admin",
                                "/food-items/admin",
                                "/combo-audit-logs",
                                "/combo-audit-logs/**").hasAuthority("COMBO_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/promotions/admin",
                                "/promotions/admin/**").hasAuthority("PROMOTION_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/bookings/all").hasAuthority("BOOKING_VIEW")
                        .requestMatchers(HttpMethod.GET,
                                "/showtimes/admin",
                                "/showtimes/admin/**").hasAnyAuthority("SHOWTIME_MANAGE", "BOOKING_VIEW")
                        .requestMatchers(HttpMethod.GET,
                                "/cinema-rooms",
                                "/cinema-rooms/**").hasAnyAuthority("SHOWTIME_MANAGE", "BOOKING_VIEW")

                        // Seat maps and pricing config for a showtime are public read data used by booking pages.
                        .requestMatchers(HttpMethod.GET,
                                "/showtime-seats",
                                "/showtime-seats/**",
                                "/ticket-pricing/public/config").permitAll()

                        // Room seat definitions are used inside the admin workspace.
                        .requestMatchers(HttpMethod.GET,
                                "/seats",
                                "/seats/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF", "ROLE_CUSTOMER")

                        // Management writes
                        .requestMatchers(HttpMethod.GET,
                                "/tmdb/**").hasAnyAuthority("MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/movies",
                                "/movies/upload-image").hasAnyAuthority("MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/combos",
                                "/food-items",
                                "/upload/image").hasAnyAuthority("COMBO_MANAGE", "MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/promotions").hasAuthority("PROMOTION_MANAGE")
                        .requestMatchers(HttpMethod.POST,
                                "/genres",
                                "/genres/**").hasAnyAuthority("MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/showtimes/admin",
                                "/showtimes/admin/**",
                                "/cinema-rooms",
                                "/seats",
                                "/showtime-seats").hasAuthority("SHOWTIME_MANAGE")

                        // Guest/customer public browsing
                        .requestMatchers(HttpMethod.GET,
                                "/showtimes/dates",
                                "/showtimes",
                                "/showtimes/**",
                                "/movies",
                                "/promotions",
                                "/combos",
                                "/combos/**",
                                "/food-items",
                                "/food-items/**",
                                "/genres",
                                "/genres/**",
                                "/movies/**").permitAll()
                        .requestMatchers(HttpMethod.PUT,
                                "/movies/**",
                                "/genres/**").hasAuthority("MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.PUT,
                                "/combos/**",
                                "/food-items/**",
                                "/upload/image").hasAuthority("COMBO_MANAGE")
                        .requestMatchers(HttpMethod.PUT,
                                "/promotions/**").hasAuthority("PROMOTION_MANAGE")
                        .requestMatchers(HttpMethod.PUT,
                                "/showtimes/admin/**",
                                "/cinema-rooms/**",
                                "/seats/**",
                                "/showtime-seats/**").hasAuthority("SHOWTIME_MANAGE")
                        .requestMatchers(HttpMethod.PATCH,
                                "/combos/**").hasAuthority("COMBO_MANAGE")
                        .requestMatchers(HttpMethod.PATCH,
                                "/promotions/**").hasAuthority("PROMOTION_MANAGE")
                        .requestMatchers(HttpMethod.PATCH,
                                "/showtimes/admin/**").hasAuthority("SHOWTIME_MANAGE")
                        .requestMatchers(HttpMethod.DELETE,
                                "/movies/**",
                                "/genres/**").hasAuthority("MOVIE_DELETE")
                        .requestMatchers(HttpMethod.DELETE,
                                "/combos/**",
                                "/food-items/**",
                                "/upload/image").hasAuthority("COMBO_MANAGE")
                        .requestMatchers(HttpMethod.DELETE,
                                "/showtimes/admin/**",
                                "/cinema-rooms/**",
                                "/seats/**",
                                "/showtime-seats/**").hasAuthority("SHOWTIME_MANAGE")
                        // Authenticated endpoints
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                writeErrorResponse(response, ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeErrorResponse(response, ErrorCode.ACCESS_DENIED))
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.decoder(jwtDecoder()).jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return httpSecurity.build();
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        var secretKey = new SecretKeySpec(resolveSignerKey().getBytes(StandardCharsets.UTF_8), "HS512");
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        var secretKeySpec = new SecretKeySpec(resolveSignerKey().getBytes(StandardCharsets.UTF_8), "HS512");
        return NimbusJwtDecoder.withSecretKey(secretKeySpec)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        var jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        // Token uses the "scope" claim, for example: "ROLE_ADMIN USER_VIEW MOVIE_CREATE".
        jwtGrantedAuthoritiesConverter.setAuthorityPrefix("");
        jwtGrantedAuthoritiesConverter.setAuthoritiesClaimName("scope");

        var jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtGrantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    private String resolveSignerKey() {
        if (resolvedSignerKey != null) {
            return resolvedSignerKey;
        }

        String configuredKey = signerKey == null ? "" : signerKey.trim();
        if (!configuredKey.isBlank()) {
            validateSignerKey(configuredKey);
            resolvedSignerKey = configuredKey;
            return resolvedSignerKey;
        }

        if (isProductionProfile()) {
            throw new IllegalStateException("JWT_SIGNER_KEY must be configured for production.");
        }

        byte[] randomBytes = new byte[HS512_MIN_KEY_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        resolvedSignerKey = Base64.getEncoder().encodeToString(randomBytes);
        log.warn("JWT_SIGNER_KEY is not configured. Generated an in-memory development key for this process only.");
        return resolvedSignerKey;
    }

    private void validateSignerKey(String key) {
        if (key.contains("YOUR_VERY_SECURE_SECRET_KEY") || key.toLowerCase().contains("change-me")) {
            throw new IllegalStateException("JWT_SIGNER_KEY is still using an unsafe placeholder value.");
        }
        if (key.getBytes(StandardCharsets.UTF_8).length < HS512_MIN_KEY_BYTES) {
            throw new IllegalStateException("JWT_SIGNER_KEY must be at least 64 bytes for HS512.");
        }
    }

    private boolean isProductionProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
    }

    private void writeErrorResponse(HttpServletResponse response, BaseErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatusCode().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
        objectMapper.writeValue(response.getWriter(), apiResponse);
    }
}
