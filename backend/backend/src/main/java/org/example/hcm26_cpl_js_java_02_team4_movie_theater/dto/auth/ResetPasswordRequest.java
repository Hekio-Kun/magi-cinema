package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.PasswordPolicy;

@Data
public class ResetPasswordRequest {
    @NotEmpty(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotEmpty(message = "Token không được để trống")
    private String token;

    @NotEmpty(message = "Mật khẩu mới không được để trống")
    @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
    private String newPassword;
}
