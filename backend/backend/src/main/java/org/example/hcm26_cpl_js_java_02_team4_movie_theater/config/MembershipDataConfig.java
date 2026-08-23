package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipPlan;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MembershipPlanRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserMembershipRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MembershipBenefitRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserMembership;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipBenefitStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipBenefitType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import java.math.BigDecimal;

@Configuration
@RequiredArgsConstructor
public class MembershipDataConfig {
    private final MembershipPlanRepository repository;
    private final UserMembershipRepository membershipRepository;
    private final MembershipBenefitRepository benefitRepository;

    @Bean
    ApplicationRunner seedMembershipTiers() {
        return args -> {
            upsert("MEMBER", "SILVER", "Member", "Hạng khởi đầu khi đăng ký hội viên.",
                    0L, 2_000_000L, "5", "3", 0);
            upsert("VIP", "GOLD", "VIP", "Dành cho hội viên chi tiêu từ 2 triệu đồng trong chu kỳ 12 tháng.",
                    2_000_000L, 4_000_000L, "7", "3", 4);
            upsert("VVIP", "DIAMOND", "VVIP", "Hạng cao nhất từ 4 triệu đồng trong chu kỳ 12 tháng.",
                    4_000_000L, null, "10", "5", 8);
            normalizeActiveTierRanges();
            migrateLegacyMemberships();
            revokeLegacyBirthdayBenefits();
        };
    }

    private void revokeLegacyBirthdayBenefits() {
        var legacyBenefits = benefitRepository.findByType(MembershipBenefitType.BIRTHDAY_COUPLE_COMBO);
        legacyBenefits.forEach(benefit -> {
            if (benefit.getStatus() == MembershipBenefitStatus.AVAILABLE
                    || benefit.getStatus() == MembershipBenefitStatus.HELD) {
                benefit.setStatus(MembershipBenefitStatus.REVOKED);
                benefit.setBooking(null);
            }
        });
        benefitRepository.saveAll(legacyBenefits);
    }

    private void migrateLegacyMemberships() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        // Fetch plan cùng Membership để runner không truy cập lazy proxy sau khi session đóng.
        for (UserMembership membership : membershipRepository.findAllWithPlan()) {
            if (membership.getStatus() == MembershipStatus.PENDING_PAYMENT
                    || membership.getStatus() == MembershipStatus.SCHEDULED) {
                membership.setStatus(MembershipStatus.CANCELLED);
                membership.setCancelledAt(now);
            }
            if (membership.getStatus() != MembershipStatus.ACTIVE
                    && membership.getStatus() != MembershipStatus.LOCKED) {
                membershipRepository.save(membership);
                continue;
            }
            if (membership.getMemberCode() == null || membership.getMemberCode().isBlank()) {
                membership.setMemberCode("MC" + String.format("%08d", membership.getMembershipId()));
            }
            membership.setAnnualSpend(membership.getAnnualSpend() == null ? 0L : membership.getAnnualSpend());
            membership.setTermsAcceptedAt(membership.getTermsAcceptedAt() == null ? now : membership.getTermsAcceptedAt());
            membership.setTierSince(membership.getTierSince() == null ? now : membership.getTierSince());
            java.time.LocalDateTime cycleStart = membership.getStartAt();
            if (cycleStart == null) cycleStart = membership.getActivatedAt();
            if (cycleStart == null) cycleStart = membership.getCreatedAt();
            if (cycleStart == null) cycleStart = now;
            boolean usesLegacyCalendarYear = membership.getEndAt() == null
                    || (membership.getEndAt().getMonthValue() == 12
                    && membership.getEndAt().getDayOfMonth() == 31
                    && membership.getEndAt().getHour() == 23);
            membership.setStartAt(cycleStart);
            if (usesLegacyCalendarYear) membership.setEndAt(cycleStart.plusYears(1));
            membership.setSpendYear(cycleStart.getYear());
            membership.setPlanCodeSnapshot(membership.getPlan().getCode());
            membership.setPlanNameSnapshot(membership.getPlan().getName());
            membershipRepository.save(membership);

            java.time.LocalDateTime membershipCycleStart = cycleStart;
            java.time.LocalDate benefitExpiry = membership.getEndAt().toLocalDate();
            var benefits = benefitRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(
                    membership.getMembershipId());
            benefits.stream()
                    .filter(benefit -> benefit.getStatus() == MembershipBenefitStatus.AVAILABLE
                            || benefit.getStatus() == MembershipBenefitStatus.HELD)
                    .forEach(benefit -> {
                        benefit.setBenefitYear(membershipCycleStart.getYear());
                        benefit.setExpiresAt(benefitExpiry);
                        if (benefit.getFreeTicketType() == null) {
                            benefit.setFreeTicketType(java.util.Optional
                                    .ofNullable(membership.getPlan().getFreeTicketType())
                                    .orElse(MembershipFreeTicketType.STANDARD_2D));
                        }
                    });
            benefitRepository.saveAll(benefits);
        }
    }

    private void upsert(String code, String legacyCode, String name, String description, Long min, Long max,
                        String ticketRate, String concessionRate, int freeTickets) {
        MembershipPlan tier = repository.findByCodeIgnoreCase(code)
                .or(() -> repository.findByCodeIgnoreCase(legacyCode))
                .orElseGet(MembershipPlan::new);
        boolean initializeDefaults = tier.getPlanId() == null || !code.equalsIgnoreCase(tier.getCode());
        tier.setCode(code);
        if (initializeDefaults) {
            tier.setName(name);
            tier.setDescription(description);
            tier.setAnnualSpendMin(min);
            tier.setAnnualSpendMax(max);
            tier.setTicketEarnPercent(new BigDecimal(ticketRate));
            tier.setConcessionEarnPercent(new BigDecimal(concessionRate));
            tier.setAnnualFreeTickets(freeTickets);
            tier.setFreeTicketType(MembershipFreeTicketType.STANDARD_2D);
            tier.setStatus(MembershipPlanStatus.ACTIVE);
        }
        if (tier.getFreeTicketType() == null) {
            tier.setFreeTicketType(MembershipFreeTicketType.STANDARD_2D);
        }
        // Cột cũ được giữ để migration dữ liệu an toàn; nghiệp vụ mới không sử dụng.
        tier.setPrice(0);
        tier.setDurationDays(0);
        tier.setTicketDiscountPercent(BigDecimal.ZERO);
        tier.setComboDiscountPercent(BigDecimal.ZERO);
        tier.setPointMultiplier(BigDecimal.ONE);
        tier.setMaxTicketDiscount(0);
        tier.setMaxComboDiscount(0);
        tier.setPriorityBookingHours(0);
        repository.save(tier);
    }

    private void normalizeActiveTierRanges() {
        var activeTiers = repository.findAll().stream()
                .filter(tier -> tier.getStatus() == MembershipPlanStatus.ACTIVE)
                .sorted(java.util.Comparator.comparing(tier ->
                        java.util.Optional.ofNullable(tier.getAnnualSpendMin()).orElse(0L)))
                .toList();
        for (int i = 0; i < activeTiers.size(); i++) {
            activeTiers.get(i).setAnnualSpendMax(
                    i + 1 < activeTiers.size() ? activeTiers.get(i + 1).getAnnualSpendMin() : null);
        }
        repository.saveAll(activeTiers);
    }
}
