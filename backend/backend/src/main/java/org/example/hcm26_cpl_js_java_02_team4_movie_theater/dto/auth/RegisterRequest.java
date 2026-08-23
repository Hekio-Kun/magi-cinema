package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.PasswordPolicy;

import java.time.LocalDate;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class RegisterRequest {
    String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
    String password;
    String email;
    @NotBlank(message = "Họ và tên không được để trống")
    String fullName;
    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
    String phoneNumber;
    String address;
    Gender gender;
    @NotNull(message = "Ngày sinh không được để trống")
    @Past(message = "Ngày sinh phải trước ngày hiện tại")
    LocalDate dateOfBirth;
    String identityCard;
}
