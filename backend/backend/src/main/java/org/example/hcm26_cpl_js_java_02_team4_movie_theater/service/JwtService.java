package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JwtService {

    public static final String ISSUER = "movie-theater.com";

    JwtEncoder jwtEncoder;

    @NonFinal
    @Value("${jwt.validity.duration:24}")
    long validityDuration;

    public String generateToken(User user) {
        JwsHeader jwsHeader = JwsHeader.with(MacAlgorithm.HS512).build();

        Instant now = Instant.now();
        Instant expiry = now.plus(validityDuration, ChronoUnit.HOURS);

        // Build a stable, de-duplicated scope string from the user's current roles.
        Set<String> authorities = new LinkedHashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().forEach(role -> {
                if (role == null || role.getRoleName() == null || role.getRoleName().isBlank()) {
                    return;
                }
                authorities.add("ROLE_" + role.getRoleName().trim().toUpperCase(java.util.Locale.ROOT));
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(permission -> {
                        if (permission != null && permission.getName() != null && !permission.getName().isBlank()) {
                            authorities.add(permission.getName().trim().toUpperCase(java.util.Locale.ROOT));
                        }
                    });
                }
            });
        }

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getUsername())
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(expiry)
                .claim("scope", String.join(" ", authorities))
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, jwtClaimsSet)).getTokenValue();
    }
}
