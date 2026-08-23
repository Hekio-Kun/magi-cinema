package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactReplyRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactSubmitRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactSubmitResponse;
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
                .message("Xóa góp ý thành công")
                .build();
    }
}
