package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

import jakarta.persistence.LockModeType;

@Repository
public interface CustomerContactRepository extends JpaRepository<CustomerContact, Long> {
    List<CustomerContact> findAllByOrderByCreatedAtDesc();
    List<CustomerContact> findAllByArchivedFalseOrderByCreatedAtDesc();
    Optional<CustomerContact> findByTicketCodeIgnoreCaseAndSenderEmailIgnoreCase(String ticketCode, String senderEmail);
    long countBySenderEmailIgnoreCaseAndCreatedAtAfter(String senderEmail, LocalDateTime createdAfter);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CustomerContact c where c.contactId = :contactId")
    Optional<CustomerContact> findByIdForUpdate(@Param("contactId") Long contactId);
}
