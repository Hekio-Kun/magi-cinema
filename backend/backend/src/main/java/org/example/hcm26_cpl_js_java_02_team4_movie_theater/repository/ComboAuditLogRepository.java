package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ComboAuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComboAuditLogRepository extends JpaRepository<ComboAuditLog, Long> {
    @Query("""
            SELECT log
            FROM ComboAuditLog log
            WHERE (:targetType IS NULL OR log.targetType = :targetType)
              AND (:action IS NULL OR log.action = :action)
            ORDER BY log.createdAt DESC, log.auditLogId DESC
            """)
    List<ComboAuditLog> search(
            @Param("targetType") String targetType,
            @Param("action") String action,
            Pageable pageable
    );

    @Query("""
            SELECT log
            FROM ComboAuditLog log
            WHERE (:targetType IS NULL OR log.targetType = :targetType)
              AND (:action IS NULL OR log.action = :action)
              AND (
                    LOWER(COALESCE(log.targetName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(log.summary, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(log.actorUsername, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY log.createdAt DESC, log.auditLogId DESC
            """)
    List<ComboAuditLog> searchWithKeyword(
            @Param("targetType") String targetType,
            @Param("action") String action,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
