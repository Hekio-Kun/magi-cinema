package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiModerationResult {
    Boolean isValid;
    String reason;
    List<String> badWords;
    String suggestion;
    String maskedText;
}
