package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.AuthenticationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.ForgotPasswordRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.RegisterRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.ResendOtpRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.ResetPasswordRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.VerifyOtpRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.AuthenticationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.AuthenticationService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PasswordResetService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> login(@Valid @RequestBody AuthenticationRequest request) {
        return ApiResponse.<AuthenticationResponse>builder()
                .result(authenticationService.authenticate(request))
                .build();
    }

    @PostMapping("/register")
    public ApiResponse<Void> initiateRegistration(@Valid @RequestBody RegisterRequest request) {
        authenticationService.initiateRegistration(request);
        return ApiResponse.<Void>builder()
                .message("OTP đã được gửi đến email của bạn.")
                .build();
    }

    @GetMapping("/register/check")
    public ApiResponse<Void> checkRegistrationStep1(
            @RequestParam String username,
            @RequestParam String email) {
        authenticationService.checkRegistrationStep1(username, email);
        return ApiResponse.<Void>builder()
                .message("OK")
                .build();
    }

    @PostMapping("/register/verify")
    public ApiResponse<UserResponse> verifyOtpAndRegister(@Valid @RequestBody VerifyOtpRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(authenticationService.verifyOtpAndRegister(request))
                .build();
    }

    @PostMapping("/register/resend-otp")
    public ApiResponse<Void> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        authenticationService.resendOtp(request);
        return ApiResponse.<Void>builder()
                .message("OTP mới đã được gửi đến email của bạn.")
                .build();
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.handleForgotPassword(request.getEmail());
        return ApiResponse.<Void>builder()
                .message("Nếu email của bạn tồn tại trong hệ thống, một hướng dẫn để đặt lại mật khẩu đã được gửi.")
                .build();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.handleResetPassword(request.getEmail(), request.getToken(), request.getNewPassword());
        return ApiResponse.<Void>builder()
                .message("Mật khẩu của bạn đã được đặt lại thành công. Bây giờ bạn có thể đăng nhập.")
                .build();
    }

    /**
     * Debug endpoint — kiểm tra token đang chứa claim/authority gì.
     * GET /auth/me  (yêu cầu Bearer token)
     */
    @GetMapping("/me")
    public ApiResponse<java.util.Map<String, Object>> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.<java.util.Map<String, Object>>builder()
                .result(jwt.getClaims())
                .build();
    }
}
