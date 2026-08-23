package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactSubmitResponse {
    Boolean success;
    String message;
    AiModerationResult aiModerationResult;
}
