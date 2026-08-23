package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipRewardBookingLifecycleTest {
    @Mock MembershipRewardRepository rewardRepository;
    @Mock MembershipRewardRedemptionRepository redemptionRepository;
    @Mock UserMembershipRepository membershipRepository;
    @Mock MembershipPointTransactionRepository pointRepository;
    @Mock UserProfileRepository profileRepository;
    @Mock UserRepository userRepository;
    @InjectMocks MembershipRewardService rewardService;

    @Test
    void giftIsClaimedAtCounterOnlyOnceWithoutRefundingPoints() {
        User user = User.builder().userId("customer-1").build();
        UserMembership membership = UserMembership.builder()
                .membershipId(10L).user(user).status(MembershipStatus.ACTIVE).build();
        MembershipReward reward = MembershipReward.builder()
                .rewardId(5L).type(MembershipRewardType.GIFT)
                .target(MembershipRewardTarget.COUNTER_GIFT).build();
        MembershipRewardRedemption redemption = MembershipRewardRedemption.builder()
                .redemptionId(20L).membership(membership).reward(reward)
                .redemptionCode("MRGIFT000001")
                .rewardNameSnapshot("01 bắp rang cỡ nhỏ")
                .rewardTypeSnapshot(MembershipRewardType.GIFT)
                .rewardTargetSnapshot(MembershipRewardTarget.COUNTER_GIFT)
                .valueAmountSnapshot(20_000).pointsSpent(20_000)
                .status(MembershipRedemptionStatus.AVAILABLE)
                .expiresAt(LocalDateTime.now().plusDays(10)).build();
        when(redemptionRepository.findByCodeForUpdate("MRGIFT000001"))
                .thenReturn(Optional.of(redemption));
        when(redemptionRepository.save(redemption)).thenReturn(redemption);

        var response = rewardService.claimGiftAtCounter("MRGIFT000001");

        assertEquals(MembershipRedemptionStatus.USED, redemption.getStatus());
        assertNotNull(redemption.getUsedAt());
        assertEquals(MembershipRedemptionStatus.USED.name(), response.getStatus());
        assertEquals(20_000, redemption.getPointsSpent());
    }
}
