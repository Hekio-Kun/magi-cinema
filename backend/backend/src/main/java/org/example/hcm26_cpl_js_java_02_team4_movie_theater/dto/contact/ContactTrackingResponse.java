package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContactTrackingResponse {
    String ticketCode;
    String subject;
    String category;
    String priority;
    String status;
    String createdAt;
    String updatedAt;
    String dueAt;
    String resolvedAt;
    List<ContactReplyResponse> replies;
}
