package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.Pattern;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateUserRequest {
    String fullName;
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
    String phoneNumber;
    String address;
    Gender gender;
    String roleName;
    UserStatus status;
    String avatarUrl;
    LocalDate dateOfBirth;
    String identityCard;
    String memberTier;
}
