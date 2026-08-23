package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffImportError {
    int row;
    String username;
    String email;
    String message;
}
