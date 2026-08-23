package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDetailResponse {
    String userId;
    String username;
    String email;
    UserStatus status;
    String roleName;

    // Profile fields
    String fullName;
    String phoneNumber;
    Gender gender;
    String address;
    String identityCard;
    LocalDate dateOfBirth;
    LocalDate hireDate;
    String avatarUrl;
    LocalDateTime createdAt;
    Boolean member;
    Integer loyaltyPoints;
    String memberTier;
}
