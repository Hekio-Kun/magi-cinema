package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffImportResponse {
    int totalRows;
    int successCount;
    int failedCount;
    List<StaffImportError> errors;
}
