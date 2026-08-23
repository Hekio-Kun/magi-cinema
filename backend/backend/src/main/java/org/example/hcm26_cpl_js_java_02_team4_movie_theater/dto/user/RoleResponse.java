package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoleResponse {
    String roleName;
    String description;
    Set<PermissionResponse> permissions;
}
