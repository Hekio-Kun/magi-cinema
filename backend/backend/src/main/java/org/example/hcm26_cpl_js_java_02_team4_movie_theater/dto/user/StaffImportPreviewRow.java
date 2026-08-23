package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffImportPreviewRow {
    int row;
    String username;
    String email;
    String fullName;
    String phoneNumber;
    String identityCard;
    String gender;
    String dateOfBirth;
    String address;
    String hireDate;
    String roleName;
    boolean valid;
    String message;
}
