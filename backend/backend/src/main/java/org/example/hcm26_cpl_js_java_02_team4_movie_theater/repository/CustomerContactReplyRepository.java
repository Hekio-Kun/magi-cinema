package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CustomerContactReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerContactReplyRepository extends JpaRepository<CustomerContactReply, Long> {
    List<CustomerContactReply> findByContact_ContactIdOrderByCreatedAtAsc(Long contactId);
    List<CustomerContactReply> findByContact_ContactIdInOrderByCreatedAtAsc(List<Long> contactIds);
}
