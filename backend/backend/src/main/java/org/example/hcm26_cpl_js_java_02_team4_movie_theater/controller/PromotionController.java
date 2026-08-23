package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionEvaluationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionCatalogResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionUsageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionValidationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PromotionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/promotions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PromotionController {

    PromotionService promotionService;

    @GetMapping
    public ApiResponse<List<PromotionCatalogResponse>> getPromotionCatalog() {
        return ApiResponse.<List<PromotionCatalogResponse>>builder()
                .result(promotionService.getPromotionCatalog())
                .build();
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<List<PromotionResponse>> getPromotions(
            @RequestParam(required = false) PromotionStatus status,
            @RequestParam(required = false) PromotionType type) {
        return ApiResponse.<List<PromotionResponse>>builder()
                .result(promotionService.getPromotions(status, type))
                .build();
    }

    @GetMapping("/admin/{promotionId}")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<PromotionResponse> getPromotion(@PathVariable Long promotionId) {
        return ApiResponse.<PromotionResponse>builder()
                .result(promotionService.getPromotion(promotionId))
                .build();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<PromotionResponse> createPromotion(@Valid @RequestBody PromotionRequest request) {
        return ApiResponse.<PromotionResponse>builder()
                .message("Tạo promotion ở trạng thái nháp thành công.")
                .result(promotionService.createPromotion(request))
                .build();
    }

    @PutMapping("/{promotionId}")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<PromotionResponse> updatePromotion(
            @PathVariable Long promotionId,
            @Valid @RequestBody PromotionRequest request) {
        return ApiResponse.<PromotionResponse>builder()
                .message("Cập nhật promotion thành công.")
                .result(promotionService.updatePromotion(promotionId, request))
                .build();
    }

    @PatchMapping("/{promotionId}/activate")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<PromotionResponse> activatePromotion(@PathVariable Long promotionId) {
        return ApiResponse.<PromotionResponse>builder()
                .message("Kích hoạt promotion thành công.")
                .result(promotionService.activatePromotion(promotionId))
                .build();
    }

    @PatchMapping("/{promotionId}/deactivate")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<PromotionResponse> deactivatePromotion(@PathVariable Long promotionId) {
        return ApiResponse.<PromotionResponse>builder()
                .message("Vô hiệu hóa promotion thành công.")
                .result(promotionService.deactivatePromotion(promotionId))
                .build();
    }

    @GetMapping("/available")
    public ApiResponse<List<PromotionEvaluationResponse>> getAvailablePromotions(
            @RequestParam Integer orderAmount,
            @RequestParam(required = false) PaymentMethod paymentMethod) {
        return ApiResponse.<List<PromotionEvaluationResponse>>builder()
                .result(promotionService.getAvailablePromotions(orderAmount, paymentMethod))
                .build();
    }

    @PostMapping("/validate")
    public ApiResponse<PromotionEvaluationResponse> validatePromotion(
            @Valid @RequestBody PromotionValidationRequest request) {
        return ApiResponse.<PromotionEvaluationResponse>builder()
                .message("Promotion hợp lệ.")
                .result(promotionService.validatePromotion(request))
                .build();
    }

    @GetMapping("/admin/usages")
    @PreAuthorize("hasAuthority('PROMOTION_MANAGE')")
    public ApiResponse<List<PromotionUsageResponse>> getUsageHistory() {
        return ApiResponse.<List<PromotionUsageResponse>>builder()
                .result(promotionService.getUsageHistory())
                .build();
    }

    @GetMapping("/my-usages")
    public ApiResponse<List<PromotionUsageResponse>> getMyUsageHistory() {
        return ApiResponse.<List<PromotionUsageResponse>>builder()
                .result(promotionService.getMyUsageHistory())
                .build();
    }
}
