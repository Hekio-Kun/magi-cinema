package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipCycleRolloverTest {
    @Mock MembershipPlanRepository planRepository;
    @Mock UserMembershipRepository membershipRepository;
    @Mock MembershipPointTransactionRepository pointRepository;
    @Mock MembershipTierHistoryRepository tierHistoryRepository;
    @Mock MembershipBenefitRepository benefitRepository;
    @Mock UserRepository userRepository;
    @Mock UserProfileRepository profileRepository;
    @Mock BookingRepository bookingRepository;
    @InjectMocks MembershipService membershipService;

    @Test
    void expiresPointsAndStartsNextCycleOnEnrollmentAnniversary() {
        LocalDateTime expiredCycleEnd = LocalDateTime.now().minusDays(1);
        User user = User.builder().userId("customer-1").build();
        UserProfile profile = UserProfile.builder().userId("customer-1").loyaltyPoints(12_500).build();
        MembershipPlan member = plan(1L, "MEMBER", 0L);
        MembershipPlan vip = plan(2L, "VIP", 2_000_000L);
        UserMembership membership = UserMembership.builder()
                .membershipId(10L).user(user).plan(member).status(MembershipStatus.ACTIVE)
                .startAt(expiredCycleEnd.minusYears(1)).endAt(expiredCycleEnd)
                .annualSpend(2_500_000L).spendYear(expiredCycleEnd.minusYears(1).getYear())
                .build();
        MembershipBenefit oldBenefit = MembershipBenefit.builder()
                .membership(membership).type(MembershipBenefitType.FREE_2D_TICKET)
                .status(MembershipBenefitStatus.AVAILABLE)
                .benefitYear(expiredCycleEnd.minusYears(1).getYear())
                .expiresAt(expiredCycleEnd.toLocalDate()).build();

        when(planRepository.findAll()).thenReturn(List.of(member, vip));
        when(profileRepository.findByUserIdForUpdate("customer-1")).thenReturn(Optional.of(profile));
        when(benefitRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(oldBenefit));
        when(membershipRepository.save(any(UserMembership.class))).thenAnswer(invocation -> invocation.getArgument(0));

        membershipService.rolloverIfNeeded(membership);

        assertEquals("VIP", membership.getPlan().getCode());
        assertEquals(0L, membership.getAnnualSpend());
        assertEquals(expiredCycleEnd, membership.getStartAt());
        assertEquals(expiredCycleEnd.plusYears(1), membership.getEndAt());
        assertEquals(expiredCycleEnd.getYear(), membership.getSpendYear());
        assertEquals(0, profile.getLoyaltyPoints());
        assertEquals(MembershipBenefitStatus.EXPIRED, oldBenefit.getStatus());

        ArgumentCaptor<MembershipPointTransaction> transaction =
                ArgumentCaptor.forClass(MembershipPointTransaction.class);
        verify(pointRepository).save(transaction.capture());
        assertEquals(MembershipPointType.EXPIRE, transaction.getValue().getType());
        assertEquals(-12_500, transaction.getValue().getPoints());
        assertEquals(0, transaction.getValue().getBalanceAfter());
    }

    private MembershipPlan plan(Long id, String code, long minimumSpend) {
        return MembershipPlan.builder()
                .planId(id).code(code).name(code).annualSpendMin(minimumSpend)
                .annualFreeTickets(0).status(MembershipPlanStatus.ACTIVE)
                .ticketEarnPercent(BigDecimal.ZERO).concessionEarnPercent(BigDecimal.ZERO)
                .build();
    }
}
