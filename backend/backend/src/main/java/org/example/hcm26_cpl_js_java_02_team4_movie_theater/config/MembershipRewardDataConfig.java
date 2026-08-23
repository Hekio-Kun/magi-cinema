package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipReward;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipRewardTarget;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MembershipRewardRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class MembershipRewardDataConfig {
    private final MembershipRewardRepository rewardRepository;

    @Bean
    ApplicationRunner seedMembershipRewards() {
        return args -> {
            createIfMissing("GIFT_SMALL_POPCORN", "01 bắp rang cỡ nhỏ",
                    "Nhận một phần bắp rang cỡ nhỏ tại quầy.", "Xuất trình mã nhận thưởng cho Staff.",
                    80_000, 200, 30, 2, 1);
            createIfMissing("GIFT_COMBO_1", "01 combo bắp nước",
                    "Nhận một combo bắp và nước tiêu chuẩn tại quầy.", "Xuất trình mã nhận thưởng cho Staff.",
                    120_000, 100, 30, 2, 2);
            createIfMissing("GIFT_TEDDY_BEAR", "01 gấu bông MagiCinema",
                    "Nhận một gấu bông MagiCinema tại quầy.", "Xuất trình mã nhận thưởng cho Staff.",
                    180_000, 50, 30, 1, 3);
            hideLegacyNonGiftRewards();
        };
    }

    private void createIfMissing(String code, String name, String description, String terms,
                                 int pointCost, int stock, int validityDays,
                                 int maxPerCycle, int displayOrder) {
        if (rewardRepository.findByCodeIgnoreCase(code).isPresent()) return;
        rewardRepository.save(MembershipReward.builder()
                .code(code).name(name).description(description).terms(terms)
                .type(MembershipRewardType.GIFT).target(MembershipRewardTarget.COUNTER_GIFT)
                .pointCost(pointCost).valueAmount(0).stockQuantity(stock)
                .validityDays(validityDays).maxRedemptionsPerCycle(maxPerCycle)
                .displayOrder(displayOrder).status(MembershipRewardStatus.ACTIVE).build());
    }

    private void hideLegacyNonGiftRewards() {
        var rewards = rewardRepository.findAll();
        rewards.forEach(reward -> {
            if (reward.getType() == MembershipRewardType.GIFT) {
                reward.setTarget(MembershipRewardTarget.COUNTER_GIFT);
                reward.setValueAmount(0);
            } else {
                reward.setStatus(MembershipRewardStatus.INACTIVE);
            }
        });
        rewardRepository.saveAll(rewards);
    }
}
