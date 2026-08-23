package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactReplyRequest {
    @NotBlank(message = "Nội dung phản hồi không được để trống")
    String replyMessage;
}
