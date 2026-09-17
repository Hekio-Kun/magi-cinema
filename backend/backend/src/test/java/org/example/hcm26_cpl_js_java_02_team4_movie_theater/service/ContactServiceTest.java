package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactReplyRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactSubmitRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactSubmitResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.contact.ContactUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContact;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContactReply;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactCategory;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactPriority;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ContactStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CustomerContactReplyRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CustomerContactRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 18, 10, 0);

    @Mock CustomerContactRepository contactRepository;
    @Mock CustomerContactReplyRepository replyRepository;
    @Mock UserRepository userRepository;
    @Mock EmailService emailService;

    ContactService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-18T03:00:00Z"), ZONE);
        service = new ContactService(contactRepository, replyRepository, userRepository,
                new ObjectMapper(), emailService, clock);
        lenient().when(replyRepository.findByContact_ContactIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void submitCreatesTrackableHighPriorityTicketWithBookingSla() {
        when(contactRepository.countBySenderEmailIgnoreCaseAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(contactRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            CustomerContact contact = invocation.getArgument(0);
            contact.setContactId(42L);
            contact.setCreatedAt(NOW);
            return contact;
        });
        when(contactRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ContactSubmitResponse result = service.validateAndSubmit(ContactSubmitRequest.builder()
                .senderName("  Nguyễn Văn A  ")
                .senderEmail(" Customer@Example.com ")
                .subject("Đặt vé & thanh toán")
                .category(ContactCategory.BOOKING_PAYMENT)
                .message("Tôi đã thanh toán nhưng chưa nhận được vé.")
                .build());

        ArgumentCaptor<CustomerContact> captor = ArgumentCaptor.forClass(CustomerContact.class);
        verify(contactRepository).save(captor.capture());
        CustomerContact saved = captor.getValue();
        assertThat(result.getTicketCode()).isEqualTo("MAGI-20260918-000042");
        assertThat(saved.getSenderEmail()).isEqualTo("customer@example.com");
        assertThat(saved.getCategory()).isEqualTo("BOOKING_PAYMENT");
        assertThat(saved.getPriority()).isEqualTo("HIGH");
        assertThat(saved.getDueAt()).isEqualTo(NOW.plusHours(8));
    }

    @Test
    void submitLimitsRepeatedRequestsFromSameEmail() {
        when(contactRepository.countBySenderEmailIgnoreCaseAndCreatedAtAfter(any(), any())).thenReturn(5L);

        assertThatThrownBy(() -> service.validateAndSubmit(ContactSubmitRequest.builder()
                .senderName("Khách hàng")
                .senderEmail("customer@example.com")
                .subject("Khác")
                .message("Tôi cần hỗ trợ một nội dung cụ thể.")
                .build()))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void replyKeepsConversationHistoryAndCanWaitForCustomer() {
        CustomerContact contact = existingContact();
        when(contactRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(contact));
        when(contactRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByUsername("support01"))
                .thenReturn(Optional.of(User.builder().userId("user-1").username("support01").build()));
        when(emailService.sendReplyEmail(any(), any(), any())).thenReturn(true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("support01", "password", List.of()));

        service.replyToContact(10L, ContactReplyRequest.builder()
                .replyMessage("Magi Cinema đã kiểm tra giao dịch, vui lòng xác nhận lại email nhận vé.")
                .resolveAfterReply(false)
                .build());

        assertThat(contact.getStatus()).isEqualTo(ContactStatus.WAITING_CUSTOMER.name());
        assertThat(contact.getFirstResponseAt()).isEqualTo(NOW);
        assertThat(contact.getAssignedToUserId()).isEqualTo("user-1");
        ArgumentCaptor<CustomerContactReply> replyCaptor = ArgumentCaptor.forClass(CustomerContactReply.class);
        verify(replyRepository).save(replyCaptor.capture());
        assertThat(replyCaptor.getValue().getStaffName()).isEqualTo("support01");
        assertThat(replyCaptor.getValue().getEmailDelivered()).isTrue();
        verify(emailService).sendReplyEmail(any(), any(), any());
    }

    @Test
    void updatePriorityRecalculatesSlaAndCloseRecordsCompletion() {
        CustomerContact contact = existingContact();
        when(contactRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(contact));
        when(contactRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateContact(10L, ContactUpdateRequest.builder()
                .priority(ContactPriority.URGENT)
                .status(ContactStatus.CLOSED)
                .internalNote("Đã đối soát với bộ phận thanh toán")
                .build());

        assertThat(contact.getPriority()).isEqualTo("URGENT");
        assertThat(contact.getDueAt()).isEqualTo(contact.getCreatedAt().plusHours(4));
        assertThat(contact.getStatus()).isEqualTo("CLOSED");
        assertThat(contact.getResolvedAt()).isEqualTo(NOW);
        assertThat(contact.getClosedAt()).isEqualTo(NOW);
    }

    private CustomerContact existingContact() {
        return CustomerContact.builder()
                .contactId(10L)
                .ticketCode("MAGI-20260918-000010")
                .senderName("Khách hàng")
                .senderEmail("customer@example.com")
                .subject("Đặt vé & thanh toán")
                .message("Tôi cần hỗ trợ giao dịch mua vé.")
                .maskedMessage("Tôi cần hỗ trợ giao dịch mua vé.")
                .aiApproved(true)
                .category("BOOKING_PAYMENT")
                .priority("HIGH")
                .status("NEW")
                .createdAt(NOW.minusHours(1))
                .dueAt(NOW.plusHours(7))
                .archived(false)
                .build();
    }
}
