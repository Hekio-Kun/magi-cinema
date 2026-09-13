package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.AttendanceStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AttendanceUpdateRequest {
    @NotNull(message = "Trạng thái chấm công không được để trống")
    AttendanceStatus status;
    String note;
}
