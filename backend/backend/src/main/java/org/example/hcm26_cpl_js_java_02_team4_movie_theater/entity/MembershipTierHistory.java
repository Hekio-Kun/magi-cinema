package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "membership_tier_history")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MembershipTierHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private UserMembership membership;
    @Column(length = 30)
    private String fromTier;
    @Column(nullable = false, length = 30)
    private String toTier;
    @Column(nullable = false)
    private Long annualSpend;
    @Column(nullable = false)
    private Integer spendYear;
    @Column(nullable = false, length = 40)
    private String reason;
    @CreationTimestamp
    private LocalDateTime createdAt;
}
