package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    private JavaMailSender mailSender;
    private TicketVerificationService ticketVerificationService;
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        ticketVerificationService = mock(TicketVerificationService.class);
        emailService = new EmailService(mailSender, ticketVerificationService);
        ReflectionTestUtils.setField(emailService, "fromEmail", "system@example.com");
        ReflectionTestUtils.setField(emailService, "mailPassword", "app-password");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:3000/");
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    void sendsStaffAccountEmailAsUtf8HtmlMessage() throws Exception {
        emailService.sendStaffAccountEmail(
                " New.Staff@Example.com ",
                "Nguyễn Văn A",
                "staff01",
                "Temp#123");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendsRegistrationOtpEmail() {
        emailService.sendOtpEmail("customer@example.com", "123456");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendsPasswordResetEmail() {
        emailService.sendPasswordResetEmail("customer@example.com", "654321");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendsPaidBookingAsElectronicTicketWithInlineQr() {
        String token = "1613b718293440679055ea639af8a109";
        Booking booking = mock(Booking.class);
        Showtime showtime = mock(Showtime.class, RETURNS_DEEP_STUBS);
        Ticket ticket = mock(Ticket.class, RETURNS_DEEP_STUBS);

        when(booking.getBookingId()).thenReturn(85L);
        when(booking.getTicketQrToken()).thenReturn(token);
        when(booking.getTotalAmount()).thenReturn(320_000);
        when(booking.getShowtime()).thenReturn(showtime);
        when(showtime.getMovie().getMovieNameVn()).thenReturn("Khởi Đầu Mới");
        when(showtime.getCinemaRoom().getCinemaRoomName()).thenReturn("Room 6");
        when(showtime.getShowDate()).thenReturn(LocalDate.of(2026, 8, 6));
        when(showtime.getStartTime()).thenReturn(LocalTime.of(15, 0));
        when(showtime.getEndTime()).thenReturn(LocalTime.of(17, 0));
        when(ticket.getShowtimeSeat().getSeat().getSeatCode()).thenReturn("H6");
        when(ticketVerificationService.verificationUrl(token))
                .thenReturn("https://cinema.example/tickets/" + token);
        when(ticketVerificationService.generateQrPng(token)).thenReturn(new byte[]{1, 2, 3});

        emailService.sendBookingConfirmationEmail(
                "customer@example.com", booking, List.of(ticket), List.of(), List.of());

        verify(ticketVerificationService).generateQrPng(token);
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void reportsMissingSmtpConfigurationWithEmailErrorCode() {
        ReflectionTestUtils.setField(emailService, "mailPassword", "");

        assertThatThrownBy(() -> emailService.sendStaffAccountEmail(
                "staff@example.com", "Staff", "staff", "Temp#123"))
                .isInstanceOfSatisfying(AppException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.EMAIL_SEND_FAILED);
                    assertThat(exception.getCustomMessage()).contains("MAIL_USERNAME", "MAIL_PASSWORD");
                });
    }

    @Test
    void normalizesSmtpFailuresForAllCallers() {
        doThrow(new MailSendException("SMTP authentication failed"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendStaffAccountEmail(
                "staff@example.com", "Staff", "staff", "Temp#123"))
                .isInstanceOfSatisfying(AppException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.EMAIL_SEND_FAILED);
                    assertThat(exception.getCustomMessage()).contains("App Password");
                });
    }
}
