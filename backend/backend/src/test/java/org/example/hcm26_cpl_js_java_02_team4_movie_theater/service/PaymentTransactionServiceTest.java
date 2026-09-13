package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PaymentTransaction;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentTransactionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentTransactionServiceTest {

    @Mock PaymentTransactionRepository paymentTransactionRepository;
    @Mock BookingRepository bookingRepository;
    @InjectMocks PaymentTransactionService paymentTransactionService;

    @Test
    void firstSuccessfulCallbackIsReadyAndRepeatedCallbackIsDuplicate() {
        Booking booking = booking(10L, 125_000);
        PaymentTransaction transaction = transaction(7L, booking, PaymentTransactionStatus.INITIATED);
        when(paymentTransactionRepository.findForUpdate(PaymentMethod.MOMO, "BOOKING_10_1"))
                .thenReturn(Optional.of(transaction));
        when(bookingRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByPaymentMethodAndProviderTransactionId(PaymentMethod.MOMO, "9901"))
                .thenReturn(Optional.empty());
        when(paymentTransactionRepository.findFirstByBooking_BookingIdAndStatus(10L, PaymentTransactionStatus.SUCCESS))
                .thenReturn(Optional.empty());

        PaymentTransactionService.CallbackPreparation first = paymentTransactionService.prepareCallback(
                PaymentMethod.MOMO, "BOOKING_10_1", "9901", 10L, 125_000, true, "ok");

        assertEquals(PaymentTransactionService.CallbackResult.READY, first.result());
        assertTrue(first.firstTerminalTransition());

        transaction.setStatus(PaymentTransactionStatus.SUCCESS);
        PaymentTransactionService.CallbackPreparation repeated = paymentTransactionService.prepareCallback(
                PaymentMethod.MOMO, "BOOKING_10_1", "9901", 10L, 125_000, true, "ok");

        assertEquals(PaymentTransactionService.CallbackResult.DUPLICATE, repeated.result());
        verify(paymentTransactionRepository, never()).save(argThat(item -> item.getStatus() == PaymentTransactionStatus.SUCCESS));
    }

    @Test
    void amountMismatchIsRecordedAsInvalidAndNeverReady() {
        Booking booking = booking(10L, 125_000);
        PaymentTransaction transaction = transaction(7L, booking, PaymentTransactionStatus.INITIATED);
        when(paymentTransactionRepository.findForUpdate(PaymentMethod.ZALOPAY, "260101_B10_1"))
                .thenReturn(Optional.of(transaction));
        when(bookingRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByPaymentMethodAndProviderTransactionId(PaymentMethod.ZALOPAY, "7701"))
                .thenReturn(Optional.empty());
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PaymentTransactionService.CallbackPreparation result = paymentTransactionService.prepareCallback(
                PaymentMethod.ZALOPAY, "260101_B10_1", "7701", 10L, 125_001, true, "tampered");

        assertEquals(PaymentTransactionService.CallbackResult.INVALID, result.result());
        assertEquals(PaymentTransactionStatus.INVALID, transaction.getStatus());
        assertEquals(125_001L, transaction.getReceivedAmount());
        verify(paymentTransactionRepository).save(transaction);
    }

    @Test
    void failedCallbackOnlyTransitionsInitiatedTransactionOnce() {
        Booking booking = booking(10L, 125_000);
        PaymentTransaction transaction = transaction(7L, booking, PaymentTransactionStatus.INITIATED);
        when(paymentTransactionRepository.findForUpdate(PaymentMethod.MOMO, "BOOKING_10_1"))
                .thenReturn(Optional.of(transaction));
        when(bookingRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PaymentTransactionService.CallbackPreparation first = paymentTransactionService.prepareCallback(
                PaymentMethod.MOMO, "BOOKING_10_1", "9901", 10L, 125_000, false, "cancelled");
        PaymentTransactionService.CallbackPreparation repeated = paymentTransactionService.prepareCallback(
                PaymentMethod.MOMO, "BOOKING_10_1", "9901", 10L, 125_000, false, "cancelled");

        assertEquals(PaymentTransactionService.CallbackResult.FAILED, first.result());
        assertTrue(first.firstTerminalTransition());
        assertEquals(PaymentTransactionService.CallbackResult.FAILED, repeated.result());
        assertFalse(repeated.firstTerminalTransition());
        assertEquals(PaymentTransactionStatus.FAILED, transaction.getStatus());
    }

    private Booking booking(Long id, Integer amount) {
        return Booking.builder().bookingId(id).totalAmount(amount).status(BookingStatus.PENDING).build();
    }

    private PaymentTransaction transaction(Long id, Booking booking, PaymentTransactionStatus status) {
        return PaymentTransaction.builder()
                .paymentTransactionId(id)
                .booking(booking)
                .paymentMethod(PaymentMethod.MOMO)
                .providerReference("BOOKING_10_1")
                .expectedAmount(125_000L)
                .status(status)
                .build();
    }
}
