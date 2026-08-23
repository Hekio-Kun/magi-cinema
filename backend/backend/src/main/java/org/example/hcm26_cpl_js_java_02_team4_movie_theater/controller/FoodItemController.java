package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemMultipartRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.FoodItemService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/food-items")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FoodItemController {
    FoodItemService foodItemService;

    @GetMapping
    public ApiResponse<List<FoodItemResponse>> getActiveFoodItems() {
        return ApiResponse.<List<FoodItemResponse>>builder()
                .result(foodItemService.getActiveFoodItems())
                .build();
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<List<FoodItemResponse>> getAllFoodItems(@RequestParam(required = false) Boolean isActive) {
        return ApiResponse.<List<FoodItemResponse>>builder()
                .result(foodItemService.getAllFoodItems(isActive))
                .build();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<FoodItemResponse> createFoodItem(@Valid @RequestBody FoodItemRequest request) {
        return ApiResponse.<FoodItemResponse>builder()
                .message("Tạo món lẻ thành công!")
                .result(foodItemService.createFoodItem(request))
                .build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<FoodItemResponse> createFoodItemWithImage(@Valid @ModelAttribute FoodItemMultipartRequest request) {
        return ApiResponse.<FoodItemResponse>builder()
                .message("Tạo món lẻ thành công!")
                .result(foodItemService.createFoodItem(request))
                .build();
    }

    @PutMapping(value = "/{foodItemId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<FoodItemResponse> updateFoodItem(
            @PathVariable Long foodItemId,
            @Valid @RequestBody FoodItemRequest request) {
        return ApiResponse.<FoodItemResponse>builder()
                .message("Cập nhật món lẻ thành công!")
                .result(foodItemService.updateFoodItem(foodItemId, request))
                .build();
    }

    @PutMapping(value = "/{foodItemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<FoodItemResponse> updateFoodItemWithImage(
            @PathVariable Long foodItemId,
            @Valid @ModelAttribute FoodItemMultipartRequest request) {
        return ApiResponse.<FoodItemResponse>builder()
                .message("Cập nhật món lẻ thành công!")
                .result(foodItemService.updateFoodItem(foodItemId, request))
                .build();
    }

    @DeleteMapping("/{foodItemId}")
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<Void> deleteFoodItem(@PathVariable Long foodItemId) {
        foodItemService.deleteFoodItem(foodItemId);
        return ApiResponse.<Void>builder()
                .message("Vô hiệu hóa món lẻ thành công!")
                .build();
    }
}
