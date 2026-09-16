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
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.JwtService;
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
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TokenBlacklistService;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jwt.SignedJWT;

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
    TokenBlacklistService tokenBlacklistService;
    AccountTokenValidator accountTokenValidator;

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
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                                "/auth/logout",
                                "/payment/zalopay/callback",
                                "/payment/momo/ipn",
                                "/contact/submit").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/auth/register/check",
                                "/health",
                                "/memberships/plans",
                                "/memberships/tiers",
                                "/public/audio",
                                "/bookings/tickets/**",
                                "/payment/zalopay/return",
                                "/payment/momo/return",
                                "/ws/**").permitAll()

                        // Admin dashboard and operational read-only views
                        .requestMatchers("/contact/admin/**").hasAuthority("CONTACT_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/dashboard/stats",
                                "/dashboard/online-users",
                                "/dashboard/notifications").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PUT,
                                "/dashboard/notifications/read-all",
                                "/dashboard/notifications/*/read",
                                "/dashboard/notifications/*/unread").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.GET,
                                "/combos/admin",
                                "/food-items/admin",
                                "/combo-audit-logs",
                                "/combo-audit-logs/**").hasAuthority("COMBO_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/concession-orders",
                                "/concession-orders/**").hasAuthority("BOOKING_VIEW")
                        .requestMatchers(HttpMethod.POST,
                                "/concession-orders",
                                "/concession-orders/*/cancel").hasAuthority("BOOKING_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/cashier-shifts",
                                "/cashier-shifts/**").hasAuthority("BOOKING_VIEW")
                        .requestMatchers(HttpMethod.GET,
                                "/staff-audit-logs",
                                "/staff-audit-logs/**").hasAnyAuthority("USER_VIEW", "SCHEDULE_MANAGE")
                        .requestMatchers(HttpMethod.GET,
                                "/staff-performance",
                                "/staff-performance/**").hasAnyAuthority("SCHEDULE_MANAGE", "USER_VIEW")
                        .requestMatchers(HttpMethod.POST,
                                "/cashier-shifts/open",
                                "/cashier-shifts/*/close").hasAuthority("BOOKING_MANAGE")
                        .requestMatchers(HttpMethod.POST,
                                "/cashier-shifts/*/approve").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.GET,
                                "/staff-schedules",
                                "/staff-schedules/**").hasAnyAuthority("SCHEDULE_MANAGE", "BOOKING_MANAGE", "USER_VIEW")
                        .requestMatchers(HttpMethod.POST,
                                "/staff-schedules/*/check-in",
                                "/staff-schedules/*/check-out").hasAnyAuthority("SCHEDULE_MANAGE", "BOOKING_MANAGE")
                        .requestMatchers(HttpMethod.POST,
                                "/staff-schedules",
                                "/staff-schedules/*/attendance").hasAuthority("SCHEDULE_MANAGE")
                        .requestMatchers(HttpMethod.PUT,
                                "/staff-schedules/**").hasAuthority("SCHEDULE_MANAGE")
                        .requestMatchers(HttpMethod.DELETE,
                                "/staff-schedules/**").hasAuthority("SCHEDULE_MANAGE")
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
                        .requestMatchers(HttpMethod.GET,
                                "/roles",
                                "/permissions").hasAuthority("ROLE_MANAGE")

                        // Seat maps and pricing config for a showtime are public read data used by booking pages.
                        .requestMatchers(HttpMethod.GET,
                                "/showtime-seats",
                                "/showtime-seats/**",
                                "/ticket-pricing/public/config").permitAll()

                        // Room seat definitions are used inside the admin workspace.
                        .requestMatchers(HttpMethod.GET,
                                "/seats",
                                "/seats/**").hasAnyAuthority("SHOWTIME_MANAGE", "BOOKING_VIEW", "ROLE_CUSTOMER")

                        // Management writes
                        .requestMatchers(HttpMethod.GET,
                                "/tmdb/**").hasAnyAuthority("MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/movies",
                                "/movies/upload-image").hasAnyAuthority("MOVIE_CREATE", "MOVIE_UPDATE")
                        .requestMatchers(HttpMethod.POST,
                                "/combos",
                                "/food-items",
                                "/upload/image",
                                "/upload/audio").hasAnyAuthority("COMBO_MANAGE", "MOVIE_CREATE", "MOVIE_UPDATE")
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
                        .requestMatchers(HttpMethod.POST,
                                "/roles",
                                "/permissions").hasAuthority("ROLE_MANAGE")
                        .requestMatchers(HttpMethod.PUT,
                                "/roles/**").hasAuthority("ROLE_MANAGE")

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
                        .requestMatchers(HttpMethod.DELETE,
                                "/roles/**",
                                "/permissions/**").hasAuthority("ROLE_MANAGE")
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
                        .bearerTokenResolver(bearerTokenResolver())
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
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(secretKeySpec)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();

        OAuth2TokenValidator<Jwt> defaultValidator = JwtValidators.createDefaultWithIssuer(JwtService.ISSUER);
        OAuth2TokenValidator<Jwt> blacklistValidator = new TokenBlacklistValidator(tokenBlacklistService);
        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                defaultValidator,
                blacklistValidator,
                accountTokenValidator));

        return jwtDecoder;
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
    public BearerTokenResolver bearerTokenResolver() {
        var defaultResolver = new DefaultBearerTokenResolver();
        return request -> {
            String token = defaultResolver.resolve(request);
            if (token == null) {
                return null;
            }
            // Đối với các GET endpoint công khai (dành cho khách vãng lai duyệt danh mục phim, lịch chiếu, khuyến mãi...),
            // nếu token gửi lên đã hết hạn, đã bị thu hồi hoặc không đúng định dạng, bỏ qua token để request được tiếp tục như khách vãng lai
            // thay vì chặn lại và trả về lỗi 401 làm giao diện bị treo.
            if ("GET".equalsIgnoreCase(request.getMethod()) && isPublicGetPath(request.getRequestURI())) {
                try {
                    var signedJWT = SignedJWT.parse(token);
                    var claims = signedJWT.getJWTClaimsSet();
                    var exp = claims.getExpirationTime();
                    String jti = claims.getJWTID();
                    String subject = claims.getSubject();
                    var iat = claims.getIssueTime();
                    boolean expired = exp != null && exp.before(new java.util.Date());
                    boolean revoked = tokenBlacklistService != null && (
                            tokenBlacklistService.isRevoked(token, jti)
                            || (iat != null && tokenBlacklistService.isUserTokenRevoked(subject, iat.toInstant()))
                    );
                    if (expired || revoked) {
                        log.debug("Bỏ qua token đã hết hạn hoặc bị thu hồi trên public endpoint GET {}.", request.getRequestURI());
                        return null;
                    }
                } catch (Exception e) {
                    log.debug("Bỏ qua token không hợp lệ trên public endpoint GET {}.", request.getRequestURI());
                    return null;
                }
            }
            return token;
        };
    }

    private boolean isPublicGetPath(String uri) {
        if (uri == null) return false;
        return uri.startsWith("/movies")
                || uri.startsWith("/promotions")
                || uri.startsWith("/combos")
                || uri.startsWith("/food-items")
                || uri.startsWith("/genres")
                || uri.startsWith("/showtimes")
                || uri.startsWith("/showtime-seats")
                || uri.startsWith("/ticket-pricing/public")
                || uri.startsWith("/memberships/plans")
                || uri.startsWith("/swagger-ui")
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/health")
                || uri.startsWith("/ws");
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
