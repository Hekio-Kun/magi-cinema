package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Combo;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComboRepository extends JpaRepository<Combo, Long> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndComboIdNot(String name, Long comboId);
    List<Combo> findAllByStatus(ComboStatus status);
}
