package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.MembershipRewardRedemptionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.MembershipRewardResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.MembershipRewardUpsertRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MembershipRewardService {
    private final MembershipRewardRepository rewardRepository;
    private final MembershipRewardRedemptionRepository redemptionRepository;
    private final UserMembershipRepository membershipRepository;
    private final MembershipPointTransactionRepository pointRepository;
    private final UserProfileRepository profileRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MembershipRewardResponse> getAdminRewards() {
        return rewardRepository.findAll().stream()
                .filter(reward -> reward.getType() == MembershipRewardType.GIFT)
                .sorted(Comparator.comparing(reward -> Optional.ofNullable(reward.getDisplayOrder()).orElse(0)))
                .map(this::toAdminRewardResponse).toList();
    }

    @Transactional
    public MembershipRewardResponse createReward(MembershipRewardUpsertRequest request) {
        String code = normalizeCode(request.getCode());
        if (rewardRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw validation("Mã phần thưởng hội viên đã tồn tại.");
        }
        MembershipReward reward = new MembershipReward();
        applyRewardRequest(reward, request, code);
        return toAdminRewardResponse(rewardRepository.save(reward));
    }

    @Transactional
    public MembershipRewardResponse updateReward(Long rewardId, MembershipRewardUpsertRequest request) {
        MembershipReward reward = rewardRepository.findByIdForUpdate(rewardId)
                .orElseThrow(() -> validation("Không tìm thấy phần thưởng hội viên."));
        String code = normalizeCode(request.getCode());
        rewardRepository.findByCodeIgnoreCase(code)
                .filter(existing -> !existing.getRewardId().equals(rewardId))
                .ifPresent(existing -> { throw validation("Mã phần thưởng hội viên đã tồn tại."); });
        applyRewardRequest(reward, request, code);
        return toAdminRewardResponse(rewardRepository.save(reward));
    }

    @Transactional(readOnly = true)
    public List<MembershipRewardResponse> getAvailableRewards() {
        User user = currentUser();
        UserMembership membership = requireActiveMembership(user.getUserId());
        UserProfile profile = profileRepository.findById(user.getUserId())
                .orElseThrow(() -> validation("Không tìm thấy hồ sơ khách hàng."));
        int balance = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0);
        LocalDateTime cycleStart = cycleStart(membership);

        return rewardRepository.findByStatusOrderByDisplayOrderAscRewardIdAsc(MembershipRewardStatus.ACTIVE)
                .stream()
                .filter(reward -> reward.getType() == MembershipRewardType.GIFT)
                .map(reward -> toRewardResponse(reward, membership, cycleStart, balance))
                .toList();
    }

    @Transactional
    public MembershipRewardRedemptionResponse redeem(Long rewardId) {
        User user = currentUser();
        UserMembership membership = membershipRepository.findFirstByUserAndStatusForUpdate(
                        user.getUserId(), MembershipStatus.ACTIVE)
                .orElseThrow(() -> validation("Tài khoản chưa đăng ký hội viên hoặc Membership đang bị khóa."));
        ensureMembershipUsable(membership);

        UserProfile profile = profileRepository.findByUserIdForUpdate(user.getUserId())
                .orElseThrow(() -> validation("Không tìm thấy hồ sơ khách hàng."));
        MembershipReward reward = rewardRepository.findByIdForUpdate(rewardId)
                .orElseThrow(() -> validation("Không tìm thấy phần thưởng."));

        if (reward.getStatus() != MembershipRewardStatus.ACTIVE) {
            throw validation("Phần thưởng hiện không còn mở đổi.");
        }
        if (reward.getType() != MembershipRewardType.GIFT) {
            throw validation("Điểm hội viên chỉ được dùng để đổi quà tặng nhận tại quầy.");
        }
        if (reward.getStockQuantity() == null || reward.getStockQuantity() <= 0) {
            throw validation("Phần thưởng đã hết số lượng.");
        }
        int pointCost = Optional.ofNullable(reward.getPointCost()).orElse(0);
        if (pointCost <= 0) {
            throw validation("Số điểm đổi thưởng chưa được cấu hình hợp lệ.");
        }

        LocalDateTime now = LocalDateTime.now();
        long redeemedThisCycle = redemptionRepository
                .countByMembership_MembershipIdAndReward_RewardIdAndCreatedAtGreaterThanEqual(
                        membership.getMembershipId(), reward.getRewardId(), cycleStart(membership));
        int limit = Optional.ofNullable(reward.getMaxRedemptionsPerCycle()).orElse(0);
        if (limit > 0 && redeemedThisCycle >= limit) {
            throw validation("Bạn đã đạt giới hạn đổi phần thưởng này trong chu kỳ hiện tại.");
        }

        int currentBalance = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0);
        if (currentBalance < pointCost) {
            throw validation("Bạn không đủ điểm để đổi phần thưởng này.");
        }

        int newBalance = currentBalance - pointCost;
        profile.setLoyaltyPoints(newBalance);
        profileRepository.save(profile);
        reward.setStockQuantity(reward.getStockQuantity() - 1);
        rewardRepository.save(reward);

        MembershipRewardRedemption redemption = redemptionRepository.save(MembershipRewardRedemption.builder()
                .membership(membership)
                .reward(reward)
                .redemptionCode(generateRedemptionCode())
                .rewardNameSnapshot(reward.getName())
                .rewardTypeSnapshot(MembershipRewardType.GIFT)
                .rewardTargetSnapshot(MembershipRewardTarget.COUNTER_GIFT)
                .pointsSpent(pointCost)
                .valueAmountSnapshot(0)
                .termsSnapshot(reward.getTerms())
                .status(MembershipRedemptionStatus.AVAILABLE)
                .expiresAt(now.plusDays(Math.max(1, Optional.ofNullable(reward.getValidityDays()).orElse(1))))
                .build());

        pointRepository.save(MembershipPointTransaction.builder()
                .membership(membership)
                .type(MembershipPointType.REDEEM)
                .points(-pointCost)
                .balanceAfter(newBalance)
                .description("Đổi " + reward.getName() + " · Mã " + redemption.getRedemptionCode())
                .build());

        return toRedemptionResponse(redemption, newBalance);
    }

    @Transactional
    public MembershipRewardRedemptionResponse claimGiftAtCounter(String code) {
        if (code == null || code.isBlank()) {
            throw validation("Vui lòng nhập mã nhận quà.");
        }
        MembershipRewardRedemption redemption = redemptionRepository.findByCodeForUpdate(code.trim())
                .orElseThrow(() -> validation("Mã nhận quà không tồn tại."));
        if (redemption.getRewardTypeSnapshot() != MembershipRewardType.GIFT) {
            throw validation("Mã này không phải quà tặng hội viên.");
        }
        if (redemption.getStatus() != MembershipRedemptionStatus.AVAILABLE) {
            throw validation("Quà tặng đã được nhận hoặc không còn khả dụng.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (!redemption.getExpiresAt().isAfter(now)) {
            redemption.setStatus(MembershipRedemptionStatus.EXPIRED);
            redemptionRepository.save(redemption);
            throw validation("Mã nhận quà đã hết hạn.");
        }
        redemption.setStatus(MembershipRedemptionStatus.USED);
        redemption.setUsedAt(now);
        return toRedemptionResponse(redemptionRepository.save(redemption), null);
    }

    @Transactional
    public List<MembershipRewardRedemptionResponse> getMyRedemptions() {
        UserMembership membership = requireActiveMembership(currentUser().getUserId());
        LocalDateTime now = LocalDateTime.now();
        List<MembershipRewardRedemption> redemptions = redemptionRepository
                .findByMembership_MembershipIdOrderByCreatedAtDesc(membership.getMembershipId());
        boolean changed = false;
        for (MembershipRewardRedemption redemption : redemptions) {
            if (redemption.getStatus() == MembershipRedemptionStatus.AVAILABLE
                    && !redemption.getExpiresAt().isAfter(now)) {
                redemption.setStatus(MembershipRedemptionStatus.EXPIRED);
                changed = true;
            }
        }
        if (changed) redemptionRepository.saveAll(redemptions);
        return redemptions.stream()
                .filter(redemption -> redemption.getRewardTypeSnapshot() == MembershipRewardType.GIFT)
                .map(redemption -> toRedemptionResponse(redemption, null)).toList();
    }

    private MembershipRewardResponse toRewardResponse(MembershipReward reward, UserMembership membership,
                                                       LocalDateTime cycleStart, int balance) {
        long used = redemptionRepository.countByMembership_MembershipIdAndReward_RewardIdAndCreatedAtGreaterThanEqual(
                membership.getMembershipId(), reward.getRewardId(), cycleStart);
        int limit = Optional.ofNullable(reward.getMaxRedemptionsPerCycle()).orElse(0);
        String unavailableReason = null;
        if (reward.getStockQuantity() == null || reward.getStockQuantity() <= 0) {
            unavailableReason = "Đã hết số lượng";
        } else if (limit > 0 && used >= limit) {
            unavailableReason = "Đã đạt giới hạn trong chu kỳ";
        } else if (reward.getPointCost() != null && balance < reward.getPointCost()) {
            unavailableReason = "Chưa đủ điểm";
        }
        return MembershipRewardResponse.builder()
                .rewardId(reward.getRewardId()).code(reward.getCode()).name(reward.getName())
                .description(reward.getDescription()).terms(reward.getTerms())
                .type(reward.getType() != null ? reward.getType().name() : null)
                .target(resolveTarget(reward).name())
                .pointCost(reward.getPointCost())
                .stockQuantity(reward.getStockQuantity()).validityDays(reward.getValidityDays())
                .maxRedemptionsPerCycle(limit).redeemedThisCycle(Math.toIntExact(used))
                .redeemable(unavailableReason == null).unavailableReason(unavailableReason)
                .status(reward.getStatus() != null ? reward.getStatus().name() : null).displayOrder(reward.getDisplayOrder()).build();
    }

    private MembershipRewardRedemptionResponse toRedemptionResponse(
            MembershipRewardRedemption redemption, Integer pointsBalance) {
        return MembershipRewardRedemptionResponse.builder()
                .redemptionId(redemption.getRedemptionId())
                .redemptionCode(redemption.getRedemptionCode())
                .rewardName(redemption.getRewardNameSnapshot())
                .rewardType(redemption.getRewardTypeSnapshot().name())
                .rewardTarget(resolveTarget(redemption).name())
                .pointsSpent(redemption.getPointsSpent())
                .terms(redemption.getTermsSnapshot())
                .status(redemption.getStatus().name())
                .expiresAt(redemption.getExpiresAt()).usedAt(redemption.getUsedAt())
                .createdAt(redemption.getCreatedAt()).pointsBalance(pointsBalance).build();
    }

    private MembershipRewardResponse toAdminRewardResponse(MembershipReward reward) {
        return MembershipRewardResponse.builder()
                .rewardId(reward.getRewardId()).code(reward.getCode()).name(reward.getName())
                .description(reward.getDescription()).terms(reward.getTerms())
                .type(reward.getType() != null ? reward.getType().name() : null)
                .target(resolveTarget(reward).name()).pointCost(reward.getPointCost())
                .stockQuantity(reward.getStockQuantity())
                .validityDays(reward.getValidityDays()).maxRedemptionsPerCycle(reward.getMaxRedemptionsPerCycle())
                .status(reward.getStatus() != null ? reward.getStatus().name() : null).displayOrder(reward.getDisplayOrder())
                .redeemable(reward.getStatus() == MembershipRewardStatus.ACTIVE
                        && Optional.ofNullable(reward.getStockQuantity()).orElse(0) > 0)
                .build();
    }

    private void applyRewardRequest(MembershipReward reward, MembershipRewardUpsertRequest request, String code) {
        reward.setCode(code);
        reward.setName(request.getName().trim());
        reward.setDescription(trimToNull(request.getDescription()));
        reward.setTerms(trimToNull(request.getTerms()));
        reward.setType(MembershipRewardType.GIFT);
        reward.setTarget(MembershipRewardTarget.COUNTER_GIFT);
        reward.setPointCost(request.getPointCost());
        // Cột được giữ để tương thích dữ liệu cũ; quà hiện vật không có giá trị giảm tiền.
        reward.setValueAmount(0);
        reward.setStockQuantity(request.getStockQuantity());
        reward.setValidityDays(request.getValidityDays());
        reward.setMaxRedemptionsPerCycle(request.getMaxRedemptionsPerCycle());
        reward.setDisplayOrder(request.getDisplayOrder());
        reward.setStatus(request.getStatus());
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]+", "_");
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private MembershipRewardTarget resolveTarget(MembershipReward reward) {
        if (reward.getTarget() != null) return reward.getTarget();
        if (reward.getType() == MembershipRewardType.GIFT) return MembershipRewardTarget.COUNTER_GIFT;
        return reward.getCode() != null && reward.getCode().contains("CONCESSION")
                ? MembershipRewardTarget.CONCESSION : MembershipRewardTarget.TICKET;
    }

    private MembershipRewardTarget resolveTarget(MembershipRewardRedemption redemption) {
        if (redemption.getRewardTargetSnapshot() != null) return redemption.getRewardTargetSnapshot();
        return resolveTarget(redemption.getReward());
    }

    private UserMembership requireActiveMembership(String userId) {
        UserMembership membership = membershipRepository
                .findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(userId, MembershipStatus.ACTIVE)
                .orElseThrow(() -> validation("Tài khoản chưa đăng ký hội viên hoặc Membership đang bị khóa."));
        ensureMembershipUsable(membership);
        return membership;
    }

    private void ensureMembershipUsable(UserMembership membership) {
        if (membership.getEndAt() != null && !membership.getEndAt().isAfter(LocalDateTime.now())) {
            throw validation("Chu kỳ hội viên đã hết hạn. Vui lòng tải lại trang để bắt đầu chu kỳ mới.");
        }
    }

    private LocalDateTime cycleStart(UserMembership membership) {
        if (membership.getStartAt() != null) return membership.getStartAt();
        if (membership.getActivatedAt() != null) return membership.getActivatedAt();
        if (membership.getCreatedAt() != null) return membership.getCreatedAt();
        return LocalDateTime.of(2000, 1, 1, 0, 0);
    }

    private String generateRedemptionCode() {
        return "MR" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private AppException validation(String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, message);
    }
}
