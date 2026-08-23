package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_contact")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomerContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contact_id")
    Long contactId;

    @Column(name = "sender_name", nullable = false)
    String senderName;

    @Column(name = "sender_email", nullable = false)
    String senderEmail;

    @Column(name = "subject", nullable = false)
    String subject;

    @Column(name = "message", columnDefinition = "text", nullable = false)
    String message;

    @Column(name = "masked_message", columnDefinition = "text")
    String maskedMessage;

    @Column(name = "ai_approved", nullable = false)
    Boolean aiApproved;

    @Column(name = "status", nullable = false)
    String status; // "RECEIVED", "REPLIED"

    @Column(name = "ai_reason", columnDefinition = "text")
    String aiReason;

    @Column(name = "bad_words", columnDefinition = "text")
    String badWords; // comma-separated bad words found by AI

    @Column(name = "admin_reply", columnDefinition = "text")
    String adminReply;

    @Column(name = "replied_at")
    LocalDateTime repliedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;
}
