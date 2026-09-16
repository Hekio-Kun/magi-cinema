package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.TicketPriceConfigHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketPriceConfigHistoryRepository extends JpaRepository<TicketPriceConfigHistory, Long> {
    List<TicketPriceConfigHistory> findByOrderByCreatedAtDesc(Pageable pageable);
}
