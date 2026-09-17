package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactPriority;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactUpdateRequest {
    ContactStatus status;
    ContactPriority priority;
    Boolean assignToMe;

    @Size(max = 3000, message = "Ghi chú nội bộ không được vượt quá 3000 ký tự")
    String internalNote;
}
