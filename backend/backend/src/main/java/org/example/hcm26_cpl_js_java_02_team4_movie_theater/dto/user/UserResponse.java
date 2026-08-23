package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    String userId;
    String username;
    String email;
    UserStatus status;
    String roleName;
}
