package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PaymentTransaction;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PaymentTransactionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayCallbackResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceCallbackTest {

    @Mock BookingService bookingService;
    @Mock ZaloPayPaymentService zaloPayPaymentService;
    @Mock MomoPaymentService momoPaymentService;
    @Mock MembershipService membershipService;
    @Mock PaymentTransactionService paymentTransactionService;
    @InjectMocks PaymentService paymentService;

    @Test
    void repeatedMomoIpnDoesNotConfirmBookingAgain() {
        PaymentTransaction transaction = PaymentTransaction.builder().paymentTransactionId(5L).build();
        when(momoPaymentService.verifyCallbackSignature(anyMap())).thenReturn(true);
        when(momoPaymentService.extractBookingId("BOOKING_10_1")).thenReturn(java.util.Optional.of(10L));
        when(momoPaymentService.parseLong("125000")).thenReturn(125_000L);
        when(paymentTransactionService.prepareCallback(
                eq(PaymentMethod.MOMO), eq("BOOKING_10_1"), eq("9901"), eq(10L), eq(125_000L), eq(true), anyString()))
                .thenReturn(new PaymentTransactionService.CallbackPreparation(
                        transaction, PaymentTransactionService.CallbackResult.DUPLICATE, false));

        paymentService.handleMomoIpn(Map.of(
                "orderId", "BOOKING_10_1",
                "transId", "9901",
                "amount", "125000",
                "resultCode", "0",
                "message", "success",
                "signature", "valid"));

        verify(bookingService, never()).confirmBookingPayment(anyLong(), anyLong());
        verify(paymentTransactionService, never()).markSuccess(any(), anyString(), anyLong(), anyString());
    }

    @Test
    void firstMomoIpnConfirmsBookingAndMarksLedgerSuccess() {
        PaymentTransaction transaction = PaymentTransaction.builder().paymentTransactionId(5L).build();
        when(momoPaymentService.verifyCallbackSignature(anyMap())).thenReturn(true);
        when(momoPaymentService.extractBookingId("BOOKING_10_1")).thenReturn(java.util.Optional.of(10L));
        when(momoPaymentService.parseLong("125000")).thenReturn(125_000L);
        when(paymentTransactionService.prepareCallback(
                eq(PaymentMethod.MOMO), eq("BOOKING_10_1"), eq("9901"), eq(10L), eq(125_000L), eq(true), anyString()))
                .thenReturn(new PaymentTransactionService.CallbackPreparation(
                        transaction, PaymentTransactionService.CallbackResult.READY, true));
        when(bookingService.confirmBookingPayment(10L, 125_000L)).thenReturn(true);

        paymentService.handleMomoIpn(Map.of(
                "orderId", "BOOKING_10_1",
                "transId", "9901",
                "amount", "125000",
                "resultCode", "0",
                "message", "success",
                "signature", "valid"));

        verify(bookingService).confirmBookingPayment(10L, 125_000L);
        verify(paymentTransactionService).markSuccess(transaction, "9901", 125_000L, "success");
    }

    @Test
    void repeatedFailedMomoIpnReleasesPendingBookingOnlyOnce() {
        PaymentTransaction transaction = PaymentTransaction.builder().paymentTransactionId(5L).build();
        when(momoPaymentService.verifyCallbackSignature(anyMap())).thenReturn(true);
        when(momoPaymentService.extractBookingId("BOOKING_10_1")).thenReturn(java.util.Optional.of(10L));
        when(momoPaymentService.parseLong("125000")).thenReturn(125_000L);
        when(paymentTransactionService.prepareCallback(
                eq(PaymentMethod.MOMO), eq("BOOKING_10_1"), eq("9901"), eq(10L), eq(125_000L), eq(false), anyString()))
                .thenReturn(
                        new PaymentTransactionService.CallbackPreparation(
                                transaction, PaymentTransactionService.CallbackResult.FAILED, true),
                        new PaymentTransactionService.CallbackPreparation(
                                transaction, PaymentTransactionService.CallbackResult.FAILED, false));

        Map<String, Object> payload = Map.of(
                "orderId", "BOOKING_10_1",
                "transId", "9901",
                "amount", "125000",
                "resultCode", "49",
                "message", "cancelled",
                "signature", "valid");
        paymentService.handleMomoIpn(payload);
        paymentService.handleMomoIpn(payload);

        verify(bookingService).cancelBookingPayment(10L);
        verify(bookingService, never()).confirmBookingPayment(anyLong(), anyLong());
    }
}
