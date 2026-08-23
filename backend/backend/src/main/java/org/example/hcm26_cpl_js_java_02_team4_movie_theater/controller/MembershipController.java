package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.MembershipService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/memberships")
@RequiredArgsConstructor
public class MembershipController {
    private final MembershipService membershipService;
    private final org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.MembershipRewardService membershipRewardService;

    @GetMapping("/tiers")
    public ApiResponse<List<MembershipPlanResponse>> tiers() {
        return ApiResponse.<List<MembershipPlanResponse>>builder().result(membershipService.getActivePlans()).build();
    }

    /** Alias tạm thời để client cũ nâng cấp không bị gián đoạn. */
    @GetMapping("/plans")
    public ApiResponse<List<MembershipPlanResponse>> plans() { return tiers(); }

    @GetMapping("/me")
    public ApiResponse<MembershipResponse> mine() {
        return ApiResponse.<MembershipResponse>builder().result(membershipService.getMyMembership()).build();
    }

    @PostMapping("/enroll")
    public ApiResponse<MembershipResponse> enroll(@Valid @RequestBody MembershipEnrollRequest request) {
        return ApiResponse.<MembershipResponse>builder().message("Đăng ký hội viên thành công.")
                .result(membershipService.enroll(request)).build();
    }

    @GetMapping("/me/points")
    public ApiResponse<List<MembershipPointResponse>> points() {
        return ApiResponse.<List<MembershipPointResponse>>builder().result(membershipService.getMyPointHistory()).build();
    }

    @GetMapping("/rewards")
    public ApiResponse<List<MembershipRewardResponse>> rewards() {
        return ApiResponse.<List<MembershipRewardResponse>>builder()
                .result(membershipRewardService.getAvailableRewards()).build();
    }

    @PostMapping("/rewards/{rewardId}/redeem")
    public ApiResponse<MembershipRewardRedemptionResponse> redeemReward(@PathVariable Long rewardId) {
        return ApiResponse.<MembershipRewardRedemptionResponse>builder()
                .message("Đổi thưởng thành công. Điểm đã dùng không được hoàn lại.")
                .result(membershipRewardService.redeem(rewardId)).build();
    }

    @GetMapping("/me/rewards")
    public ApiResponse<List<MembershipRewardRedemptionResponse>> myRewards() {
        return ApiResponse.<List<MembershipRewardRedemptionResponse>>builder()
                .result(membershipRewardService.getMyRedemptions()).build();
    }

    @PostMapping("/rewards/redemptions/{code}/claim")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'BOOKING_MANAGE')")
    public ApiResponse<MembershipRewardRedemptionResponse> claimGift(@PathVariable String code) {
        return ApiResponse.<MembershipRewardRedemptionResponse>builder()
                .message("Đã xác nhận trao quà cho hội viên.")
                .result(membershipRewardService.claimGiftAtCounter(code)).build();
    }

    @GetMapping("/admin/rewards")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<MembershipRewardResponse>> adminRewards() {
        return ApiResponse.<List<MembershipRewardResponse>>builder()
                .result(membershipRewardService.getAdminRewards()).build();
    }

    @PostMapping("/admin/rewards")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipRewardResponse> createReward(
            @Valid @RequestBody MembershipRewardUpsertRequest request) {
        return ApiResponse.<MembershipRewardResponse>builder()
                .message("Thêm phần thưởng hội viên thành công.")
                .result(membershipRewardService.createReward(request)).build();
    }

    @PutMapping("/admin/rewards/{rewardId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipRewardResponse> updateReward(
            @PathVariable Long rewardId,
            @Valid @RequestBody MembershipRewardUpsertRequest request) {
        return ApiResponse.<MembershipRewardResponse>builder()
                .message("Cập nhật phần thưởng hội viên thành công.")
                .result(membershipRewardService.updateReward(rewardId, request)).build();
    }

    @GetMapping("/me/benefits")
    public ApiResponse<List<MembershipBenefitResponse>> benefits() {
        return ApiResponse.<List<MembershipBenefitResponse>>builder().result(membershipService.getMyBenefits()).build();
    }

    @GetMapping("/me/tier-history")
    public ApiResponse<List<MembershipTierHistoryResponse>> tierHistory() {
        return ApiResponse.<List<MembershipTierHistoryResponse>>builder().result(membershipService.getMyTierHistory()).build();
    }

    @GetMapping("/users/{userId}/active")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<MembershipResponse> activeForCounter(@PathVariable String userId) {
        return ApiResponse.<MembershipResponse>builder()
                .result(membershipService.getActiveMembershipForStaff(userId)).build();
    }

    @GetMapping("/users/{userId}/benefits")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<List<MembershipBenefitResponse>> benefitsForCounter(@PathVariable String userId) {
        return ApiResponse.<List<MembershipBenefitResponse>>builder()
                .result(membershipService.getBenefitsForStaff(userId)).build();
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipAdminSummaryResponse> adminSummary() {
        return ApiResponse.<MembershipAdminSummaryResponse>builder().result(membershipService.getAdminSummary()).build();
    }

    @GetMapping("/admin/members")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<AdminMembershipResponse>> adminMembers() {
        return ApiResponse.<List<AdminMembershipResponse>>builder().result(membershipService.getAdminMemberships()).build();
    }

    @PatchMapping("/admin/members/{membershipId}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<AdminMembershipResponse> updateMemberStatus(
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipStatusUpdateRequest request) {
        return ApiResponse.<AdminMembershipResponse>builder()
                .message("Cập nhật trạng thái hội viên thành công.")
                .result(membershipService.updateMembershipStatus(membershipId, request.getStatus()))
                .build();
    }

    @GetMapping("/admin/subscriptions")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<AdminMembershipResponse>> legacyAdminMembers() { return adminMembers(); }

    @GetMapping("/admin/tiers")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<MembershipPlanResponse>> adminTiers() {
        return ApiResponse.<List<MembershipPlanResponse>>builder().result(membershipService.getAdminPlans()).build();
    }

    @GetMapping("/admin/plans")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<MembershipPlanResponse>> legacyAdminTiers() { return adminTiers(); }

    @PostMapping("/admin/tiers")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipPlanResponse> createTier(
            @Valid @RequestBody MembershipPlanCreateRequest request) {
        return ApiResponse.<MembershipPlanResponse>builder()
                .message("Thêm hạng hội viên thành công.")
                .result(membershipService.createPlan(request))
                .build();
    }

    @PutMapping("/admin/tiers/{tierId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipPlanResponse> updateTier(@PathVariable Long tierId,
            @Valid @RequestBody MembershipPlanUpdateRequest request) {
        return ApiResponse.<MembershipPlanResponse>builder().message("Cập nhật cấu hình hạng thành công.")
                .result(membershipService.updatePlan(tierId, request)).build();
    }

    @PutMapping("/admin/plans/{tierId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<MembershipPlanResponse> legacyUpdateTier(@PathVariable Long tierId,
            @Valid @RequestBody MembershipPlanUpdateRequest request) { return updateTier(tierId, request); }
}
