package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.GlobalExceptionHandler;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.AuthenticationService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerValidationTest {
    private final AuthenticationService authenticationService = mock(AuthenticationService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(
                        new AuthController(authenticationService, mock(PasswordResetService.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void rejectsMissingEmailAndUsernameBeforeRegistrationService() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"password":"ValidPassword1!","fullName":"Khách hàng", "phoneNumber":"0912345678",
                 "dateOfBirth":"2000-01-01"}
                """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(authenticationService);
    }

    @Test
    void validatesEmailWhenResendingOtp() throws Exception {
        for (String body : new String[]{"{}", "{\"email\":\"not-an-email\"}"}) {
            mvc.perform(post("/auth/register/resend-otp")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(authenticationService);
    }

    @Test
    void nestedValidationRejectsMissingPhoneDuringVerification() throws Exception {
        mvc.perform(post("/auth/register/verify").contentType(MediaType.APPLICATION_JSON).content("""
                {"otp":"123456","registerRequest":{"username":"member","email":"member@example.com",
                 "password":"ValidPassword1!","fullName":"Khách hàng","dateOfBirth":"2000-01-01"}}
                """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(authenticationService);
    }

    @Test
    void malformedJsonReturnsBadRequestInsteadOfInternalServerError() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(authenticationService);
    }
}
