package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.AdminMembershipResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipPlan;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserMembership;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipAdminStatusTest {
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
    void adminCanTemporarilyLockMembershipWithoutLockingUserAccount() {
        User user = User.builder().userId("customer-1").username("diemmy").email("diemmy@example.com").build();
        MembershipPlan plan = MembershipPlan.builder()
                .planId(1L).code("VIP").name("VIP")
                .ticketEarnPercent(BigDecimal.valueOf(7))
                .concessionEarnPercent(BigDecimal.valueOf(3))
                .build();
        UserMembership membership = UserMembership.builder()
                .membershipId(10L).user(user).plan(plan).status(MembershipStatus.ACTIVE)
                .annualSpend(2_500_000L).spendYear(2026).memberCode("MC001")
                .build();

        when(membershipRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(membership));
        when(membershipRepository.save(membership)).thenReturn(membership);
        when(profileRepository.findById("customer-1")).thenReturn(Optional.empty());

        AdminMembershipResponse response = membershipService.updateMembershipStatus(10L, MembershipStatus.LOCKED);

        assertEquals(MembershipStatus.LOCKED, membership.getStatus());
        assertEquals(MembershipStatus.LOCKED, response.getStatus());
    }
}
