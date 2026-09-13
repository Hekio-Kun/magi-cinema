package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.PaymentTransactionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PaymentTransaction;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentTransactionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PaymentTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentTransactionService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public void recordInitiated(
            Long bookingId,
            PaymentMethod paymentMethod,
            String providerReference,
            long expectedAmount) {
        if (bookingId == null || paymentMethod == null || isBlank(providerReference) || expectedAmount <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin giao dịch thanh toán không hợp lệ.");
        }

        PaymentTransaction transaction = paymentTransactionRepository
                .findByPaymentMethodAndProviderReference(paymentMethod, providerReference)
                .orElseGet(() -> {
                    Booking booking = bookingRepository.findById(bookingId)
                            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
                    return PaymentTransaction.builder()
                            .booking(booking)
                            .paymentMethod(paymentMethod)
                            .providerReference(providerReference)
                            .expectedAmount(expectedAmount)
                            .status(PaymentTransactionStatus.INITIATED)
                            .build();
                });

        if (!bookingId.equals(transaction.getBooking().getBookingId())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã giao dịch không khớp với booking.");
        }
        if (!expectedAmountEquals(transaction, expectedAmount)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số tiền giao dịch không khớp với booking.");
        }
        if (transaction.getStatus() == null || transaction.getStatus() == PaymentTransactionStatus.INITIATED) {
            transaction.setStatus(PaymentTransactionStatus.INITIATED);
        }
        paymentTransactionRepository.save(transaction);
    }

    /**
     * Locks the booking and transaction row so two callbacks for the same booking
     * cannot both transition different payment attempts to SUCCESS.
     */
    @Transactional
    public CallbackPreparation prepareCallback(
            PaymentMethod paymentMethod,
            String providerReference,
            String providerTransactionId,
            Long bookingId,
            long receivedAmount,
            boolean successful,
            String callbackMessage) {
        if (paymentMethod == null || isBlank(providerReference)) {
            return CallbackPreparation.unknown();
        }

        PaymentTransaction transaction = paymentTransactionRepository
                .findForUpdate(paymentMethod, providerReference)
                .orElse(null);
        Booking booking;
        if (transaction == null) {
            if (bookingId == null) {
                return CallbackPreparation.unknown();
            }
            // Lock first to serialize the first callback against a concurrent callback
            // that is creating the same legacy/missing ledger row.
            booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
            if (booking == null) {
                return CallbackPreparation.unknown();
            }
            transaction = paymentTransactionRepository
                    .findForUpdate(paymentMethod, providerReference)
                    .orElse(null);
            if (transaction == null) {
                long expectedAmount = booking.getTotalAmount() == null ? -1L : booking.getTotalAmount();
                transaction = PaymentTransaction.builder()
                        .booking(booking)
                        .paymentMethod(paymentMethod)
                        .providerReference(providerReference)
                        .expectedAmount(expectedAmount)
                        .status(PaymentTransactionStatus.INITIATED)
                        .build();
                paymentTransactionRepository.save(transaction);
            }
        } else {
            Long transactionBookingId = transaction.getBooking() == null
                    ? null : transaction.getBooking().getBookingId();
            booking = transactionBookingId == null
                    ? null
                    : bookingRepository.findByIdForUpdate(transactionBookingId).orElse(null);
            if (booking == null) {
                return CallbackPreparation.unknown();
            }
        }

        if (bookingId != null && !bookingId.equals(booking.getBookingId())) {
            return invalidate(transaction, receivedAmount, "Mã giao dịch không khớp với booking.");
        }

        if (hasText(providerTransactionId)) {
            PaymentTransaction transactionWithSameProviderId = paymentTransactionRepository
                    .findByPaymentMethodAndProviderTransactionId(paymentMethod, providerTransactionId)
                    .orElse(null);
            if (transactionWithSameProviderId != null
                    && !transactionWithSameProviderId.getPaymentTransactionId().equals(transaction.getPaymentTransactionId())) {
                return invalidate(transaction, receivedAmount, "Mã giao dịch từ cổng đã được ghi nhận cho booking khác.");
            }
            if (hasText(transaction.getProviderTransactionId())
                    && !transaction.getProviderTransactionId().equals(providerTransactionId)) {
                return invalidate(transaction, receivedAmount, "Mã giao dịch từ cổng không nhất quán.");
            }
        }

        PaymentTransactionStatus status = transaction.getStatus();
        if (status == PaymentTransactionStatus.SUCCESS) {
            if (expectedAmountEquals(transaction, receivedAmount)) {
                return new CallbackPreparation(transaction, CallbackResult.DUPLICATE, false);
            }
            return invalidate(transaction, receivedAmount, "Callback lặp có số tiền không khớp.");
        }
        if (status == PaymentTransactionStatus.FAILED) {
            return new CallbackPreparation(transaction, CallbackResult.FAILED, false);
        }
        if (status == PaymentTransactionStatus.INVALID) {
            return new CallbackPreparation(transaction, CallbackResult.INVALID, false);
        }
        if (status == PaymentTransactionStatus.DUPLICATE) {
            return new CallbackPreparation(transaction, CallbackResult.DUPLICATE, false);
        }

        if (!successful) {
            transaction.setReceivedAmount(normalizeAmount(receivedAmount));
            transaction.setLastCallbackMessage(trimMessage(callbackMessage));
            transaction.setCallbackReceivedAt(LocalDateTime.now());
            transaction.setStatus(PaymentTransactionStatus.FAILED);
            paymentTransactionRepository.save(transaction);
            return new CallbackPreparation(transaction, CallbackResult.FAILED, true);
        }
        if (!expectedAmountEquals(transaction, receivedAmount)) {
            return invalidate(transaction, receivedAmount, "Số tiền callback không khớp với booking.");
        }

        PaymentTransaction successfulTransaction = paymentTransactionRepository
                .findFirstByBooking_BookingIdAndStatus(booking.getBookingId(), PaymentTransactionStatus.SUCCESS)
                .orElse(null);
        if (successfulTransaction != null
                && !successfulTransaction.getPaymentTransactionId().equals(transaction.getPaymentTransactionId())) {
            transaction.setStatus(PaymentTransactionStatus.DUPLICATE);
            transaction.setReceivedAmount(receivedAmount);
            transaction.setLastCallbackMessage("Booking đã được ghi nhận thanh toán bởi giao dịch khác.");
            transaction.setCallbackReceivedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            return new CallbackPreparation(transaction, CallbackResult.DUPLICATE, false);
        }

        return new CallbackPreparation(transaction, CallbackResult.READY, true);
    }

    @Transactional
    public void markSuccess(
            PaymentTransaction transaction,
            String providerTransactionId,
            long receivedAmount,
            String callbackMessage) {
        if (transaction == null || transaction.getPaymentTransactionId() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy giao dịch thanh toán.");
        }
        if (transaction.getStatus() == PaymentTransactionStatus.SUCCESS) {
            return;
        }
        transaction.setProviderTransactionId(blankToNull(providerTransactionId));
        transaction.setReceivedAmount(receivedAmount);
        transaction.setLastCallbackMessage(trimMessage(callbackMessage));
        transaction.setCallbackReceivedAt(LocalDateTime.now());
        transaction.setStatus(PaymentTransactionStatus.SUCCESS);
        paymentTransactionRepository.save(transaction);
    }

    @Transactional
    public void markFailed(PaymentTransaction transaction, long receivedAmount, String callbackMessage) {
        if (transaction == null
                || transaction.getStatus() == PaymentTransactionStatus.SUCCESS
                || transaction.getStatus() == PaymentTransactionStatus.FAILED
                || transaction.getStatus() == PaymentTransactionStatus.INVALID
                || transaction.getStatus() == PaymentTransactionStatus.DUPLICATE) {
            return;
        }
        transaction.setReceivedAmount(normalizeAmount(receivedAmount));
        transaction.setLastCallbackMessage(trimMessage(callbackMessage));
        transaction.setCallbackReceivedAt(LocalDateTime.now());
        transaction.setStatus(PaymentTransactionStatus.FAILED);
        paymentTransactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getMyTransactions() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return paymentTransactionRepository.findByBooking_User_UsernameOrderByCreatedAtDesc(username)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentTransactionResponse> getAdminTransactions(int page, int size) {
        int safePage = Math.max(page - 1, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<PaymentTransaction> result = paymentTransactionRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.<PaymentTransactionResponse>builder()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber() + 1)
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private CallbackPreparation invalidate(PaymentTransaction transaction, long receivedAmount, String message) {
        transaction.setReceivedAmount(normalizeAmount(receivedAmount));
        transaction.setLastCallbackMessage(trimMessage(message));
        transaction.setCallbackReceivedAt(LocalDateTime.now());
        transaction.setStatus(PaymentTransactionStatus.INVALID);
        paymentTransactionRepository.save(transaction);
        return new CallbackPreparation(transaction, CallbackResult.INVALID, true);
    }

    private PaymentTransactionResponse toResponse(PaymentTransaction transaction) {
        Booking booking = transaction.getBooking();
        return PaymentTransactionResponse.builder()
                .paymentTransactionId(transaction.getPaymentTransactionId())
                .bookingId(booking == null ? null : booking.getBookingId())
                .movieTitle(booking == null || booking.getShowtime() == null || booking.getShowtime().getMovie() == null
                        ? null : booking.getShowtime().getMovie().getMovieNameVn())
                .paymentMethod(transaction.getPaymentMethod())
                .providerReference(transaction.getProviderReference())
                .providerTransactionId(transaction.getProviderTransactionId())
                .expectedAmount(transaction.getExpectedAmount())
                .receivedAmount(transaction.getReceivedAmount())
                .status(transaction.getStatus())
                .lastCallbackMessage(transaction.getLastCallbackMessage())
                .createdAt(transaction.getCreatedAt())
                .callbackReceivedAt(transaction.getCallbackReceivedAt())
                .build();
    }

    private boolean expectedAmountEquals(PaymentTransaction transaction, long amount) {
        return transaction.getExpectedAmount() != null
                && amount >= 0
                && transaction.getExpectedAmount() == amount;
    }

    private Long normalizeAmount(long amount) {
        return amount < 0 ? null : amount;
    }

    private String trimMessage(String message) {
        if (message == null) return null;
        String value = message.trim();
        return value.length() <= 500 ? value : value.substring(0, 500);
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean hasText(String value) {
        return !isBlank(value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public enum CallbackResult {
        READY,
        CONFIRMED,
        DUPLICATE,
        FAILED,
        INVALID,
        UNKNOWN
    }

    public record CallbackPreparation(
            PaymentTransaction transaction,
            CallbackResult result,
            boolean firstTerminalTransition) {

        static CallbackPreparation unknown() {
            return new CallbackPreparation(null, CallbackResult.UNKNOWN, false);
        }
    }
}
