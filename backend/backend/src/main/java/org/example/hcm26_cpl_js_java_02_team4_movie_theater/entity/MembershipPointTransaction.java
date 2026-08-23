package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPointType;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "membership_point_transactions", indexes = {
        @Index(name = "idx_point_member_created", columnList = "membership_id,created_at")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MembershipPointTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long transactionId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private UserMembership membership;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipPointType type;
    @Column(nullable = false)
    private Integer points;
    @Column(nullable = false)
    private Integer balanceAfter;
    @Column(length = 255)
    private String description;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
