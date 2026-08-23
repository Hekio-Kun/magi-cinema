package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.config.ZaloPayConfig;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZaloPayPaymentService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter APP_TRANS_DATE_FORMAT = DateTimeFormatter.ofPattern("yyMMdd");
    private static final Pattern BOOKING_ID_PATTERN = Pattern.compile("_B(\\d+)_");
    private static final Pattern MEMBERSHIP_ID_PATTERN = Pattern.compile("_M(\\d+)_");

    private final ZaloPayConfig zaloPayConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public String buildPaymentPageUrl(Long bookingId) {
        String baseUrl = hasText(zaloPayConfig.getFrontendPaymentUrl())
                ? zaloPayConfig.getFrontendPaymentUrl()
                : "http://localhost:3000/payment/zalopay";
        return UriComponentsBuilder.fromUriString(baseUrl)
                .pathSegment(String.valueOf(bookingId))
                .toUriString();
    }

    public ZaloPayPaymentResponse createPaymentRequest(
            Long bookingId,
            String appUser,
            String description,
            long amount) {
        return createPaymentRequest(bookingId, appUser, description, amount, "B");
    }

    public ZaloPayPaymentResponse createMembershipPaymentRequest(
            Long membershipId, String appUser, String description, long amount) {
        return createPaymentRequest(membershipId, appUser, description, amount, "M");
    }

    private ZaloPayPaymentResponse createPaymentRequest(
            Long bookingId, String appUser, String description, long amount, String referenceType) {
        validateConfigured();
        if (bookingId == null || amount <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin thanh toán không hợp lệ.");
        }

        try {
            int appId = parseAppId();
            long appTime = System.currentTimeMillis();
            String appTransId = buildAppTransId(bookingId, appTime, referenceType);
            String safeAppUser = sanitizeAppUser(appUser);
            String safeDescription = sanitizeDescription(description, bookingId);
            String item = buildItem(bookingId, amount);
            String embedData = buildEmbedData();

            String macInput = appId + "|" + appTransId + "|" + safeAppUser + "|" + amount
                    + "|" + appTime + "|" + embedData + "|" + item;
            String mac = signHmacSHA256(macInput, zaloPayConfig.getKey1());

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("app_id", appId);
            requestBody.put("app_user", safeAppUser);
            requestBody.put("app_trans_id", appTransId);
            requestBody.put("app_time", appTime);
            requestBody.put("expire_duration_seconds", normalizeExpireSeconds());
            requestBody.put("amount", amount);
            requestBody.put("description", safeDescription);
            requestBody.put("item", item);
            requestBody.put("embed_data", embedData);
            requestBody.put("bank_code", "");
            requestBody.put("mac", mac);
            if (hasText(zaloPayConfig.getCallbackUrl())) {
                requestBody.put("callback_url", zaloPayConfig.getCallbackUrl());
            }

            String responseBody = sendJson(zaloPayConfig.getCreateEndpoint(), requestBody);
            Map<String, Object> response = objectMapper.readValue(responseBody, new TypeReference<>() {});
            String orderUrl = valueOf(response.get("order_url"));
            if (!hasText(orderUrl)) {
                log.warn("ZaloPay create order response missing order_url: {}", responseBody);
                throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể tạo đường dẫn thanh toán ZaloPay.");
            }

            return ZaloPayPaymentResponse.builder()
                    .bookingId(bookingId)
                    .appTransId(appTransId)
                    .amount(amount)
                    .orderUrl(orderUrl)
                    .qrCode(blankToNull(valueOf(response.get("qr_code"))))
                    .orderToken(blankToNull(valueOf(response.get("order_token"))))
                    .zpTransToken(blankToNull(valueOf(response.get("zp_trans_token"))))
                    .returnCode(parseInteger(response.get("return_code")))
                    .returnMessage(blankToNull(valueOf(response.get("return_message"))))
                    .subReturnCode(parseInteger(response.get("sub_return_code")))
                    .subReturnMessage(blankToNull(valueOf(response.get("sub_return_message"))))
                    .build();
        } catch (AppException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("Error creating ZaloPay payment request for booking {}", bookingId, exception);
            throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể tạo yêu cầu thanh toán ZaloPay.");
        }
    }

    public boolean verifyCallbackSignature(String data, String mac) {
        if (!hasText(data) || !hasText(mac) || !hasText(zaloPayConfig.getKey2())) {
            return false;
        }
        try {
            String expectedMac = signHmacSHA256(data, zaloPayConfig.getKey2());
            return secureEquals(expectedMac, mac);
        } catch (Exception exception) {
            log.error("Error verifying ZaloPay callback signature", exception);
            return false;
        }
    }

    public boolean verifyReturnChecksum(Map<String, String> params) {
        String checksum = params.get("checksum");
        if (!hasText(checksum) || !hasText(zaloPayConfig.getKey2())) {
            return false;
        }
        try {
            String macInput = valueOf(params.get("appid")) + "|"
                    + valueOf(params.get("apptransid")) + "|"
                    + valueOf(params.get("pmcid")) + "|"
                    + valueOf(params.get("bankcode")) + "|"
                    + valueOf(params.get("amount")) + "|"
                    + valueOf(params.get("discountamount")) + "|"
                    + valueOf(params.get("status"));
            String expectedChecksum = signHmacSHA256(macInput, zaloPayConfig.getKey2());
            return secureEquals(expectedChecksum, checksum);
        } catch (Exception exception) {
            log.error("Error verifying ZaloPay return checksum", exception);
            return false;
        }
    }

    public Map<String, Object> parseCallbackData(String data) {
        try {
            return objectMapper.readValue(data, new TypeReference<>() {});
        } catch (Exception exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dữ liệu callback ZaloPay không hợp lệ.");
        }
    }

    public Optional<Long> extractBookingId(String appTransId) {
        return extractId(appTransId, BOOKING_ID_PATTERN);
    }

    public Optional<Long> extractMembershipId(String appTransId) {
        return extractId(appTransId, MEMBERSHIP_ID_PATTERN);
    }

    private Optional<Long> extractId(String appTransId, Pattern pattern) {
        if (!hasText(appTransId)) {
            return Optional.empty();
        }
        Matcher matcher = pattern.matcher(appTransId);
        if (!matcher.find()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(matcher.group(1)));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    public ZaloPayQueryResult queryOrderStatus(String appTransId) {
        validateConfigured();
        if (!hasText(appTransId)) {
            return ZaloPayQueryResult.failed("Thiếu mã giao dịch ZaloPay.");
        }
        try {
            int appId = parseAppId();
            String macInput = appId + "|" + appTransId + "|" + zaloPayConfig.getKey1();
            String mac = signHmacSHA256(macInput, zaloPayConfig.getKey1());

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("app_id", appId);
            requestBody.put("app_trans_id", appTransId);
            requestBody.put("mac", mac);

            String responseBody = sendJson(zaloPayConfig.getQueryEndpoint(), requestBody);
            Map<String, Object> response = objectMapper.readValue(responseBody, new TypeReference<>() {});
            Integer returnCode = parseInteger(response.get("return_code"));
            boolean success = Integer.valueOf(1).equals(returnCode);
            return new ZaloPayQueryResult(
                    success,
                    parseLong(response.get("amount")),
                    parseLong(response.get("zp_trans_id")),
                    returnCode,
                    blankToNull(valueOf(response.get("return_message"))));
        } catch (Exception exception) {
            log.warn("Failed to query ZaloPay order status for {}", appTransId, exception);
            return ZaloPayQueryResult.failed("Không thể truy vấn trạng thái giao dịch ZaloPay.");
        }
    }

    private String sendJson(String endpoint, Map<String, Object> requestBody) throws Exception {
        String jsonBody = objectMapper.writeValueAsString(requestBody);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("ZaloPay API failed. status={}, body={}", response.statusCode(), response.body());
            throw new AppException(ErrorCode.UNCATEGORIZED, "ZaloPay không phản hồi thành công.");
        }
        return response.body();
    }

    private String buildItem(Long bookingId, long amount) throws Exception {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("itemid", "booking-" + bookingId);
        item.put("itemname", "Movie ticket booking " + bookingId);
        item.put("itemprice", amount);
        item.put("itemquantity", 1);
        return objectMapper.writeValueAsString(List.of(item));
    }

    private String buildEmbedData() throws Exception {
        Map<String, Object> embedData = new LinkedHashMap<>();
        embedData.put("redirecturl", zaloPayConfig.getRedirectUrl());
        embedData.put("preferred_payment_method", List.of());
        return objectMapper.writeValueAsString(embedData);
    }

    private String buildAppTransId(Long bookingId, long appTime, String referenceType) {
        String datePrefix = LocalDate.now(VIETNAM_ZONE).format(APP_TRANS_DATE_FORMAT);
        long suffix = Math.floorMod(appTime, 100_000_000L);
        return datePrefix + "_" + referenceType + bookingId + "_" + suffix;
    }

    private String sanitizeAppUser(String appUser) {
        String value = hasText(appUser) ? appUser : "movie-theater";
        return value.length() <= 50 ? value : value.substring(0, 50);
    }

    private String sanitizeDescription(String description, Long bookingId) {
        String value = hasText(description) ? description : "Movie ticket booking " + bookingId;
        return value.length() <= 256 ? value : value.substring(0, 256);
    }

    private int normalizeExpireSeconds() {
        long value = zaloPayConfig.getOrderExpireSeconds();
        if (value < 300) {
            return 300;
        }
        if (value > 2_592_000) {
            return 2_592_000;
        }
        return (int) value;
    }

    private int parseAppId() {
        try {
            return Integer.parseInt(zaloPayConfig.getAppId());
        } catch (NumberFormatException exception) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "ZaloPay app-id không hợp lệ.");
        }
    }

    private void validateConfigured() {
        if (!hasText(zaloPayConfig.getAppId())
                || !hasText(zaloPayConfig.getKey1())
                || !hasText(zaloPayConfig.getKey2())
                || !hasText(zaloPayConfig.getCreateEndpoint())
                || !hasText(zaloPayConfig.getQueryEndpoint())
                || !hasText(zaloPayConfig.getRedirectUrl())) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "Thiếu cấu hình ZaloPay sandbox.");
        }
    }

    private String signHmacSHA256(String data, String key) throws Exception {
        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmac.init(secretKey);
        byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return toHexString(hash);
    }

    private boolean secureEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private String toHexString(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value & 0xff));
        }
        return builder.toString();
    }

    private Integer parseInteger(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    public long parseLong(Object value) {
        if (value == null) {
            return -1;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return -1;
        }
    }

    private String valueOf(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String blankToNull(String value) {
        return hasText(value) ? value : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record ZaloPayQueryResult(
            boolean success,
            long amount,
            long zpTransId,
            Integer returnCode,
            String message) {

        static ZaloPayQueryResult failed(String message) {
            return new ZaloPayQueryResult(false, -1, -1, null, message);
        }
    }
}
