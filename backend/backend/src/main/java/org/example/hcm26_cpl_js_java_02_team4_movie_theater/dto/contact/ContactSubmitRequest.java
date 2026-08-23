package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactSubmitRequest {

    @NotBlank(message = "Vui lòng nhập họ tên.")
    String senderName;

    @NotBlank(message = "Vui lòng nhập email.")
    @Email(message = "Email không hợp lệ.")
    String senderEmail;

    @NotBlank(message = "Vui lòng chọn hoặc nhập chủ đề.")
    String subject;

    @NotBlank(message = "Vui lòng nhập nội dung liên hệ.")
    String message;
}
