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
import java.util.StringJoiner;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JwtService {

    JwtEncoder jwtEncoder;

    @NonFinal
    @Value("${jwt.validity.duration:24}")
    long validityDuration;

    public String generateToken(User user) {
        JwsHeader jwsHeader = JwsHeader.with(MacAlgorithm.HS512).build();

        Instant now = Instant.now();
        Instant expiry = now.plus(validityDuration, ChronoUnit.HOURS);

        // Build scope string from roles and permissions
        StringJoiner scope = new StringJoiner(" ");
        if (user.getRoles() != null) {
            user.getRoles().forEach(role -> {
                scope.add("ROLE_" + role.getRoleName());
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(permission -> scope.add(permission.getName()));
                }
            });
        }

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .subject(user.getUsername())
                .issuer("movie-theater.com")
                .issuedAt(now)
                .expiresAt(expiry)
                .claim("scope", scope.toString())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, jwtClaimsSet)).getTokenValue();
    }
}