package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ContactService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contact")
@RequiredArgsConstructor
@Validated
public class ContactController {

    private final ContactService contactService;

    @PostMapping("/submit")
    public ApiResponse<ContactSubmitResponse> submitContact(@Valid @RequestBody ContactSubmitRequest request) {
        return ApiResponse.<ContactSubmitResponse>builder()
                .code(200)
                .message("Success")
                .result(contactService.validateAndSubmit(request))
                .build();
    }

    @GetMapping("/track")
    public ApiResponse<ContactTrackingResponse> trackContact(
            @RequestParam @NotBlank String ticketCode,
            @RequestParam @NotBlank @Email String email) {
        return ApiResponse.<ContactTrackingResponse>builder()
                .code(200)
                .message("Success")
                .result(contactService.trackContact(ticketCode, email))
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @GetMapping("/admin/list")
    public ApiResponse<List<ContactResponse>> getAllContacts() {
        return ApiResponse.<List<ContactResponse>>builder()
                .code(200)
                .message("Success")
                .result(contactService.getAllContacts())
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @GetMapping("/admin/analytics")
    public ApiResponse<ContactAnalyticsResponse> getAnalytics() {
        return ApiResponse.<ContactAnalyticsResponse>builder()
                .code(200)
                .message("Success")
                .result(contactService.getAnalytics())
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @PatchMapping("/admin/{contactId}")
    public ApiResponse<ContactResponse> updateContact(
            @PathVariable Long contactId,
            @Valid @RequestBody ContactUpdateRequest request) {
        return ApiResponse.<ContactResponse>builder()
                .code(200)
                .message("Cập nhật yêu cầu thành công")
                .result(contactService.updateContact(contactId, request))
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @PostMapping("/admin/reply/{contactId}")
    public ApiResponse<ContactResponse> replyToContact(
            @PathVariable Long contactId,
            @Valid @RequestBody ContactReplyRequest request) {
        return ApiResponse.<ContactResponse>builder()
                .code(200)
                .message("Replied successfully")
                .result(contactService.replyToContact(contactId, request))
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @DeleteMapping("/admin/{contactId}")
    public ApiResponse<String> deleteContact(@PathVariable Long contactId) {
        contactService.deleteContact(contactId);
        return ApiResponse.<String>builder()
                .code(200)
                .message("Lưu trữ góp ý thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CONTACT_MANAGE')")
    @PatchMapping("/admin/{contactId}/restore")
    public ApiResponse<ContactResponse> restoreContact(@PathVariable Long contactId) {
        return ApiResponse.<ContactResponse>builder()
                .code(200)
                .message("Khôi phục góp ý thành công")
                .result(contactService.restoreContact(contactId))
                .build();
    }
}
