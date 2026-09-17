package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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

    @Column(name = "ticket_code", unique = true, length = 32)
    String ticketCode;

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

    @Column(name = "category", nullable = false, length = 30, columnDefinition = "varchar(30) default 'OTHER'")
    String category;

    @Column(name = "priority", nullable = false, length = 20, columnDefinition = "varchar(20) default 'NORMAL'")
    String priority;

    @Column(name = "status", nullable = false, length = 30)
    String status;

    @Column(name = "ai_reason", columnDefinition = "text")
    String aiReason;

    @Column(name = "bad_words", columnDefinition = "text")
    String badWords; // comma-separated bad words found by AI

    @Column(name = "admin_reply", columnDefinition = "text")
    String adminReply;

    @Column(name = "replied_at")
    LocalDateTime repliedAt;

    @Column(name = "assigned_to_user_id", length = 36)
    String assignedToUserId;

    @Column(name = "assigned_to_name", length = 100)
    String assignedToName;

    @Column(name = "due_at")
    LocalDateTime dueAt;

    @Column(name = "first_response_at")
    LocalDateTime firstResponseAt;

    @Column(name = "resolved_at")
    LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    LocalDateTime closedAt;

    @Column(name = "internal_note", columnDefinition = "text")
    String internalNote;

    @Builder.Default
    @Column(name = "archived", nullable = false, columnDefinition = "boolean default false")
    Boolean archived = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
