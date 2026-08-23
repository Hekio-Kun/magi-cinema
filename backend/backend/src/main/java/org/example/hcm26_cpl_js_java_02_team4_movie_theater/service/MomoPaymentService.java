package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.config.MomoConfig;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MomoPaymentService {

    private static final Pattern BOOKING_ID_PATTERN = Pattern.compile("^BOOKING_(\\d+)_");
    private static final Pattern MEMBERSHIP_ID_PATTERN = Pattern.compile("^MEMBERSHIP_(\\d+)_");

    private final MomoConfig momoConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public MomoPaymentResponse createPaymentRequest(Long bookingId, String orderInfo, long amount) {
        return createPaymentRequest(bookingId, orderInfo, amount, "BOOKING");
    }

    public MomoPaymentResponse createMembershipPaymentRequest(Long membershipId, String orderInfo, long amount) {
        return createPaymentRequest(membershipId, orderInfo, amount, "MEMBERSHIP");
    }

    private MomoPaymentResponse createPaymentRequest(Long bookingId, String orderInfo, long amount, String orderType) {
        validateConfigured();
        if (bookingId == null || amount <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin thanh toán không hợp lệ.");
        }

        try {
            String requestId = buildRequestId(bookingId);
            String orderId = buildOrderId(bookingId, requestId, orderType);
            String safeOrderInfo = hasText(orderInfo) ? orderInfo : "Movie ticket booking " + bookingId;
            String extraData = "";

            if (momoConfig.isLocalMockEnabled()) {
                return buildLocalMockPaymentResponse(bookingId, requestId, orderId, safeOrderInfo, amount, extraData);
            }

            String rawSignature = buildCreateSignatureRaw(
                    amount,
                    extraData,
                    orderId,
                    safeOrderInfo,
                    requestId);
            String signature = signHmacSHA256(rawSignature, momoConfig.getSecretKey());

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("partnerCode", momoConfig.getPartnerCode());
            requestBody.put("partnerName", "Magic Cinema");
            requestBody.put("storeId", "MagicCinema");
            requestBody.put("requestId", requestId);
            requestBody.put("amount", amount);
            requestBody.put("orderId", orderId);
            requestBody.put("orderInfo", safeOrderInfo);
            requestBody.put("redirectUrl", momoConfig.getRedirectUrl());
            requestBody.put("ipnUrl", momoConfig.getIpnUrl());
            requestBody.put("lang", momoConfig.getLang());
            requestBody.put("requestType", momoConfig.getRequestType());
            requestBody.put("autoCapture", true);
            requestBody.put("extraData", extraData);
            requestBody.put("orderGroupId", "");
            requestBody.put("signature", signature);

            String responseBody = sendJson(momoConfig.getCreateEndpoint(), requestBody);
            Map<String, Object> response = objectMapper.readValue(responseBody, new TypeReference<>() {});
            String payUrl = valueOf(response.get("payUrl"));
            if (!hasText(payUrl)) {
                log.warn("MoMo create order response missing payUrl: {}", responseBody);
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "MoMo từ chối tạo giao dịch: %s".formatted(resolveMomoResponseMessage(response)));
            }

            return MomoPaymentResponse.builder()
                    .bookingId(bookingId)
                    .requestId(requestId)
                    .orderId(orderId)
                    .amount(amount)
                    .payUrl(payUrl)
                    .shortLink(blankToNull(valueOf(response.get("shortLink"))))
                    .deeplink(blankToNull(valueOf(response.get("deeplink"))))
                    .qrCodeUrl(blankToNull(valueOf(response.get("qrCodeUrl"))))
                    .resultCode(parseInteger(response.get("resultCode")))
                    .message(blankToNull(valueOf(response.get("message"))))
                    .build();
        } catch (AppException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("Error creating MoMo payment request for booking {}", bookingId, exception);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể tạo yêu cầu thanh toán MoMo.");
        }
    }

    public boolean verifyCallbackSignature(Map<String, String> params) {
        String actualSignature = params.get("signature");
        if (!hasText(actualSignature) || !hasText(momoConfig.getSecretKey())) {
            return false;
        }
        try {
            String rawSignature = buildCallbackSignatureRaw(params);
            String expectedSignature = signHmacSHA256(rawSignature, momoConfig.getSecretKey());
            return secureEquals(expectedSignature, actualSignature);
        } catch (Exception exception) {
            log.error("Error verifying MoMo signature", exception);
            return false;
        }
    }

    public Optional<Long> extractBookingId(String orderId) {
        return extractId(orderId, BOOKING_ID_PATTERN);
    }

    public Optional<Long> extractMembershipId(String orderId) {
        return extractId(orderId, MEMBERSHIP_ID_PATTERN);
    }

    private Optional<Long> extractId(String orderId, Pattern pattern) {
        if (!hasText(orderId)) {
            return Optional.empty();
        }
        Matcher matcher = pattern.matcher(orderId);
        if (!matcher.find()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(matcher.group(1)));
        } catch (NumberFormatException exception) {
            return Optional.empty();
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
            log.warn("MoMo API failed. status={}, body={}", response.statusCode(), response.body());
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "MoMo không phản hồi thành công. HTTP %d".formatted(response.statusCode()));
        }
        return response.body();
    }

    private MomoPaymentResponse buildLocalMockPaymentResponse(
            Long bookingId,
            String requestId,
            String orderId,
            String orderInfo,
            long amount,
            String extraData) throws Exception {
        long responseTime = System.currentTimeMillis();
        String transId = String.valueOf(responseTime);
        Map<String, String> returnParams = new LinkedHashMap<>();
        returnParams.put("partnerCode", momoConfig.getPartnerCode());
        returnParams.put("orderId", orderId);
        returnParams.put("requestId", requestId);
        returnParams.put("amount", String.valueOf(amount));
        returnParams.put("orderInfo", orderInfo);
        returnParams.put("orderType", "momo_wallet");
        returnParams.put("transId", transId);
        returnParams.put("resultCode", "0");
        returnParams.put("message", "Local mock payment success");
        returnParams.put("payType", "webApp");
        returnParams.put("responseTime", String.valueOf(responseTime));
        returnParams.put("extraData", extraData);
        returnParams.put("signature", signHmacSHA256(buildCallbackSignatureRaw(returnParams), momoConfig.getSecretKey()));

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(momoConfig.getRedirectUrl());
        returnParams.forEach(builder::queryParam);

        return MomoPaymentResponse.builder()
                .bookingId(bookingId)
                .requestId(requestId)
                .orderId(orderId)
                .amount(amount)
                .payUrl(builder.toUriString())
                .resultCode(0)
                .message("Local mock payment success")
                .build();
    }

    private String buildCreateSignatureRaw(long amount, String extraData, String orderId, String orderInfo, String requestId) {
        return "accessKey=" + momoConfig.getAccessKey()
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + momoConfig.getIpnUrl()
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + momoConfig.getPartnerCode()
                + "&redirectUrl=" + momoConfig.getRedirectUrl()
                + "&requestId=" + requestId
                + "&requestType=" + momoConfig.getRequestType();
    }

    private String buildCallbackSignatureRaw(Map<String, String> params) {
        return "accessKey=" + momoConfig.getAccessKey()
                + "&amount=" + valueOf(params.get("amount"))
                + "&extraData=" + valueOf(params.get("extraData"))
                + "&message=" + valueOf(params.get("message"))
                + "&orderId=" + valueOf(params.get("orderId"))
                + "&orderInfo=" + valueOf(params.get("orderInfo"))
                + "&orderType=" + valueOf(params.get("orderType"))
                + "&partnerCode=" + valueOf(params.get("partnerCode"))
                + "&payType=" + valueOf(params.get("payType"))
                + "&requestId=" + valueOf(params.get("requestId"))
                + "&responseTime=" + valueOf(params.get("responseTime"))
                + "&resultCode=" + valueOf(params.get("resultCode"))
                + "&transId=" + valueOf(params.get("transId"));
    }

    private String buildRequestId(Long bookingId) {
        return "REQ_" + bookingId + "_" + System.currentTimeMillis();
    }

    private String buildOrderId(Long bookingId, String requestId, String orderType) {
        return orderType + "_" + bookingId + "_" + requestId.replace("REQ_" + bookingId + "_", "");
    }

    private void validateConfigured() {
        if (!hasText(momoConfig.getPartnerCode())
                || !hasText(momoConfig.getAccessKey())
                || !hasText(momoConfig.getSecretKey())
                || !hasText(momoConfig.getCreateEndpoint())
                || !hasText(momoConfig.getRedirectUrl())
                || !hasText(momoConfig.getIpnUrl())
                || !hasText(momoConfig.getRequestType())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thiếu cấu hình MoMo sandbox.");
        }
        if (!momoConfig.isLocalMockEnabled() && isLocalCallbackUrl(momoConfig.getIpnUrl())) {
            log.warn("MoMo IPN URL is local: {}. Sandbox payment can be created, but MoMo server cannot call IPN until a public URL is configured.",
                    momoConfig.getIpnUrl());
        }
    }

    private boolean isLocalCallbackUrl(String url) {
        if (!hasText(url)) {
            return true;
        }
        String normalized = url.toLowerCase();
        return normalized.contains("localhost")
                || normalized.contains("127.0.0.1")
                || normalized.contains("0.0.0.0");
    }

    private String resolveMomoResponseMessage(Map<String, Object> response) {
        String message = valueOf(response.get("message"));
        String localMessage = valueOf(response.get("localMessage"));
        String resultCode = valueOf(response.get("resultCode"));
        if (hasText(message)) {
            return hasText(resultCode) ? "%s (resultCode=%s)".formatted(message, resultCode) : message;
        }
        if (hasText(localMessage)) {
            return hasText(resultCode) ? "%s (resultCode=%s)".formatted(localMessage, resultCode) : localMessage;
        }
        return hasText(resultCode) ? "resultCode=%s".formatted(resultCode) : "không có payUrl";
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

    private String valueOf(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String blankToNull(String value) {
        return hasText(value) ? value : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
