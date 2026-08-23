package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContact;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CustomerContactRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactService {

    private final CustomerContactRepository contactRepository;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini.model-url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String geminiModelUrl;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // Comprehensive list ordered by longest phrase first to ensure precise multi-word masking
    private static final List<String> TOXIC_WORDS_DICTIONARY = List.of(
            // Cụm từ và cấu trúc thô tục dài (xếp trước để che trọn cụm)
            "đụ mẹ m", "đụ mẹ mày", "đụ má mày", "đụ mẹ", "đụ má", "đ đ h", "địt mẹ mày", "địt má mày", "địt mẹ m", "đ m m", "dkm mày", "đkm mày", "đ m mày", "bố mày", "mẹ mày", "má mày",
            "ngu như chó", "ngu như lợn", "ngu như bò", "thằng khốn nạn", "thằng khốn", "con đĩ", "đĩ thõng", "đồ lợn", "thằng chó", "con chó", "chó đẻ", "chó má", "óc chó", "óc lợn",
            "vãi cặc", "vãi lồn", "cút mẹ", "cút đi", "thằng cc", "cc mày", "cặc mày", "lồn mày",
            // Từ đơn và từ chửi thề phổ biến
            "đụ", "địt mẹ", "địt má", "địt", "đéo", "đmm", "đm", "dkm", "đkm", "đ l", "đ m", "đờ mờ",
            "đĩ mẹ", "đĩ", "vcl", "vl", "vãi",
            "cặc", "cc", "clgt", "cl", "lồn", "lồl", "buồi", "c ặ c", "l ồ n",
            // Từ lăng mạ đơn lẻ
            "ngu", "khốn nạn", "khốn", "súc vật", "chó", "lợn", "thần kinh", "điên dại", "điên", "mày", "thằng",
            // Đe dọa bạo lực
            "chém", "giết", "đâm", "cắt họng", "đánh chết",
            // Tiếng Anh
            "motherfucker", "fuck", "fucking", "shit", "bitch", "asshole", "idiot", "stupid", "bastard", "retard", "cunt", "dick", "pussy"
    );

    @Transactional
    public ContactSubmitResponse validateAndSubmit(ContactSubmitRequest request) {
        AiModerationResult moderationResult = moderateContent(request.getSubject(), request.getMessage());

        String badWordsStr = null;
        if (moderationResult.getBadWords() != null && !moderationResult.getBadWords().isEmpty()) {
            badWordsStr = String.join(",", moderationResult.getBadWords());
        }

        String maskedMsg = StringUtils.hasText(moderationResult.getMaskedText())
                ? moderationResult.getMaskedText()
                : request.getMessage().trim();

        // Ensure secondary sweep over maskedMsg
        if (!moderationResult.getIsValid()) {
            maskedMsg = sanitizeWithDictionary(maskedMsg);
        }

        CustomerContact contact = CustomerContact.builder()
                .senderName(request.getSenderName().trim())
                .senderEmail(request.getSenderEmail().trim().toLowerCase())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .maskedMessage(maskedMsg)
                .aiApproved(moderationResult.getIsValid())
                .status("RECEIVED")
                .aiReason(moderationResult.getReason())
                .badWords(badWordsStr)
                .build();

        contactRepository.save(contact);

        return ContactSubmitResponse.builder()
                .success(true)
                .message("Góp ý của bạn đã được gửi thành công. Chúng tôi sẽ xử lý và phản hồi trong thời gian sớm nhất!")
                .aiModerationResult(AiModerationResult.builder().isValid(true).build())
                .build();
    }

    public List<ContactResponse> getAllContacts() {
        List<CustomerContact> contacts = contactRepository.findAllByOrderByCreatedAtDesc();
        return contacts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteContact(Long contactId) {
        CustomerContact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));
        contactRepository.delete(contact);
    }

    @Transactional
    public ContactResponse replyToContact(Long contactId, ContactReplyRequest request) {
        CustomerContact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));

        String emailSubject = "Phản hồi ý kiến [" + contact.getSubject() + "] - MagiCinema";
        emailService.sendReplyEmail(contact.getSenderEmail(), emailSubject, request.getReplyMessage().trim());

        contact.setStatus("REPLIED");
        contact.setAdminReply(request.getReplyMessage().trim());
        contact.setRepliedAt(LocalDateTime.now());

        CustomerContact updated = contactRepository.save(contact);
        return mapToResponse(updated);
    }

    private ContactResponse mapToResponse(CustomerContact contact) {
        List<String> badWordsList = new ArrayList<>();
        if (StringUtils.hasText(contact.getBadWords())) {
            badWordsList = Arrays.stream(contact.getBadWords().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }

        String maskedMessage = contact.getMaskedMessage();
        if (!StringUtils.hasText(maskedMessage) || maskedMessage.equals(contact.getMessage())) {
            maskedMessage = contact.getMessage();
        }
        
        // Ensure even existing records in DB get clean dictionary scrubbing
        if (!contact.getAiApproved() || !badWordsList.isEmpty()) {
            maskedMessage = sanitizeWithDictionary(maskedMessage);
        }

        return ContactResponse.builder()
                .contactId(contact.getContactId())
                .senderName(contact.getSenderName())
                .senderEmail(contact.getSenderEmail())
                .subject(contact.getSubject())
                .message(contact.getMessage())
                .maskedMessage(maskedMessage)
                .aiApproved(contact.getAiApproved())
                .aiReason(contact.getAiReason())
                .badWords(badWordsList)
                .status(contact.getStatus())
                .adminReply(contact.getAdminReply())
                .repliedAt(contact.getRepliedAt() != null ? contact.getRepliedAt().format(DATE_FORMATTER) : null)
                .createdAt(contact.getCreatedAt() != null ? contact.getCreatedAt().format(DATE_FORMATTER) : null)
                .build();
    }

    private AiModerationResult moderateContent(String subject, String message) {
        if (StringUtils.hasText(geminiApiKey)) {
            try {
                AiModerationResult aiResult = callGeminiAiModeration(subject, message);
                if (aiResult != null) {
                    return aiResult;
                }
            } catch (Exception ex) {
                log.warn("Gemini AI check failed, falling back to heuristic dictionary: {}", ex.getMessage());
            }
        }
        return fallbackDictionaryCheck(subject, message);
    }

    private AiModerationResult callGeminiAiModeration(String subject, String message) throws Exception {
        String prompt = "Bạn là hệ thống kiểm duyệt nội dung tự động bằng tiếng Việt cực kỳ nghiêm ngặt.\n" +
                "Nhiệm vụ: Phân loại tin nhắn của người dùng xem có vi phạm tiêu chuẩn cộng đồng hay không.\n\n" +
                "MỘT TIN NHẮN BỊ COI LÀ VI PHẠM (VIOLATION) NẾU CHỨA BẤT KỲ YẾU TỐ NÀO SAU ĐÂY:\n" +
                "1. Chửi thề, từ ngữ tục tĩu, thô tục, lăng mạ, xúc phạm người khác (bao gồm cả từ lóng, viết tắt, biến thể).\n" +
                "2. Nội dung 18+, khiêu dâm, đồi trụy.\n" +
                "3. Đe dọa, bạo lực, kích động thù hận.\n" +
                "4. Hoàn toàn không liên quan đến chủ đề (Spam/Rác).\n\n" +
                "MỘT TIN NHẮN LÀ HỢP LỆ (SAFE) CHỈ KHI:\n" +
                "- Từ ngữ hoàn toàn lịch sự, văn minh, tôn trọng người đọc.\n\n" +
                "THÔNG TIN ĐẦU VÀO:\n" +
                "Chủ đề liên hệ: " + subject + "\n" +
                "Nội dung cần kiểm tra: " + message + "\n\n" +
                "YÊU CẦU ĐẦU RA:\n" +
                "TRẢ LỜI CHỈ BẰNG 1 TỪ DUY NHẤT: 'VIOLATION' hoặc 'SAFE'. Tuyệt đối không giải thích gì thêm.";

        String jsonPayload = objectMapper.writeValueAsString(
                java.util.Map.of(
                        "contents", List.of(
                                java.util.Map.of(
                                        "parts", List.of(
                                                java.util.Map.of("text", prompt)
                                        )
                                )
                        ),
                        "generationConfig", java.util.Map.of(
                                "temperature", 0.1
                        )
                )
        );

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(geminiModelUrl + "?key=" + geminiApiKey))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("Gemini API returned status {}: {}", response.statusCode(), response.body());
            return null;
        }

        JsonNode rootNode = objectMapper.readTree(response.body());
        JsonNode textNode = rootNode.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (!textNode.isMissingNode()) {
            String resultText = textNode.asText().trim().toUpperCase();
            boolean isViolation = resultNodeTextContainsViolation(resultText);

            if (isViolation) {
                // Run 2 passes of censoring using Gemini AI
                String pass1 = aiCensorPass(message, 1);
                String pass2 = aiCensorPass(pass1, 2);
                String finalMasked = sanitizeWithDictionary(pass2);

                List<String> detectedBadWords = findBadWordsInText(subject + " " + message);

                return AiModerationResult.builder()
                        .isValid(false)
                        .reason("Hệ thống kiểm duyệt AI nhận diện nội dung vi phạm tiêu chuẩn cộng đồng (chửi thề, thô tục, 18+, hoặc bạo lực).")
                        .badWords(detectedBadWords)
                        .suggestion("Vui lòng sử dụng ngôn từ lịch sự, văn minh và phù hợp văn hóa rạp chiếu phim.")
                        .maskedText(finalMasked)
                        .build();
            } else {
                return AiModerationResult.builder()
                        .isValid(true)
                        .reason("")
                        .badWords(Collections.emptyList())
                        .suggestion("")
                        .maskedText(message)
                        .build();
            }
        }
        return null;
    }

    private boolean resultNodeTextContainsViolation(String text) {
        return text != null && (text.contains("VIOLATION") || text.contains("VI phẠm") || text.contains("VI PHAM"));
    }

    private String aiCensorPass(String text, int passNumber) {
        try {
            String prompt = "Bạn là hệ thống kiểm duyệt nội dung tiếng Việt.\n\n" +
                    "NHIỆM VỤ: Đọc câu bên dưới và thay thế TẤT CẢ các từ/cụm từ tục tĩu, chửi thề, xúc phạm, " +
                    "thô tục, bạo lực, đe dọa, 18+ bằng dấu sao (***). " +
                    "Bao gồm cả từ lóng, viết tắt, biến thể, và tiếng Anh (Ví dụ: đụ, đụ mẹ, đm, cặc, cc, lồn, cl, đĩ, khốn, m, mày, súc vật, vân vân).\n\n" +
                    "QUY TẮC:\n" +
                    "- Mỗi từ hoặc cụm từ lăng mạ vi phạm thay bằng *** (3 dấu sao).\n" +
                    "- Giữ nguyên tất cả từ không vi phạm, dấu câu, khoảng trắng.\n" +
                    "- KHÔNG thêm bớt từ nào khác.\n" +
                    "- KHÔNG giải thích, KHÔNG thêm ghi chú.\n" +
                    "- Nếu câu không có từ vi phạm nào, trả về NGUYÊN VĂN câu gốc.\n" +
                    (passNumber == 2 ? "- Đây là lần kiểm tra thứ 2. Hãy quét kỹ hơn, đảm bảo KHÔNG CÒN SÓT từ bậy bạ nào chưa che.\n" : "") +
                    "\nCÂU CẦN KIỂM DUYỆT:\n" + text + "\n\n" +
                    "KẾT QUẢ SAU KHI CHE:";

            String jsonPayload = objectMapper.writeValueAsString(
                    java.util.Map.of(
                            "contents", List.of(
                                    java.util.Map.of(
                                            "parts", List.of(
                                                    java.util.Map.of("text", prompt)
                                            )
                                    )
                            ),
                            "generationConfig", java.util.Map.of(
                                    "temperature", 0.1
                            )
                    )
            );

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(geminiModelUrl + "?key=" + geminiApiKey))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode rootNode = objectMapper.readTree(response.body());
                JsonNode textNode = rootNode.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (!textNode.isMissingNode()) {
                    return textNode.asText().trim();
                }
            }
        } catch (Exception ex) {
            log.warn("aiCensorPass pass {} failed: {}", passNumber, ex.getMessage());
        }
        return text;
    }

    private List<String> findBadWordsInText(String content) {
        String combined = content.toLowerCase();
        List<String> detected = new ArrayList<>();
        for (String toxic : TOXIC_WORDS_DICTIONARY) {
            if (combined.contains(toxic) && !detected.contains(toxic)) {
                detected.add(toxic);
            }
        }
        return detected;
    }

    private String sanitizeWithDictionary(String text) {
        if (!StringUtils.hasText(text)) return text;
        String masked = text;
        for (String toxic : TOXIC_WORDS_DICTIONARY) {
            try {
                masked = masked.replaceAll("(?i)" + Pattern.quote(toxic), "***");
            } catch (Exception e) {
                // ignore
            }
        }
        return masked;
    }

    private AiModerationResult fallbackDictionaryCheck(String subject, String message) {
        List<String> detected = findBadWordsInText(subject + " " + message);

        String masked = sanitizeWithDictionary(message);
        if (!detected.isEmpty() && masked != null) {
            return AiModerationResult.builder()
                    .isValid(false)
                    .reason("Hệ thống kiểm duyệt AI nhận diện nội dung có chứa từ ngữ xúc phạm, gay gắt hoặc thiếu chuẩn mực.")
                    .badWords(detected)
                    .suggestion("Vui lòng sử dụng ngôn từ lịch sự, phù hợp văn hóa rạp chiếu phim.")
                    .maskedText(masked)
                    .build();
        }

        return AiModerationResult.builder()
                .isValid(true)
                .reason("")
                .badWords(Collections.emptyList())
                .suggestion("")
                .maskedText(message)
                .build();
    }
}
