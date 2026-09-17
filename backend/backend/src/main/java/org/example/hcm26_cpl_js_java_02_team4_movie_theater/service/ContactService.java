package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContact;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContactReply;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactCategory;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactPriority;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CustomerContactRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CustomerContactReplyRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactService {

    private final CustomerContactRepository contactRepository;
    private final CustomerContactReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;
    private final Clock clock;
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
        LocalDateTime now = LocalDateTime.now(clock);
        String normalizedEmail = request.getSenderEmail().trim().toLowerCase();
        if (contactRepository.countBySenderEmailIgnoreCaseAndCreatedAtAfter(normalizedEmail, now.minusMinutes(30)) >= 5) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Bạn đã gửi quá nhiều yêu cầu trong 30 phút. Vui lòng chờ trước khi gửi tiếp.");
        }

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

        ContactCategory category = request.getCategory() != null
                ? request.getCategory()
                : inferCategory(request.getSubject());
        ContactPriority priority = defaultPriority(category);

        CustomerContact contact = CustomerContact.builder()
                .senderName(request.getSenderName().trim())
                .senderEmail(normalizedEmail)
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .maskedMessage(maskedMsg)
                .aiApproved(moderationResult.getIsValid())
                .category(category.name())
                .priority(priority.name())
                .status(ContactStatus.NEW.name())
                .dueAt(now.plusHours(slaHours(category)))
                .archived(false)
                .aiReason(moderationResult.getReason())
                .badWords(badWordsStr)
                .build();

        contactRepository.saveAndFlush(contact);
        contact.setTicketCode(createTicketCode(contact.getContactId(), now));
        contactRepository.save(contact);

        return ContactSubmitResponse.builder()
                .success(true)
                .message("Góp ý của bạn đã được gửi thành công. Chúng tôi sẽ xử lý và phản hồi trong thời gian sớm nhất!")
                .aiModerationResult(AiModerationResult.builder().isValid(true).build())
                .ticketCode(contact.getTicketCode())
                .status(safeStatus(contact).name())
                .dueAt(format(contact.getDueAt()))
                .build();
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> getAllContacts() {
        List<CustomerContact> contacts = contactRepository.findAllByArchivedFalseOrderByCreatedAtDesc();
        if (contacts.isEmpty()) return List.of();
        Map<Long, List<ContactReplyResponse>> repliesByContact = replyRepository
                .findByContact_ContactIdInOrderByCreatedAtAsc(
                        contacts.stream().map(CustomerContact::getContactId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        reply -> reply.getContact().getContactId(),
                        Collectors.mapping(this::mapReply, Collectors.toList())));
        return contacts.stream()
                .map(contact -> mapToResponse(contact,
                        repliesByContact.getOrDefault(contact.getContactId(), List.of())))
                .toList();
    }

    @Transactional
    public void deleteContact(Long contactId) {
        CustomerContact contact = contactRepository.findByIdForUpdate(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));
        contact.setArchived(true);
        contactRepository.save(contact);
    }

    @Transactional
    public ContactResponse restoreContact(Long contactId) {
        CustomerContact contact = contactRepository.findByIdForUpdate(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));
        contact.setArchived(false);
        return mapToResponse(contactRepository.save(contact));
    }

    @Transactional
    public ContactResponse replyToContact(Long contactId, ContactReplyRequest request) {
        CustomerContact contact = contactRepository.findByIdForUpdate(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));

        LocalDateTime now = LocalDateTime.now(clock);
        StaffIdentity staff = currentStaff();
        assignIfNeeded(contact, staff);

        String emailSubject = "[" + safeTicketCode(contact) + "] Phản hồi " + contact.getSubject() + " - Magi Cinema";
        boolean emailDelivered = emailService.sendReplyEmail(
                contact.getSenderEmail(), emailSubject, request.getReplyMessage().trim());

        boolean resolveAfterReply = request.getResolveAfterReply() == null || request.getResolveAfterReply();
        contact.setStatus((resolveAfterReply ? ContactStatus.RESOLVED : ContactStatus.WAITING_CUSTOMER).name());
        contact.setAdminReply(request.getReplyMessage().trim());
        contact.setRepliedAt(now);
        if (contact.getFirstResponseAt() == null) {
            contact.setFirstResponseAt(now);
        }
        contact.setResolvedAt(resolveAfterReply ? now : null);
        contact.setClosedAt(null);

        replyRepository.save(CustomerContactReply.builder()
                .contact(contact)
                .replyMessage(request.getReplyMessage().trim())
                .staffUserId(staff.userId())
                .staffName(staff.displayName())
                .emailDelivered(emailDelivered)
                .build());

        CustomerContact updated = contactRepository.save(contact);
        return mapToResponse(updated);
    }

    @Transactional
    public ContactResponse updateContact(Long contactId, ContactUpdateRequest request) {
        CustomerContact contact = contactRepository.findByIdForUpdate(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND, "Không tìm thấy thông tin liên hệ"));
        LocalDateTime now = LocalDateTime.now(clock);

        if (Boolean.TRUE.equals(request.getAssignToMe())) {
            assignIfNeeded(contact, currentStaff());
            if (safeStatus(contact) == ContactStatus.NEW) {
                contact.setStatus(ContactStatus.IN_PROGRESS.name());
            }
        }
        if (request.getPriority() != null) {
            contact.setPriority(request.getPriority().name());
            contact.setDueAt(recalculateDueAt(contact, request.getPriority()));
        }
        if (request.getInternalNote() != null) {
            contact.setInternalNote(request.getInternalNote().trim());
        }
        if (request.getStatus() != null) {
            applyStatus(contact, request.getStatus(), now);
        }
        return mapToResponse(contactRepository.save(contact));
    }

    @Transactional(readOnly = true)
    public ContactTrackingResponse trackContact(String ticketCode, String email) {
        CustomerContact contact = contactRepository
                .findByTicketCodeIgnoreCaseAndSenderEmailIgnoreCase(ticketCode.trim(), email.trim())
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND,
                        "Không tìm thấy yêu cầu với mã tra cứu và email này."));
        return ContactTrackingResponse.builder()
                .ticketCode(contact.getTicketCode())
                .subject(contact.getSubject())
                .category(safeCategory(contact).name())
                .priority(safePriority(contact).name())
                .status(safeStatus(contact).name())
                .createdAt(format(contact.getCreatedAt()))
                .updatedAt(format(contact.getUpdatedAt()))
                .dueAt(format(contact.getDueAt()))
                .resolvedAt(format(contact.getResolvedAt()))
                .replies(mapReplies(contact.getContactId()))
                .build();
    }

    @Transactional(readOnly = true)
    public ContactAnalyticsResponse getAnalytics() {
        List<CustomerContact> contacts = contactRepository.findAllByArchivedFalseOrderByCreatedAtDesc();
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        List<Long> responseTimes = contacts.stream()
                .filter(c -> c.getFirstResponseAt() != null && c.getCreatedAt() != null)
                .map(c -> ChronoUnit.MINUTES.between(c.getCreatedAt(), c.getFirstResponseAt()))
                .filter(value -> value >= 0)
                .toList();
        return ContactAnalyticsResponse.builder()
                .totalActive(contacts.size())
                .newCount(contacts.stream().filter(c -> safeStatus(c) == ContactStatus.NEW).count())
                .inProgressCount(contacts.stream().filter(c -> safeStatus(c) == ContactStatus.IN_PROGRESS).count())
                .waitingCustomerCount(contacts.stream().filter(c -> safeStatus(c) == ContactStatus.WAITING_CUSTOMER).count())
                .overdueCount(contacts.stream().filter(c -> isOverdue(c, now)).count())
                .resolvedTodayCount(contacts.stream().filter(c -> c.getResolvedAt() != null && c.getResolvedAt().toLocalDate().equals(today)).count())
                .flaggedCount(contacts.stream().filter(c -> Boolean.FALSE.equals(c.getAiApproved()) || StringUtils.hasText(c.getBadWords())).count())
                .averageFirstResponseMinutes(responseTimes.stream().mapToLong(Long::longValue).average().orElse(0))
                .build();
    }

    private ContactResponse mapToResponse(CustomerContact contact) {
        return mapToResponse(contact, mapReplies(contact.getContactId()));
    }

    private ContactResponse mapToResponse(CustomerContact contact, List<ContactReplyResponse> replies) {
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
                .ticketCode(safeTicketCode(contact))
                .senderName(contact.getSenderName())
                .senderEmail(contact.getSenderEmail())
                .subject(contact.getSubject())
                .message(contact.getMessage())
                .maskedMessage(maskedMessage)
                .aiApproved(contact.getAiApproved())
                .aiReason(contact.getAiReason())
                .badWords(badWordsList)
                .status(safeStatus(contact).name())
                .category(safeCategory(contact).name())
                .priority(safePriority(contact).name())
                .assignedToUserId(contact.getAssignedToUserId())
                .assignedToName(contact.getAssignedToName())
                .dueAt(format(contact.getDueAt()))
                .overdue(isOverdue(contact, LocalDateTime.now(clock)))
                .firstResponseAt(format(contact.getFirstResponseAt()))
                .resolvedAt(format(contact.getResolvedAt()))
                .closedAt(format(contact.getClosedAt()))
                .internalNote(contact.getInternalNote())
                .archived(Boolean.TRUE.equals(contact.getArchived()))
                .adminReply(contact.getAdminReply())
                .repliedAt(format(contact.getRepliedAt()))
                .createdAt(format(contact.getCreatedAt()))
                .updatedAt(format(contact.getUpdatedAt()))
                .replies(replies)
                .build();
    }

    private List<ContactReplyResponse> mapReplies(Long contactId) {
        return replyRepository.findByContact_ContactIdOrderByCreatedAtAsc(contactId).stream()
                .map(this::mapReply)
                .toList();
    }

    private ContactReplyResponse mapReply(CustomerContactReply reply) {
        return ContactReplyResponse.builder()
                .replyId(reply.getReplyId())
                .replyMessage(reply.getReplyMessage())
                .staffName(reply.getStaffName())
                .emailDelivered(reply.getEmailDelivered())
                .createdAt(format(reply.getCreatedAt()))
                .build();
    }

    private void applyStatus(CustomerContact contact, ContactStatus status, LocalDateTime now) {
        contact.setStatus(status.name());
        if (status == ContactStatus.RESOLVED) {
            contact.setResolvedAt(now);
            contact.setClosedAt(null);
        } else if (status == ContactStatus.CLOSED) {
            contact.setResolvedAt(contact.getResolvedAt() == null ? now : contact.getResolvedAt());
            contact.setClosedAt(now);
        } else {
            contact.setResolvedAt(null);
            contact.setClosedAt(null);
        }
    }

    private void assignIfNeeded(CustomerContact contact, StaffIdentity staff) {
        if (!StringUtils.hasText(contact.getAssignedToUserId())) {
            contact.setAssignedToUserId(staff.userId());
            contact.setAssignedToName(staff.displayName());
        }
    }

    private StaffIdentity currentStaff() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null && authentication.isAuthenticated()
                ? authentication.getName()
                : "system";
        User user = userRepository.findByUsername(username).orElse(null);
        return user == null
                ? new StaffIdentity(null, username)
                : new StaffIdentity(user.getUserId(), user.getUsername());
    }

    private ContactCategory inferCategory(String subject) {
        String value = subject == null ? "" : subject.toLowerCase();
        if (value.contains("đặt vé") || value.contains("thanh toán")) return ContactCategory.BOOKING_PAYMENT;
        if (value.contains("nhân viên")) return ContactCategory.STAFF_ATTITUDE;
        if (value.contains("hợp tác") || value.contains("quảng cáo")) return ContactCategory.PARTNERSHIP;
        if (value.contains("phim") || value.contains("lịch chiếu")) return ContactCategory.MOVIE_SCHEDULE;
        if (value.contains("dịch vụ") || value.contains("chất lượng")) return ContactCategory.SERVICE_QUALITY;
        return ContactCategory.OTHER;
    }

    private ContactPriority defaultPriority(ContactCategory category) {
        return switch (category) {
            case BOOKING_PAYMENT, STAFF_ATTITUDE -> ContactPriority.HIGH;
            case PARTNERSHIP -> ContactPriority.LOW;
            default -> ContactPriority.NORMAL;
        };
    }

    private long slaHours(ContactCategory category) {
        return switch (category) {
            case BOOKING_PAYMENT -> 8;
            case STAFF_ATTITUDE -> 12;
            case PARTNERSHIP -> 48;
            default -> 24;
        };
    }

    private LocalDateTime recalculateDueAt(CustomerContact contact, ContactPriority priority) {
        LocalDateTime base = contact.getCreatedAt() != null ? contact.getCreatedAt() : LocalDateTime.now(clock);
        long hours = switch (priority) {
            case URGENT -> 4;
            case HIGH -> 8;
            case NORMAL -> 24;
            case LOW -> 48;
        };
        return base.plusHours(hours);
    }

    private boolean isOverdue(CustomerContact contact, LocalDateTime now) {
        ContactStatus status = safeStatus(contact);
        return contact.getDueAt() != null
                && contact.getDueAt().isBefore(now)
                && status != ContactStatus.RESOLVED
                && status != ContactStatus.CLOSED;
    }

    private String createTicketCode(Long contactId, LocalDateTime now) {
        return "MAGI-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + String.format("%06d", contactId);
    }

    private String safeTicketCode(CustomerContact contact) {
        return StringUtils.hasText(contact.getTicketCode()) ? contact.getTicketCode() : "MAGI-" + contact.getContactId();
    }

    private ContactCategory safeCategory(CustomerContact contact) {
        if (!StringUtils.hasText(contact.getCategory())) return inferCategory(contact.getSubject());
        try {
            return ContactCategory.valueOf(contact.getCategory());
        } catch (IllegalArgumentException ex) {
            return inferCategory(contact.getSubject());
        }
    }

    private ContactPriority safePriority(CustomerContact contact) {
        if (!StringUtils.hasText(contact.getPriority())) return defaultPriority(safeCategory(contact));
        try {
            return ContactPriority.valueOf(contact.getPriority());
        } catch (IllegalArgumentException ex) {
            return defaultPriority(safeCategory(contact));
        }
    }

    private ContactStatus safeStatus(CustomerContact contact) {
        if (!StringUtils.hasText(contact.getStatus())) return ContactStatus.NEW;
        if ("RECEIVED".equals(contact.getStatus())) return ContactStatus.NEW;
        if ("REPLIED".equals(contact.getStatus())) return ContactStatus.RESOLVED;
        try {
            return ContactStatus.valueOf(contact.getStatus());
        } catch (IllegalArgumentException ex) {
            return ContactStatus.NEW;
        }
    }

    private String format(LocalDateTime value) {
        return value == null ? null : value.format(DATE_FORMATTER);
    }

    private record StaffIdentity(String userId, String displayName) {}

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
