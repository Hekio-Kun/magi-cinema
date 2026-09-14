package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.media.PublicAudioTrackResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.CloudinaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Public, read-only media endpoints used by customer-facing pages. */
@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class PublicMediaController {

    private final CloudinaryService cloudinaryService;

    @GetMapping("/audio")
    public ApiResponse<List<PublicAudioTrackResponse>> listPublicAudio() {
        return ApiResponse.<List<PublicAudioTrackResponse>>builder()
                .message("Lấy playlist audio thành công!")
                .result(cloudinaryService.listPublicAudio())
                .build();
    }
}
