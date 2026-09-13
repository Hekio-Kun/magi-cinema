package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoleRequest {
    @NotBlank(message = "Tên vai trò không được để trống.")
    @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_]{2,49}$", message = "Tên vai trò chỉ gồm chữ, số và gạch dưới, dài 3-50 ký tự.")
    String roleName;
    String description;
    Set<String> permissions;
}
