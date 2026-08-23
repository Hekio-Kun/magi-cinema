package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffCreateRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải có từ 3 đến 50 ký tự")
    @Pattern(regexp = "[A-Za-z0-9._-]+", message = "Tên đăng nhập chỉ được chứa chữ, số, dấu chấm, gạch ngang và gạch dưới")
    String username;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    String phoneNumber;

    // Optional. Blank values are normalized to null by UserService.
    String identityCard;

    @NotBlank(message = "Vai trò không được để trống")
    @Pattern(regexp = "STAFF|MANAGER", message = "Vai trò không hợp lệ")
    String roleName;

    @NotNull(message = "Giới tính không được để trống")
    Gender gender;

    @NotNull(message = "Ngày sinh không được để trống")
    @Past(message = "Ngày sinh phải trước ngày hiện tại")
    LocalDate dateOfBirth;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    String address;

    @NotNull(message = "Ngày vào làm không được để trống")
    LocalDate hireDate;
}
