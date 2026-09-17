package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactReplyResponse {
    Long replyId;
    String replyMessage;
    String staffName;
    Boolean emailDelivered;
    String createdAt;
}
