package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CloudinaryService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('MOVIE_CREATE', 'MOVIE_UPDATE', 'COMBO_MANAGE')")
    public ApiResponse<String> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadImage(file);
        return ApiResponse.<String>builder()
                .message("Tải ảnh lên thành công!")
                .result(url)
                .build();
    }

    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('MOVIE_CREATE', 'MOVIE_UPDATE', 'COMBO_MANAGE')")
    public ApiResponse<String> uploadAudio(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadAudio(file);
        return ApiResponse.<String>builder()
                .message("Tải audio lên Cloudinary thành công!")
                .result(url)
                .build();
    }
}
