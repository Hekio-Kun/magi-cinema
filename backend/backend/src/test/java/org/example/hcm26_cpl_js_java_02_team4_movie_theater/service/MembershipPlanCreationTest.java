package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.MembershipPlanCreateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.MembershipPlanResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipPlan;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipPlanCreationTest {
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
    void adminCanCreateTierAndRangesAreReorderedAutomatically() {
        MembershipPlan member = plan(1L, "MEMBER", 0L);
        MembershipPlan vvip = plan(3L, "VVIP", 4_000_000L);
        List<MembershipPlan> plans = new ArrayList<>(List.of(member, vvip));
        when(planRepository.findByCodeIgnoreCase("VIP")).thenReturn(Optional.empty());
        when(planRepository.findAll()).thenAnswer(invocation -> plans);
        when(planRepository.save(any(MembershipPlan.class))).thenAnswer(invocation -> {
            MembershipPlan saved = invocation.getArgument(0);
            saved.setPlanId(2L);
            plans.add(saved);
            return saved;
        });

        MembershipPlanCreateRequest request = new MembershipPlanCreateRequest();
        request.setCode("vip");
        request.setName("VIP");
        request.setDescription("Hạng dành cho khách hàng thân thiết");
        request.setAnnualSpendMin(2_000_000L);
        request.setTicketEarnPercent(BigDecimal.valueOf(7));
        request.setConcessionEarnPercent(BigDecimal.valueOf(3));
        request.setAnnualFreeTickets(4);
        request.setFreeTicketType(MembershipFreeTicketType.IMAX);
        request.setStatus(MembershipPlanStatus.ACTIVE);

        MembershipPlanResponse result = membershipService.createPlan(request);

        assertEquals("VIP", result.getCode());
        assertEquals(MembershipFreeTicketType.IMAX, result.getFreeTicketType());
        assertEquals(2_000_000L, member.getAnnualSpendMax());
        assertEquals(4_000_000L, result.getAnnualSpendMax());
        assertNull(vvip.getAnnualSpendMax());
    }

    private MembershipPlan plan(Long id, String code, Long spendMin) {
        return MembershipPlan.builder()
                .planId(id).code(code).name(code).annualSpendMin(spendMin)
                .ticketEarnPercent(BigDecimal.ZERO).concessionEarnPercent(BigDecimal.ZERO)
                .annualFreeTickets(0).status(MembershipPlanStatus.ACTIVE)
                .build();
    }
}
