package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MembershipRewardServiceTest {
    @Mock MembershipRewardRepository rewardRepository;
    @Mock MembershipRewardRedemptionRepository redemptionRepository;
    @Mock UserMembershipRepository membershipRepository;
    @Mock MembershipPointTransactionRepository pointRepository;
    @Mock UserProfileRepository profileRepository;
    @Mock UserRepository userRepository;
    @InjectMocks MembershipRewardService rewardService;

    private User user;
    private UserMembership membership;
    private UserProfile profile;
    private MembershipReward reward;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("diemmy", "unused"));
        user = User.builder().userId("customer-1").username("diemmy").build();
        membership = UserMembership.builder()
                .membershipId(10L).user(user).status(MembershipStatus.ACTIVE)
                .startAt(LocalDateTime.now().minusMonths(1)).endAt(LocalDateTime.now().plusMonths(11))
                .build();
        profile = UserProfile.builder().userId("customer-1").fullName("Diem My").loyaltyPoints(96_000).build();
        reward = MembershipReward.builder()
                .rewardId(5L).code("GIFT_POPCORN_50K").name("01 bắp rang cỡ nhỏ")
                .type(MembershipRewardType.GIFT).target(MembershipRewardTarget.COUNTER_GIFT)
                .status(MembershipRewardStatus.ACTIVE)
                .pointCost(50_000).valueAmount(50_000).stockQuantity(10)
                .validityDays(30).maxRedemptionsPerCycle(3).displayOrder(1).build();

        when(userRepository.findByUsername("diemmy")).thenReturn(Optional.of(user));
        when(membershipRepository.findFirstByUserAndStatusForUpdate("customer-1", MembershipStatus.ACTIVE))
                .thenReturn(Optional.of(membership));
        when(profileRepository.findByUserIdForUpdate("customer-1")).thenReturn(Optional.of(profile));
        when(rewardRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(reward));
        when(redemptionRepository.countByMembership_MembershipIdAndReward_RewardIdAndCreatedAtGreaterThanEqual(
                eq(10L), eq(5L), any(LocalDateTime.class))).thenReturn(0L);
        lenient().when(redemptionRepository.save(any(MembershipRewardRedemption.class))).thenAnswer(invocation -> {
            MembershipRewardRedemption saved = invocation.getArgument(0);
            saved.setRedemptionId(20L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void redeemDeductsPointsAndStockAndWritesImmutableLedgerEntry() {
        var response = rewardService.redeem(5L);

        assertEquals(46_000, profile.getLoyaltyPoints());
        assertEquals(9, reward.getStockQuantity());
        assertEquals(50_000, response.getPointsSpent());
        assertEquals(46_000, response.getPointsBalance());
        assertEquals(MembershipRedemptionStatus.AVAILABLE.name(), response.getStatus());
        assertTrue(response.getRedemptionCode().startsWith("MR"));

        ArgumentCaptor<MembershipPointTransaction> transactionCaptor =
                ArgumentCaptor.forClass(MembershipPointTransaction.class);
        verify(pointRepository).save(transactionCaptor.capture());
        assertEquals(MembershipPointType.REDEEM, transactionCaptor.getValue().getType());
        assertEquals(-50_000, transactionCaptor.getValue().getPoints());
        assertEquals(46_000, transactionCaptor.getValue().getBalanceAfter());
    }

    @Test
    void redeemRejectsInsufficientBalanceWithoutChangingAnything() {
        profile.setLoyaltyPoints(20_000);

        AppException exception = assertThrows(AppException.class, () -> rewardService.redeem(5L));

        assertEquals("Bạn không đủ điểm để đổi phần thưởng này.", exception.getCustomMessage());
        assertEquals(20_000, profile.getLoyaltyPoints());
        assertEquals(10, reward.getStockQuantity());
        verify(profileRepository, never()).save(any());
        verify(redemptionRepository, never()).save(any());
        verify(pointRepository, never()).save(any());
    }
}
