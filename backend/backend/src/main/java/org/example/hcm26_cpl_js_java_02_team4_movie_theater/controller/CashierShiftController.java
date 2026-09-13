package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.ApproveCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.CashierShiftResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.CloseCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.OpenCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CashierShiftService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cashier-shifts")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CashierShiftController {
    CashierShiftService cashierShiftService;

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<CashierShiftResponse> current() {
        return ApiResponse.<CashierShiftResponse>builder().result(cashierShiftService.getCurrentShift()).build();
    }

    @PostMapping("/open")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<CashierShiftResponse> open(@Valid @RequestBody OpenCashierShiftRequest request) {
        return ApiResponse.<CashierShiftResponse>builder().message("Đã mở ca thu ngân.").result(cashierShiftService.openShift(request)).build();
    }

    @PostMapping("/{shiftId}/close")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<CashierShiftResponse> close(@PathVariable Long shiftId, @Valid @RequestBody CloseCashierShiftRequest request) {
        return ApiResponse.<CashierShiftResponse>builder().message("Đã kết ca và gửi đối soát.").result(cashierShiftService.closeShift(shiftId, request)).build();
    }

    @PostMapping("/{shiftId}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<CashierShiftResponse> approve(@PathVariable Long shiftId, @Valid @RequestBody ApproveCashierShiftRequest request) {
        return ApiResponse.<CashierShiftResponse>builder().message("Đã cập nhật kết quả đối soát ca.").result(cashierShiftService.approveShift(shiftId, request)).build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<PageResponse<CashierShiftResponse>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PageResponse<CashierShiftResponse>>builder().result(cashierShiftService.getShifts(page, size)).build();
    }

    @GetMapping("/{shiftId}/summary")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<CashierShiftResponse> summary(@PathVariable Long shiftId) {
        return ApiResponse.<CashierShiftResponse>builder().result(cashierShiftService.refreshAndGet(shiftId)).build();
    }
}
