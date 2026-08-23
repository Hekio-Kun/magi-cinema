package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.BookingCombo;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.BookingFoodItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Ticket;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmailService {

    private static final String BRAND_NAME = "MagiCinema";
    private static final String SUPPORT_EMAIL = "magicinema.system@gmail.com";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final NumberFormat VND_FORMATTER = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

    JavaMailSender mailSender;
    TicketVerificationService ticketVerificationService;

    @NonFinal
    @Value("${spring.mail.username}")
    String fromEmail;

    @NonFinal
    @Value("${spring.mail.password:}")
    String mailPassword;

    @NonFinal
    @Value("${app.frontend-url:http://localhost:3000}")
    String frontendUrl;

    public void sendOtpEmail(String toEmail, String otpCode) {
        var sanitizedEmail = sanitizeEmail(toEmail);
        log.info("Sending OTP email to: {} from: {}", sanitizedEmail, fromEmail);

        String subject = "Mã xác nhận đăng ký tài khoản MagiCinema";
        String plainText = """
                Chào bạn,

                Mã xác nhận đăng ký tài khoản MagiCinema của bạn là: %s

                Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.

                Trân trọng,
                MagiCinema
                """.formatted(otpCode);

        String html = renderLayout(
                "Xác nhận tài khoản",
                "Hoàn tất đăng ký MagiCinema",
                """
                        <p>Chào bạn,</p>
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>MagiCinema</strong>. Nhập mã xác nhận bên dưới để kích hoạt tài khoản.</p>
                        %s
                        %s
                        """.formatted(renderOtpCode(otpCode), renderNotice("Mã OTP có hiệu lực trong 5 phút. Không cung cấp mã này cho bất kỳ ai, kể cả nhân viên rạp."))
        );

        try {
            sendHtmlMail(sanitizedEmail, subject, plainText, html);
            log.info("OTP email sent successfully to: {}", sanitizedEmail);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send OTP email to: {} - Error: {}", sanitizedEmail, e.getMessage(), e);
            throw emailSendFailed(e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        var sanitizedEmail = sanitizeEmail(toEmail);
        log.info("Sending password reset email to: {}", sanitizedEmail);

        String resetUrl = normalizeFrontendUrl() + "/auth?mode=reset-password&token=" + token;
        String subject = "Đặt lại mật khẩu MagiCinema";
        String plainText = """
                Chào bạn,

                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản MagiCinema.

                Mã xác nhận: %s
                Liên kết đặt lại mật khẩu: %s

                Mã xác nhận và liên kết này sẽ hết hạn sau 10 phút.
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

                Trân trọng,
                MagiCinema
                """.formatted(token, resetUrl);

        String html = renderLayout(
                "Bảo mật tài khoản",
                "Đặt lại mật khẩu",
                """
                        <p>Chào bạn,</p>
                        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>MagiCinema</strong>.</p>
                        %s
                        %s
                        %s
                        """.formatted(
                        renderOtpCode(token),
                        renderButton("Đặt lại mật khẩu", resetUrl),
                        renderNotice("Liên kết và mã xác nhận có hiệu lực trong 10 phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email."))
        );

        try {
            sendHtmlMail(sanitizedEmail, subject, plainText, html);
            log.info("Password reset email sent successfully to: {}", sanitizedEmail);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {} - Error: {}", sanitizedEmail, e.getMessage(), e);
            throw emailSendFailed(e);
        }
    }

    public void sendStaffAccountEmail(String toEmail, String fullName, String username, String temporaryPassword) {
        var sanitizedEmail = sanitizeEmail(toEmail);
        log.info("Sending staff account information to: {}", sanitizedEmail);

        String subject = "Thông tin tài khoản nhân viên MagiCinema";
        String displayName = safeText(fullName, "bạn");
        String loginUrl = normalizeFrontendUrl() + "/auth?mode=login";

        String plainText = """
                Chào %s,

                Tài khoản nhân viên MagiCinema của bạn đã được tạo thành công.

                Tên đăng nhập: %s
                Mật khẩu tạm thời: %s

                Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
                Không chia sẻ mật khẩu này với bất kỳ ai.

                Trân trọng,
                MagiCinema
                """.formatted(displayName, username, temporaryPassword);

        String html = renderLayout(
                "Tài khoản nhân viên",
                "Chào mừng đến với MagiCinema",
                """
                        <p>Chào <strong>%s</strong>,</p>
                        <p>Tài khoản nhân viên của bạn đã được tạo. Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>
                        %s
                        %s
                        %s
                        """.formatted(
                        escapeHtml(displayName),
                        renderInfoTable(List.of(
                                infoRow("Tên đăng nhập", username),
                                infoRow("Mật khẩu tạm thời", temporaryPassword)
                        )),
                        renderButton("Đăng nhập hệ thống", loginUrl),
                        renderNotice("Mật khẩu tạm thời là thông tin bảo mật. Không chia sẻ nội dung email này cho người khác."))
        );

        try {
            sendHtmlMail(sanitizedEmail, subject, plainText, html);
            log.info("Staff account email sent successfully to: {}", sanitizedEmail);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send staff account email to: {} - Error: {}", sanitizedEmail, e.getMessage(), e);
            throw emailSendFailed(e);
        }
    }

    public void sendBookingConfirmationEmail(String toEmail, Booking booking, List<Ticket> tickets, List<BookingCombo> combos, List<BookingFoodItem> foodItems) {
        var sanitizedEmail = sanitizeEmail(toEmail);
        log.info("Sending booking confirmation email to: {}", sanitizedEmail);

        try {
            Showtime showtime = booking.getShowtime();
            String movieName = safeText(showtime.getMovie().getMovieNameVn(), "Phim chưa cập nhật");
            String roomName = safeText(showtime.getCinemaRoom().getCinemaRoomName(), "Phòng chiếu");
            String showDate = showtime.getShowDate() == null ? "Chưa cập nhật" : showtime.getShowDate().format(DATE_FORMATTER);
            String startTime = showtime.getStartTime() == null ? "--:--" : showtime.getStartTime().format(TIME_FORMATTER);
            String endTime = showtime.getEndTime() == null ? "--:--" : showtime.getEndTime().format(TIME_FORMATTER);
            String seatCodes = formatSeatCodes(tickets);
            String foodAndCombosText = formatFoodAndCombos(combos, foodItems);
            String totalAmount = formatCurrency(booking.getTotalAmount());
            String bookingCode = "#" + booking.getBookingId();
            String ticketToken = safeText(booking.getTicketQrToken(), "");
            String ticketUrl = ticketToken.isBlank()
                    ? normalizeFrontendUrl() + "/profile"
                    : ticketVerificationService.verificationUrl(ticketToken);
            byte[] ticketQrPng = ticketToken.isBlank()
                    ? null
                    : ticketVerificationService.generateQrPng(ticketToken);

            String subject = "Xác nhận đặt vé MagiCinema " + bookingCode;
            String plainText = """
                    Chào bạn,

                    Cảm ơn bạn đã đặt vé tại MagiCinema. Dưới đây là thông tin vé của bạn:

                    Mã đặt vé: %s
                    Phim: %s
                    Phòng chiếu: %s
                    Ngày chiếu: %s
                    Giờ chiếu: %s ~ %s
                    Ghế: %s
                    Bắp nước: %s
                    Tổng thanh toán: %s
                    Vé điện tử: %s

                    Vui lòng đến rạp trước 15 phút và xuất trình mã QR trong email này để soát vé.

                    Trân trọng,
                    MagiCinema
                    """.formatted(bookingCode, movieName, roomName, showDate, startTime, endTime, seatCodes, foodAndCombosText, totalAmount, ticketUrl);

            String ticketAccess = ticketQrPng == null
                    ? renderButton("Xem đơn vé", ticketUrl)
                    : """
                            <div style="margin:22px 0; padding:20px; text-align:center; border-radius:18px; background:#f8fafc; border:1px dashed #cbd5e1;">
                                <div style="font-size:13px; font-weight:800; color:#111827; margin-bottom:12px;">MÃ QR VÉ ĐIỆN TỬ</div>
                                <img src="cid:ticket-qr" width="220" height="220" alt="Mã QR vé %s" style="display:block; width:220px; height:220px; max-width:100%%; margin:0 auto; border:10px solid #ffffff; border-radius:14px;"/>
                                <div style="margin-top:12px; font-size:13px; line-height:1.6; color:#64748b;">Đưa mã này cho nhân viên tại cổng soát vé.</div>
                            </div>
                            %s
                            """.formatted(escapeHtml(bookingCode), renderButton("Mở vé điện tử", ticketUrl));

            String html = renderLayout(
                    "Xác nhận đặt vé",
                    "Đặt vé thành công",
                    """
                            <p>Chào bạn,</p>
                            <p>Cảm ơn bạn đã đặt vé tại <strong>MagiCinema</strong>. Vé của bạn đã được ghi nhận thành công.</p>
                            <div style="margin: 22px 0; padding: 18px; border-radius: 16px; background: #111827; color: #ffffff;">
                                <div style="font-size: 12px; color: #d1d5db; margin-bottom: 6px;">Mã đặt vé</div>
                                <div style="font-size: 28px; font-weight: 800; letter-spacing: 0.02em;">%s</div>
                            </div>
                            %s
                            %s
                            %s
                            """.formatted(
                            escapeHtml(bookingCode),
                            renderInfoTable(List.of(
                                    infoRow("Phim", movieName),
                                    infoRow("Phòng chiếu", roomName),
                                    infoRow("Ngày chiếu", showDate),
                                    infoRow("Giờ chiếu", startTime + " ~ " + endTime),
                                    infoRow("Ghế", seatCodes),
                                    infoRow("Bắp nước", foodAndCombosText),
                                    infoRow("Tổng thanh toán", totalAmount)
                            )),
                            ticketAccess,
                            renderNotice("Vui lòng đến rạp trước 15 phút. Bạn có thể xuất trình QR ngay trong email hoặc mở vé điện tử trên điện thoại."))
            );

            sendHtmlMail(sanitizedEmail, subject, plainText, html, ticketQrPng);
            log.info("Booking confirmation email sent successfully to: {}", sanitizedEmail);
        } catch (Exception e) {
            log.error("Failed to send booking confirmation email to: {} - Error: {}", sanitizedEmail, e.getMessage(), e);
        }
    }

    public void sendReplyEmail(String toEmail, String subject, String replyContent) {
        var sanitizedEmail = sanitizeEmail(toEmail);
        log.info("Sending contact reply email to: {} from: {}", sanitizedEmail, fromEmail);

        if (fromEmail == null || fromEmail.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("SMTP credentials not configured (MAIL_USERNAME/MAIL_PASSWORD). Mocking successful email send to: {}", sanitizedEmail);
            log.info("[MOCK EMAIL] To: {} | Subject: {} | Content:\n{}", sanitizedEmail, subject, replyContent);
            return;
        }

        String plainText = replyContent + "\n\nTrân trọng,\nBan Quản Lý MagiCinema";
        String html = renderLayout(
                "Phản hồi Góp ý",
                "MagiCinema Phản Hồi",
                """
                <p>Chào bạn,</p>
                <p>Cảm ơn bạn đã liên hệ và đóng góp ý kiến cho <strong>MagiCinema</strong>. Ban Quản Lý xin phản hồi nội dung của bạn như sau:</p>
                <div style="margin: 20px 0; padding: 18px; border-radius: 12px; background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; line-height: 1.6;">
                    %s
                </div>
                <p>Nếu có bất kỳ thắc mắc nào khác, bạn vui lòng phản hồi email này hoặc liên hệ hotline CSKH.</p>
                """.formatted(escapeHtml(replyContent).replace("\n", "<br/>"))
        );

        try {
            sendHtmlMail(sanitizedEmail, subject, plainText, html);
            log.info("Contact reply email sent successfully to: {}", sanitizedEmail);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send reply email to: {} - Error: {}", sanitizedEmail, e.getMessage(), e);
            throw emailSendFailed(e);
        }
    }

    private void sendHtmlMail(String toEmail, String subject, String plainText, String htmlContent) throws Exception {
        sendHtmlMail(toEmail, subject, plainText, htmlContent, null);
    }

    private void sendHtmlMail(String toEmail, String subject, String plainText, String htmlContent, byte[] ticketQrPng) throws Exception {
        if (fromEmail == null || fromEmail.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED,
                    "Chưa cấu hình email hệ thống. Hãy đặt MAIL_USERNAME và MAIL_PASSWORD bằng Gmail App Password.");
        }
        if (toEmail == null || toEmail.isBlank()) {
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED, "Địa chỉ email người nhận không hợp lệ.");
        }

        var message = mailSender.createMimeMessage();
        var helper = new MimeMessageHelper(
                message,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());

        helper.setFrom(fromEmail, BRAND_NAME);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(plainText, htmlContent);
        if (ticketQrPng != null && ticketQrPng.length > 0) {
            helper.addInline("ticket-qr", new ByteArrayResource(ticketQrPng), "image/png");
        }
        mailSender.send(message);
    }

    private AppException emailSendFailed(Exception cause) {
        log.debug("SMTP failure type: {}", cause.getClass().getName());
        if (hasCauseMessage(cause, "535") || hasCauseMessage(cause, "BadCredentials")
                || hasCauseMessage(cause, "Authentication failed")) {
            return new AppException(
                    ErrorCode.EMAIL_SEND_FAILED,
                    "Gmail từ chối đăng nhập SMTP. Hãy tạo Gmail App Password mới và cập nhật MAIL_PASSWORD.");
        }
        return new AppException(
                ErrorCode.EMAIL_SEND_FAILED,
                "Không thể gửi email. Vui lòng kiểm tra Gmail App Password và kết nối SMTP.");
    }

    private boolean hasCauseMessage(Throwable error, String expectedText) {
        Throwable current = error;
        while (current != null) {
            if (current.getMessage() != null && current.getMessage().contains(expectedText)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String renderLayout(String eyebrow, String title, String bodyHtml) {
        return """
                <!doctype html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s</title>
                </head>
                <body style="margin:0; padding:0; background:#eef1f5; font-family: Arial, Helvetica, sans-serif; color:#111827;">
                    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">%s - %s</div>
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#eef1f5; padding:28px 12px;">
                        <tr>
                            <td align="center">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border-radius:22px; overflow:hidden; border:1px solid #dde3ea; box-shadow:0 18px 55px rgba(15,23,42,0.10);">
                                    <tr>
                                        <td style="padding:28px 30px; background:#111827; color:#ffffff;">
                                            <div style="font-size:21px; font-weight:800; letter-spacing:0.01em;">%s</div>
                                            <div style="margin-top:8px; color:#cbd5e1; font-size:13px;">Trải nghiệm đặt vé điện ảnh nhanh chóng và an toàn</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:30px;">
                                            <div style="font-size:12px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:#6b7280; margin-bottom:10px;">%s</div>
                                            <h1 style="margin:0 0 18px; font-size:28px; line-height:1.2; color:#111827;">%s</h1>
                                            <div style="font-size:15px; line-height:1.7; color:#374151;">%s</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:22px 30px; background:#f8fafc; border-top:1px solid #e5e7eb;">
                                            <div style="font-size:13px; line-height:1.6; color:#6b7280;">
                                                Email này được gửi tự động từ hệ thống %s. Nếu cần hỗ trợ, vui lòng liên hệ
                                                <a href="mailto:%s" style="color:#111827; font-weight:700; text-decoration:none;">%s</a>.
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(
                escapeHtml(title),
                escapeHtml(eyebrow),
                escapeHtml(title),
                BRAND_NAME,
                escapeHtml(eyebrow),
                escapeHtml(title),
                bodyHtml,
                BRAND_NAME,
                SUPPORT_EMAIL,
                SUPPORT_EMAIL);
    }

    private String renderOtpCode(String code) {
        return """
                <div style="margin:22px 0; padding:20px; text-align:center; border-radius:18px; background:#f3f4f6; border:1px solid #e5e7eb;">
                    <div style="font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:10px;">Mã xác nhận</div>
                    <div style="font-size:34px; line-height:1; font-weight:900; letter-spacing:0.18em; color:#111827;">%s</div>
                </div>
                """.formatted(escapeHtml(code));
    }

    private String renderButton(String label, String url) {
        return """
                <div style="margin:24px 0;">
                    <a href="%s" style="display:inline-block; padding:13px 20px; border-radius:12px; background:#111827; color:#ffffff; text-decoration:none; font-size:14px; font-weight:800;">
                        %s
                    </a>
                </div>
                """.formatted(escapeHtml(url), escapeHtml(label));
    }

    private String renderNotice(String message) {
        return """
                <div style="margin-top:20px; padding:14px 16px; border-radius:14px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; font-size:13px; line-height:1.6;">
                    %s
                </div>
                """.formatted(escapeHtml(message));
    }

    private String renderInfoTable(List<String[]> rows) {
        String content = rows.stream()
                .map(row -> """
                        <tr>
                            <td style="padding:12px 0; color:#6b7280; font-size:13px; border-bottom:1px solid #eef2f7;">%s</td>
                            <td style="padding:12px 0; color:#111827; font-size:14px; font-weight:800; text-align:right; border-bottom:1px solid #eef2f7;">%s</td>
                        </tr>
                        """.formatted(escapeHtml(row[0]), escapeHtml(row[1])))
                .collect(Collectors.joining());

        return """
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="margin:20px 0; border-collapse:collapse;">
                    %s
                </table>
                """.formatted(content);
    }

    private String[] infoRow(String label, String value) {
        return new String[]{label, safeText(value, "Chưa cập nhật")};
    }

    private String formatSeatCodes(List<Ticket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return "Chưa cập nhật";
        }

        return tickets.stream()
                .map(ticket -> ticket.getShowtimeSeat().getSeat().getSeatCode())
                .collect(Collectors.joining(", "));
    }

    private String formatCombos(List<BookingCombo> combos) {
        if (combos == null || combos.isEmpty()) {
            return "Không có";
        }

        return combos.stream()
                .map(combo -> combo.getQuantity() + "x " + resolveComboName(combo))
                .collect(Collectors.joining(", "));
    }

    private String formatFoodAndCombos(List<BookingCombo> combos, List<BookingFoodItem> foodItems) {
        List<String> lines = new java.util.ArrayList<>();
        if (combos != null) {
            lines.addAll(combos.stream()
                    .map(combo -> combo.getQuantity() + "x " + resolveComboName(combo))
                    .toList());
        }
        if (foodItems != null) {
            lines.addAll(foodItems.stream()
                    .map(item -> item.getQuantity() + "x " + resolveFoodItemName(item))
                    .toList());
        }
        return lines.isEmpty() ? "Không có" : String.join(", ", lines);
    }

    private String resolveComboName(BookingCombo combo) {
        if (combo.getComboNameSnapshot() != null && !combo.getComboNameSnapshot().isBlank()) {
            return combo.getComboNameSnapshot().trim();
        }
        if (combo.getCombo() != null && combo.getCombo().getName() != null && !combo.getCombo().getName().isBlank()) {
            return combo.getCombo().getName().trim();
        }
        return "Combo đã xóa";
    }

    private String resolveFoodItemName(BookingFoodItem item) {
        if (item.getDisplayNameSnapshot() != null && !item.getDisplayNameSnapshot().isBlank()) {
            return item.getDisplayNameSnapshot().trim();
        }
        return "Món lẻ đã xóa";
    }

    private String formatCurrency(Integer amount) {
        return VND_FORMATTER.format(amount == null ? 0 : amount);
    }

    private String sanitizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String normalizeFrontendUrl() {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return "http://localhost:3000";
        }
        return frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
