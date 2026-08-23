package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactResponse {
    Long contactId;
    String senderName;
    String senderEmail;
    String subject;
    String message;       // original message
    String maskedMessage; // message with bad words replaced by ***
    Boolean aiApproved;
    String aiReason;
    List<String> badWords;
    String status;
    String adminReply;
    String repliedAt;
    String createdAt;
}
