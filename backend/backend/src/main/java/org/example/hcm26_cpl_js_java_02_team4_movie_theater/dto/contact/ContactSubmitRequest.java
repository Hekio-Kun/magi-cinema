package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactCategory;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactSubmitRequest {

    @NotBlank(message = "Vui lòng nhập họ tên.")
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự.")
    String senderName;

    @NotBlank(message = "Vui lòng nhập email.")
    @Email(message = "Email không hợp lệ.")
    @Size(max = 150, message = "Email không được vượt quá 150 ký tự.")
    String senderEmail;

    @NotBlank(message = "Vui lòng chọn hoặc nhập chủ đề.")
    @Size(max = 200, message = "Chủ đề không được vượt quá 200 ký tự.")
    String subject;

    ContactCategory category;

    @NotBlank(message = "Vui lòng nhập nội dung liên hệ.")
    @Size(min = 10, max = 5000, message = "Nội dung phải từ 10 đến 5000 ký tự.")
    String message;
}
