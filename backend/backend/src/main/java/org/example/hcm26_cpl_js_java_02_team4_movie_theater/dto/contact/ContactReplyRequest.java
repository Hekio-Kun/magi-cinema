package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactReplyRequest {
    @NotBlank(message = "Nội dung phản hồi không được để trống")
    @Size(max = 5000, message = "Nội dung phản hồi không được vượt quá 5000 ký tự")
    String replyMessage;

    Boolean resolveAfterReply;
}
