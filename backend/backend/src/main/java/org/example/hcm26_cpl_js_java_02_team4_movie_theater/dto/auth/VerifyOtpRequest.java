package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class VerifyOtpRequest {
    @Valid
    @NotNull
    RegisterRequest registerRequest;
    String otp;
}
