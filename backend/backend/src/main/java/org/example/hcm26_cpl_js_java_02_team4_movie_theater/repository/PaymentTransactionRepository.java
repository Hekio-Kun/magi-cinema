package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import jakarta.persistence.LockModeType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PaymentTransaction;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentTransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT p
            FROM PaymentTransaction p
            WHERE p.paymentMethod = :paymentMethod
              AND p.providerReference = :providerReference
            """)
    Optional<PaymentTransaction> findForUpdate(
            @Param("paymentMethod") PaymentMethod paymentMethod,
            @Param("providerReference") String providerReference);

    Optional<PaymentTransaction> findByPaymentMethodAndProviderReference(
            PaymentMethod paymentMethod, String providerReference);

    Optional<PaymentTransaction> findByPaymentMethodAndProviderTransactionId(
            PaymentMethod paymentMethod, String providerTransactionId);

    Optional<PaymentTransaction> findFirstByBooking_BookingIdAndStatus(
            Long bookingId, PaymentTransactionStatus status);

    List<PaymentTransaction> findByBooking_User_UserIdOrderByCreatedAtDesc(String userId);

    List<PaymentTransaction> findByBooking_User_UsernameOrderByCreatedAtDesc(String username);

    Page<PaymentTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
