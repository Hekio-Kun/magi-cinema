package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ConcessionOrderStockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConcessionOrderStockReservationRepository extends JpaRepository<ConcessionOrderStockReservation, Long> {
    List<ConcessionOrderStockReservation> findByOrder_ConcessionOrderId(Long orderId);
}
