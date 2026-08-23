package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipBenefitLifecycleTest {
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
    void holdsUsesAndReleasesBenefitWithBookingLifecycle() {
        User user = User.builder().userId("customer-1").build();
        UserMembership membership = UserMembership.builder()
                .membershipId(10L).user(user).status(MembershipStatus.ACTIVE).build();
        Booking booking = Booking.builder().bookingId(99L).user(user).build();
        MembershipBenefit benefit = MembershipBenefit.builder()
                .benefitId(7L).membership(membership)
                .type(MembershipBenefitType.FREE_2D_TICKET)
                .status(MembershipBenefitStatus.AVAILABLE)
                .benefitYear(LocalDate.now().getYear())
                .expiresAt(LocalDate.now().plusDays(10)).build();

        when(membershipRepository.findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(
                "customer-1", MembershipStatus.ACTIVE)).thenReturn(Optional.of(membership));
        when(benefitRepository.findAllByIdForUpdate(List.of(7L))).thenReturn(List.of(benefit));
        when(benefitRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        membershipService.holdBenefits("customer-1", booking, List.of(7L));
        assertEquals(MembershipBenefitStatus.HELD, benefit.getStatus());
        assertSame(booking, benefit.getBooking());

        when(benefitRepository.findByBooking_BookingIdAndStatus(99L, MembershipBenefitStatus.HELD))
                .thenReturn(List.of(benefit));
        membershipService.useHeldBenefits(booking);
        assertEquals(MembershipBenefitStatus.USED, benefit.getStatus());
        assertNotNull(benefit.getUsedAt());

        benefit.setStatus(MembershipBenefitStatus.HELD);
        membershipService.releaseHeldBenefits(booking);
        assertEquals(MembershipBenefitStatus.AVAILABLE, benefit.getStatus());
        assertNull(benefit.getBooking());
        assertNull(benefit.getUsedAt());
    }
}
