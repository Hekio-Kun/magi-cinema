package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.*;

@Entity
@Table(name = "membership_benefits", indexes = {
        @Index(name = "idx_benefit_member_status", columnList = "membership_id,status")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MembershipBenefit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long benefitId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private UserMembership membership;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private MembershipBenefitType type;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipBenefitStatus status;
    @Column(nullable = false)
    private Integer benefitYear;
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private MembershipFreeTicketType freeTicketType;
    @Column(nullable = false)
    private LocalDate expiresAt;
    private LocalDateTime usedAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;
    @CreationTimestamp
    private LocalDateTime createdAt;
}
