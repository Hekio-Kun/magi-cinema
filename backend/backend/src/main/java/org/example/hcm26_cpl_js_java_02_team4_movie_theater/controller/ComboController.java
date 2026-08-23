package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.ComboRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.ComboResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.ComboMultipartRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ComboService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/combos")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ComboController {

    ComboService comboService;

    @GetMapping
    public ApiResponse<List<ComboResponse>> getCombos() {
        return ApiResponse.<List<ComboResponse>>builder()
                .result(comboService.getActiveCombos())
                .build();
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<List<ComboResponse>> getCombosForAdmin(@RequestParam(required = false) ComboStatus status) {
        return ApiResponse.<List<ComboResponse>>builder()
                .result(comboService.getCombos(status))
                .build();
    }

    @GetMapping("/{comboId}")
    public ApiResponse<ComboResponse> getCombo(@PathVariable Long comboId) {
        return ApiResponse.<ComboResponse>builder()
                .result(comboService.getCombo(comboId))
                .build();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<ComboResponse> createCombo(@Valid @RequestBody ComboRequest request) {
        return ApiResponse.<ComboResponse>builder()
                .message("Tạo combo thành công!")
                .result(comboService.createCombo(request))
                .build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<ComboResponse> createComboWithImage(@Valid @ModelAttribute ComboMultipartRequest request) {
        return ApiResponse.<ComboResponse>builder()
                .message("Tạo combo thành công!")
                .result(comboService.createCombo(request))
                .build();
    }

    @PutMapping(value = "/{comboId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<ComboResponse> updateCombo(
            @PathVariable Long comboId,
            @Valid @RequestBody ComboRequest request) {
        return ApiResponse.<ComboResponse>builder()
                .message("Cập nhật combo thành công!")
                .result(comboService.updateCombo(comboId, request))
                .build();
    }

    @PutMapping(value = "/{comboId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<ComboResponse> updateComboWithImage(
            @PathVariable Long comboId,
            @Valid @ModelAttribute ComboMultipartRequest request) {
        return ApiResponse.<ComboResponse>builder()
                .message("Cập nhật combo thành công!")
                .result(comboService.updateCombo(comboId, request))
                .build();
    }

    @DeleteMapping("/{comboId}")
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<String> deleteCombo(@PathVariable Long comboId) {
        comboService.deleteCombo(comboId);
        return ApiResponse.<String>builder()
                .message("Vô hiệu hóa combo thành công!")
                .build();
    }

    @PatchMapping("/{comboId}/restore")
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public ApiResponse<ComboResponse> restoreCombo(@PathVariable Long comboId) {
        return ApiResponse.<ComboResponse>builder()
                .message("Khôi phục combo thành công!")
                .result(comboService.restoreCombo(comboId))
                .build();
    }
}
