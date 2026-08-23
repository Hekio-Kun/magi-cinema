package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MembershipService {
    private final MembershipPlanRepository planRepository;
    private final UserMembershipRepository membershipRepository;
    private final MembershipPointTransactionRepository pointRepository;
    private final MembershipTierHistoryRepository tierHistoryRepository;
    private final MembershipBenefitRepository benefitRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final BookingRepository bookingRepository;

    public record ActiveMembershipBenefits(UserMembership membership, String planCode, String planName,
                                            BigDecimal ticketEarnPercent, BigDecimal concessionEarnPercent) {
        public static ActiveMembershipBenefits none() {
            return new ActiveMembershipBenefits(null, null, null, BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    @Transactional(readOnly = true)
    public List<MembershipPlanResponse> getActivePlans() {
        return planRepository.findAll().stream()
                .filter(p -> p.getStatus() == MembershipPlanStatus.ACTIVE)
                .sorted(Comparator.comparing(p -> Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L)))
                .map(this::toPlanResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MembershipPlanResponse> getAdminPlans() {
        return planRepository.findAll().stream()
                .sorted(Comparator.comparing(p -> Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L)))
                .map(this::toPlanResponse).toList();
    }

    @Transactional
    public MembershipPlanResponse createPlan(MembershipPlanCreateRequest request) {
        String code = request.getCode().trim().toUpperCase(Locale.ROOT);
        if (planRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw validation("Mã hạng hội viên đã tồn tại.");
        }
        ensureUniqueSpendThreshold(null, request.getAnnualSpendMin());

        MembershipPlan plan = MembershipPlan.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription() == null ? null : request.getDescription().trim())
                .price(0)
                .durationDays(0)
                .ticketDiscountPercent(BigDecimal.ZERO)
                .comboDiscountPercent(BigDecimal.ZERO)
                .pointMultiplier(BigDecimal.ONE)
                .maxTicketDiscount(0)
                .maxComboDiscount(0)
                .priorityBookingHours(0)
                .annualSpendMin(request.getAnnualSpendMin())
                .ticketEarnPercent(request.getTicketEarnPercent())
                .concessionEarnPercent(request.getConcessionEarnPercent())
                .annualFreeTickets(request.getAnnualFreeTickets())
                .freeTicketType(request.getFreeTicketType())
                .status(request.getStatus())
                .build();
        plan = planRepository.save(plan);
        normalizeActivePlanRanges();
        return toPlanResponse(plan);
    }

    @Transactional
    public MembershipPlanResponse updatePlan(Long id, MembershipPlanUpdateRequest request) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> validation("Không tìm thấy hạng hội viên."));
        if ("MEMBER".equalsIgnoreCase(plan.getCode())
                && (request.getAnnualSpendMin() != 0L || request.getStatus() != MembershipPlanStatus.ACTIVE)) {
            throw validation("Hạng MEMBER phải luôn hoạt động và bắt đầu từ 0 đồng.");
        }
        ensureUniqueSpendThreshold(id, request.getAnnualSpendMin());
        plan.setAnnualSpendMin(request.getAnnualSpendMin());
        plan.setTicketEarnPercent(request.getTicketEarnPercent());
        plan.setConcessionEarnPercent(request.getConcessionEarnPercent());
        plan.setAnnualFreeTickets(request.getAnnualFreeTickets());
        plan.setFreeTicketType(request.getFreeTicketType());
        plan.setStatus(request.getStatus());
        plan = planRepository.save(plan);
        normalizeActivePlanRanges();
        return toPlanResponse(plan);
    }

    private void ensureUniqueSpendThreshold(Long ignoredPlanId, Long threshold) {
        boolean duplicated = planRepository.findAll().stream()
                .filter(plan -> ignoredPlanId == null || !plan.getPlanId().equals(ignoredPlanId))
                .anyMatch(plan -> Objects.equals(plan.getAnnualSpendMin(), threshold));
        if (duplicated) throw validation("Đã có hạng hội viên sử dụng ngưỡng chi tiêu này.");
    }

    private void normalizeActivePlanRanges() {
        List<MembershipPlan> activePlans = planRepository.findAll().stream()
                .filter(plan -> plan.getStatus() == MembershipPlanStatus.ACTIVE)
                .sorted(Comparator.comparing(plan -> Optional.ofNullable(plan.getAnnualSpendMin()).orElse(0L)))
                .toList();
        for (int i = 0; i < activePlans.size(); i++) {
            activePlans.get(i).setAnnualSpendMax(
                    i + 1 < activePlans.size() ? activePlans.get(i + 1).getAnnualSpendMin() : null);
        }
        planRepository.saveAll(activePlans);
    }

    @Transactional
    public MembershipResponse getMyMembership() {
        Optional<UserMembership> membership = active(currentUser().getUserId());
        if (membership.isEmpty()) return null;
        rolloverIfNeeded(membership.get());
        return toResponse(membership.get());
    }

    @Transactional
    public MembershipResponse getActiveMembershipForStaff(String userId) {
        Optional<UserMembership> membership = active(userId);
        if (membership.isEmpty()) return null;
        rolloverIfNeeded(membership.get());
        return toResponse(membership.get());
    }

    @Transactional
    public MembershipResponse enroll(MembershipEnrollRequest request) {
        User user = currentUser();
        if (!isCustomer(user)) throw new AppException(ErrorCode.ACCESS_DENIED);
        Optional<UserMembership> existing = active(user.getUserId());
        if (existing.isPresent()) return toResponse(existing.get());
        if (membershipRepository.existsByUser_UserIdAndStatus(user.getUserId(), MembershipStatus.LOCKED)) {
            throw validation("Membership của tài khoản đang bị tạm khóa. Vui lòng liên hệ quản trị viên.");
        }
        UserProfile profile = profileRepository.findById(user.getUserId())
                .orElseThrow(() -> validation("Vui lòng hoàn thiện hồ sơ trước khi đăng ký hội viên."));
        if (profile.getFullName() == null || profile.getFullName().isBlank()
                || profile.getPhoneNumber() == null || profile.getPhoneNumber().isBlank()
                || profile.getDateOfBirth() == null) {
            throw validation("Họ tên, ngày sinh và số điện thoại là bắt buộc.");
        }
        if (Period.between(profile.getDateOfBirth(), LocalDate.now()).getYears() < 12) {
            throw validation("Khách hàng phải đủ 12 tuổi để đăng ký hội viên.");
        }
        if (profileRepository.existsByPhoneNumberAndUserIdNot(profile.getPhoneNumber(), user.getUserId())) {
            throw validation("Số điện thoại đã được sử dụng bởi tài khoản khác.");
        }
        MembershipPlan memberTier = tier("MEMBER");
        LocalDateTime now = LocalDateTime.now();
        UserMembership membership = UserMembership.builder()
                .user(user).plan(memberTier).status(MembershipStatus.ACTIVE)
                .memberCode("MC" + now.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                        + user.getUserId().substring(0, Math.min(4, user.getUserId().length())).toUpperCase())
                .annualSpend(0L).spendYear(now.getYear()).termsAcceptedAt(now).tierSince(now)
                .startAt(now).endAt(now.plusYears(1))
                .activatedAt(now).pricePaid(0).originalPrice(0).creditAmount(0).remainingDaysAtPurchase(0)
                .purchaseType(MembershipPurchaseType.NEW).effectiveMode(MembershipEffectiveMode.IMMEDIATE)
                .planCodeSnapshot(memberTier.getCode()).planNameSnapshot(memberTier.getName())
                .durationDaysSnapshot(0).ticketDiscountSnapshot(BigDecimal.ZERO)
                .comboDiscountSnapshot(BigDecimal.ZERO).pointMultiplierSnapshot(BigDecimal.ONE)
                .build();
        membership = membershipRepository.save(membership);
        recordTierChange(membership, null, memberTier.getCode(), "ENROLL");
        return toResponse(membership);
    }

    @Transactional
    public List<AdminMembershipResponse> getAdminMemberships() {
        List<UserMembership> memberships = membershipRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(m -> m.getStatus() == MembershipStatus.ACTIVE || m.getStatus() == MembershipStatus.LOCKED)
                .toList();
        memberships.forEach(this::rolloverIfNeeded);
        return memberships.stream().map(this::toAdminResponse).toList();
    }

    @Transactional
    public AdminMembershipResponse updateMembershipStatus(Long membershipId, MembershipStatus status) {
        if (status != MembershipStatus.ACTIVE && status != MembershipStatus.LOCKED) {
            throw validation("Admin chỉ có thể chuyển trạng thái Membership giữa Đang hoạt động và Tạm khóa.");
        }

        UserMembership membership = membershipRepository.findByIdForUpdate(membershipId)
                .orElseThrow(() -> validation("Không tìm thấy hội viên."));
        if (membership.getStatus() != MembershipStatus.ACTIVE
                && membership.getStatus() != MembershipStatus.LOCKED) {
            throw validation("Chỉ Membership đang hoạt động hoặc tạm khóa mới có thể thay đổi trạng thái.");
        }

        if (status == MembershipStatus.ACTIVE) {
            membershipRepository.findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(
                            membership.getUser().getUserId(), MembershipStatus.ACTIVE)
                    .filter(activeMembership -> !activeMembership.getMembershipId().equals(membershipId))
                    .ifPresent(activeMembership -> {
                        throw validation("Tài khoản đã có một Membership đang hoạt động khác.");
                    });
        }

        membership.setStatus(status);
        return toAdminResponse(membershipRepository.save(membership));
    }

    @Transactional(readOnly = true)
    public MembershipAdminSummaryResponse getAdminSummary() {
        List<UserMembership> members = membershipRepository.findAll().stream()
                .filter(m -> m.getStatus() == MembershipStatus.ACTIVE).toList();
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        Map<String, Long> byTier = members.stream().collect(java.util.stream.Collectors.groupingBy(
                m -> m.getPlan().getCode(), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        long points = members.stream().map(UserMembership::getUser)
                .map(u -> profileRepository.findById(u.getUserId()).orElse(null)).filter(Objects::nonNull)
                .mapToLong(p -> Optional.ofNullable(p.getLoyaltyPoints()).orElse(0)).sum();
        return MembershipAdminSummaryResponse.builder()
                .activeMembers(members.size()).pendingPayments(0).scheduledMemberships(0)
                .expiringWithinSevenDays(0).newRegistrationsThisMonth(0).revenueThisMonth(0)
                .activeByPlan(byTier).totalPointsBalance(points)
                .totalAnnualSpend(members.stream().mapToLong(m -> Optional.ofNullable(m.getAnnualSpend()).orElse(0L)).sum())
                .joinedThisMonth(members.stream().filter(m -> m.getCreatedAt() != null && !m.getCreatedAt().isBefore(monthStart)).count())
                .build();
    }

    @Transactional
    public List<MembershipPointResponse> getMyPointHistory() {
        UserMembership m = requireActive(currentUser().getUserId());
        rolloverIfNeeded(m);
        return pointRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(m.getMembershipId()).stream()
                .map(p -> MembershipPointResponse.builder().transactionId(p.getTransactionId())
                        .bookingId(p.getBooking() == null ? null : p.getBooking().getBookingId())
                        .type(p.getType().name()).points(p.getPoints()).balanceAfter(p.getBalanceAfter())
                        .description(p.getDescription()).createdAt(p.getCreatedAt()).build()).toList();
    }

    @Transactional
    public List<MembershipBenefitResponse> getMyBenefits() {
        UserMembership m = requireActive(currentUser().getUserId());
        syncAnnualTicketBenefits(m);
        return benefitResponses(m);
    }

    @Transactional
    public List<MembershipBenefitResponse> getBenefitsForStaff(String userId) {
        UserMembership m = requireActive(userId);
        syncAnnualTicketBenefits(m);
        return benefitResponses(m);
    }

    @Transactional(readOnly = true)
    public List<MembershipTierHistoryResponse> getMyTierHistory() {
        UserMembership m = requireActive(currentUser().getUserId());
        return tierHistoryRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(m.getMembershipId()).stream()
                .map(h -> MembershipTierHistoryResponse.builder().historyId(h.getHistoryId())
                        .fromTier(h.getFromTier()).toTier(h.getToTier()).annualSpend(h.getAnnualSpend())
                        .spendYear(h.getSpendYear()).reason(h.getReason()).createdAt(h.getCreatedAt()).build()).toList();
    }

    @Transactional
    public ActiveMembershipBenefits getActiveBenefits(String userId) {
        Optional<UserMembership> membership = active(userId);
        if (membership.isEmpty()) return ActiveMembershipBenefits.none();
        UserMembership m = membership.get();
        rolloverIfNeeded(m);
        return new ActiveMembershipBenefits(m, m.getPlan().getCode(), m.getPlan().getName(),
                nvl(m.getPlan().getTicketEarnPercent()), nvl(m.getPlan().getConcessionEarnPercent()));
    }

    /** Khóa và giữ quyền lợi cho booking để không thể dùng đồng thời ở hai giao dịch. */
    @Transactional
    public List<MembershipBenefit> holdBenefits(String userId, Booking booking, List<Long> requestedIds) {
        if (requestedIds == null || requestedIds.isEmpty()) return List.of();
        List<Long> uniqueIds = requestedIds.stream().filter(Objects::nonNull).distinct().toList();
        if (uniqueIds.size() != requestedIds.size()) {
            throw validation("Danh sách quyền lợi bị trùng hoặc không hợp lệ.");
        }
        UserMembership membership = requireActive(userId);
        rolloverIfNeeded(membership);
        List<MembershipBenefit> benefits = benefitRepository.findAllByIdForUpdate(uniqueIds);
        if (benefits.size() != uniqueIds.size()) throw validation("Không tìm thấy quyền lợi đã chọn.");
        LocalDate today = LocalDate.now();
        for (MembershipBenefit benefit : benefits) {
            if (!benefit.getMembership().getMembershipId().equals(membership.getMembershipId())) {
                throw validation("Quyền lợi không thuộc hội viên này.");
            }
            if (benefit.getStatus() != MembershipBenefitStatus.AVAILABLE) {
                throw validation("Một quyền lợi đã được giữ, sử dụng hoặc không còn khả dụng.");
            }
            if (benefit.getExpiresAt().isBefore(today)) {
                throw validation("Một quyền lợi đã hết hạn.");
            }
            if (benefit.getType() != MembershipBenefitType.FREE_2D_TICKET) {
                throw validation("Quyền lợi này không còn được áp dụng.");
            }
            benefit.setStatus(MembershipBenefitStatus.HELD);
            benefit.setBooking(booking);
        }
        return benefitRepository.saveAll(benefits);
    }

    @Transactional
    public void useHeldBenefits(Booking booking) {
        List<MembershipBenefit> benefits = benefitRepository.findByBooking_BookingIdAndStatus(
                booking.getBookingId(), MembershipBenefitStatus.HELD);
        LocalDateTime now = LocalDateTime.now();
        benefits.forEach(benefit -> {
            benefit.setStatus(MembershipBenefitStatus.USED);
            benefit.setUsedAt(now);
        });
        benefitRepository.saveAll(benefits);
    }

    @Transactional
    public void releaseHeldBenefits(Booking booking) {
        List<MembershipBenefit> benefits = benefitRepository.findByBooking_BookingIdAndStatus(
                booking.getBookingId(), MembershipBenefitStatus.HELD);
        LocalDate today = LocalDate.now();
        benefits.forEach(benefit -> {
            benefit.setStatus(benefit.getExpiresAt().isBefore(today)
                    ? MembershipBenefitStatus.EXPIRED : MembershipBenefitStatus.AVAILABLE);
            benefit.setBooking(null);
            benefit.setUsedAt(null);
        });
        benefitRepository.saveAll(benefits);
    }

    @Transactional
    public void releaseHeldPoints(Booking booking) {
        int held = Optional.ofNullable(booking.getLoyaltyPointsRedeemed()).orElse(0);
        if (held <= 0 || booking.getMembership() == null
                || pointRepository.existsByBooking_BookingIdAndType(booking.getBookingId(), MembershipPointType.RELEASE)) return;
        UserProfile profile = profileRepository.findByUserIdForUpdate(booking.getUser().getUserId()).orElse(null);
        if (profile == null) return;
        int balance = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0) + held;
        profile.setLoyaltyPoints(balance);
        profileRepository.save(profile);
        pointRepository.save(MembershipPointTransaction.builder().membership(booking.getMembership()).booking(booking)
                .type(MembershipPointType.RELEASE).points(held).balanceAfter(balance)
                .description("Hoàn điểm do booking không thành công").build());
    }

    /** Chốt điểm và chi tiêu sau thanh toán. Hạng snapshot của booking được dùng cho giao dịch này. */
    @Transactional
    public int completeSuccessfulBooking(Booking booking) {
        UserMembership membership = booking.getMembership();
        if (membership == null || pointRepository.existsByBooking_BookingIdAndType(
                booking.getBookingId(), MembershipPointType.EARN)) return 0;
        rolloverIfNeeded(membership);
        int redeemed = Optional.ofNullable(booking.getLoyaltyPointsRedeemed()).orElse(0);
        int eligibleSpend = Math.max(0, Optional.ofNullable(booking.getTotalAmount()).orElse(0));
        booking.setMembershipEligibleSpend(eligibleSpend);
        int ticketSubtotal = Optional.ofNullable(booking.getTicketSubtotal()).orElse(0);
        int concessionSubtotal = Optional.ofNullable(booking.getConcessionSubtotal()).orElse(0);
        int pointEligibleTicketSubtotal = resolvePointEligibleTicketSubtotal(booking, ticketSubtotal);
        int pointEligibleSpend = calculatePointEligibleSpend(
                eligibleSpend, ticketSubtotal, concessionSubtotal, pointEligibleTicketSubtotal);
        int earned = calculateEarnedPoints(
                pointEligibleSpend,
                pointEligibleTicketSubtotal,
                concessionSubtotal,
                booking.getMembershipTicketEarnPercent(),
                booking.getMembershipConcessionEarnPercent());
        UserProfile profile = profileRepository.findByUserIdForUpdate(booking.getUser().getUserId()).orElse(null);
        if (profile != null) {
            int balance = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0);
            if (redeemed > 0) pointRepository.save(MembershipPointTransaction.builder().membership(membership)
                    .booking(booking).type(MembershipPointType.REDEEM).points(0).balanceAfter(balance)
                    .description("Đã dùng " + redeemed + " điểm cho booking #" + booking.getBookingId()).build());
            profile.setLoyaltyPoints(balance + earned);
            profileRepository.save(profile);
            pointRepository.save(MembershipPointTransaction.builder().membership(membership).booking(booking)
                    .type(MembershipPointType.EARN).points(earned).balanceAfter(balance + earned)
                    .description("Tích điểm từ booking #" + booking.getBookingId()).build());
        }
        membership.setAnnualSpend(Optional.ofNullable(membership.getAnnualSpend()).orElse(0L) + eligibleSpend);
        upgradeTierIfQualified(membership);
        membershipRepository.save(membership);
        return earned;
    }

    /**
     * Phân bổ số tiền thực trả về vé và bắp nước theo tỷ trọng ban đầu.
     * Ép sang long trước phép nhân để không tràn Integer với đơn hàng lớn.
     */
    static int calculateEarnedPoints(int eligibleSpend, int ticketSubtotal, int concessionSubtotal,
                                     BigDecimal ticketRate, BigDecimal concessionRate) {
        int safeEligibleSpend = Math.max(0, eligibleSpend);
        int safeTicketSubtotal = Math.max(0, ticketSubtotal);
        int safeConcessionSubtotal = Math.max(0, concessionSubtotal);
        long gross = Math.max(1L, (long) safeTicketSubtotal + safeConcessionSubtotal);
        int ticketNet = (int) ((long) safeEligibleSpend * safeTicketSubtotal / gross);
        int concessionNet = safeEligibleSpend - ticketNet;
        BigDecimal safeTicketRate = ticketRate == null ? BigDecimal.ZERO : ticketRate;
        BigDecimal safeConcessionRate = concessionRate == null ? BigDecimal.ZERO : concessionRate;
        return BigDecimal.valueOf(ticketNet).multiply(safeTicketRate)
                .add(BigDecimal.valueOf(concessionNet).multiply(safeConcessionRate))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.FLOOR).intValue();
    }

    static int calculatePointEligibleSpend(int paidAmount, int ticketSubtotal, int concessionSubtotal,
                                           int pointEligibleTicketSubtotal) {
        long paidGross = Math.max(0L, (long) ticketSubtotal + Math.max(0, concessionSubtotal));
        long pointEligibleGross = Math.max(0L,
                (long) pointEligibleTicketSubtotal + Math.max(0, concessionSubtotal));
        if (paidGross == 0 || pointEligibleGross == 0) return 0;
        return (int) ((long) Math.max(0, paidAmount) * Math.min(paidGross, pointEligibleGross) / paidGross);
    }

    private int resolvePointEligibleTicketSubtotal(Booking booking, int ticketSubtotal) {
        if (Optional.ofNullable(booking.getMembershipFreeTicketsUsed()).orElse(0) <= 0) {
            return Math.max(0, ticketSubtotal);
        }
        return Math.max(0, Optional.ofNullable(
                booking.getMembershipPointEligibleTicketSubtotal()).orElse(0));
    }

    /**
     * Cộng bù một lần cho các booking từng bị thiếu điểm do phép nhân Integer bị tràn.
     * Ghi ADJUST riêng để lịch sử điểm vẫn kiểm toán được và không chạy bù hai lần.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void repairUnderAwardedBookingPoints() {
        for (MembershipPointTransaction earnedTransaction : pointRepository.findAll()) {
            if (earnedTransaction.getType() != MembershipPointType.EARN
                    || earnedTransaction.getBooking() == null) continue;
            Booking booking = earnedTransaction.getBooking();
            if (pointRepository.existsByBooking_BookingIdAndType(
                    booking.getBookingId(), MembershipPointType.ADJUST)) continue;
            int eligibleSpend = Optional.ofNullable(booking.getMembershipEligibleSpend()).orElse(
                    Optional.ofNullable(booking.getTotalAmount()).orElse(0));
            int ticketSubtotal = Optional.ofNullable(booking.getTicketSubtotal()).orElse(0);
            int concessionSubtotal = Optional.ofNullable(booking.getConcessionSubtotal()).orElse(0);
            int pointEligibleTicketSubtotal = resolvePointEligibleTicketSubtotal(booking, ticketSubtotal);
            int correct = calculateEarnedPoints(
                    calculatePointEligibleSpend(eligibleSpend, ticketSubtotal, concessionSubtotal,
                            pointEligibleTicketSubtotal),
                    pointEligibleTicketSubtotal,
                    concessionSubtotal,
                    booking.getMembershipTicketEarnPercent(),
                    booking.getMembershipConcessionEarnPercent());
            int recorded = Optional.ofNullable(earnedTransaction.getPoints()).orElse(0);
            int difference = correct - recorded;
            if (difference <= 0) continue;
            UserProfile profile = profileRepository.findByUserIdForUpdate(booking.getUser().getUserId()).orElse(null);
            if (profile == null) continue;
            int newBalance = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0) + difference;
            profile.setLoyaltyPoints(newBalance);
            profileRepository.save(profile);
            booking.setLoyaltyPointsEarned(correct);
            bookingRepository.save(booking);
            pointRepository.save(MembershipPointTransaction.builder()
                    .membership(earnedTransaction.getMembership()).booking(booking)
                    .type(MembershipPointType.ADJUST).points(difference).balanceAfter(newBalance)
                    .description("Cộng bù điểm do sửa lỗi tính toán booking #" + booking.getBookingId())
                    .build());
        }
    }

    private void upgradeTierIfQualified(UserMembership membership) {
        MembershipPlan qualified = planRepository.findAll().stream()
                .filter(p -> p.getStatus() == MembershipPlanStatus.ACTIVE
                        && Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L) <= membership.getAnnualSpend())
                .max(Comparator.comparing(p -> Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L)))
                .orElse(membership.getPlan());
        long currentMin = Optional.ofNullable(membership.getPlan().getAnnualSpendMin()).orElse(0L);
        long newMin = Optional.ofNullable(qualified.getAnnualSpendMin()).orElse(0L);
        if (newMin <= currentMin) return;
        String old = membership.getPlan().getCode();
        membership.setPlan(qualified);
        membership.setPlanCodeSnapshot(qualified.getCode());
        membership.setPlanNameSnapshot(qualified.getName());
        membership.setTierSince(LocalDateTime.now());
        recordTierChange(membership, old, qualified.getCode(), "ANNUAL_SPEND_UPGRADE");
        grantAnnualTickets(membership, qualified.getAnnualFreeTickets());
    }

    void rolloverIfNeeded(UserMembership membership) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cycleStart = Optional.ofNullable(membership.getStartAt())
                .orElseGet(() -> Optional.ofNullable(membership.getCreatedAt()).orElse(now));
        LocalDateTime cycleEnd = Optional.ofNullable(membership.getEndAt())
                .orElse(cycleStart.plusYears(1));
        membership.setStartAt(cycleStart);
        membership.setEndAt(cycleEnd);
        if (now.isBefore(cycleEnd)) return;

        while (!now.isBefore(membership.getEndAt())) {
            LocalDateTime expiredCycleEnd = membership.getEndAt();
            MembershipPlan reranked = qualifiedTier(Optional.ofNullable(membership.getAnnualSpend()).orElse(0L));
            if (!reranked.getPlanId().equals(membership.getPlan().getPlanId())) {
                String old = membership.getPlan().getCode();
                membership.setPlan(reranked);
                membership.setPlanCodeSnapshot(reranked.getCode());
                membership.setPlanNameSnapshot(reranked.getName());
                membership.setTierSince(now);
                recordTierChange(membership, old, reranked.getCode(), "MEMBERSHIP_CYCLE_RERANK");
            }

            expirePoints(membership, expiredCycleEnd);
            expireUnusedBenefits(membership, expiredCycleEnd.toLocalDate());
            LocalDateTime nextCycleStart = expiredCycleEnd;
            membership.setStartAt(nextCycleStart);
            membership.setEndAt(nextCycleStart.plusYears(1));
            membership.setAnnualSpend(0L);
            membership.setSpendYear(nextCycleStart.getYear());
            grantAnnualTickets(membership,
                    Optional.ofNullable(membership.getPlan().getAnnualFreeTickets()).orElse(0));
        }
        membershipRepository.save(membership);
    }

    private void expirePoints(UserMembership membership, LocalDateTime expiredAt) {
        UserProfile profile = profileRepository.findByUserIdForUpdate(membership.getUser().getUserId()).orElse(null);
        if (profile == null) return;
        int expiredPoints = Optional.ofNullable(profile.getLoyaltyPoints()).orElse(0);
        if (expiredPoints <= 0) return;
        profile.setLoyaltyPoints(0);
        profileRepository.save(profile);
        pointRepository.save(MembershipPointTransaction.builder()
                .membership(membership).type(MembershipPointType.EXPIRE)
                .points(-expiredPoints).balanceAfter(0)
                .description("Hết hạn điểm cuối chu kỳ Membership "
                        + expiredAt.toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .build());
    }

    private void expireUnusedBenefits(UserMembership membership, LocalDate expiredAt) {
        List<MembershipBenefit> benefits = benefitRepository
                .findByMembership_MembershipIdOrderByCreatedAtDesc(membership.getMembershipId());
        benefits.stream()
                .filter(benefit -> benefit.getStatus() == MembershipBenefitStatus.AVAILABLE)
                .filter(benefit -> !benefit.getExpiresAt().isAfter(expiredAt))
                .forEach(benefit -> benefit.setStatus(MembershipBenefitStatus.EXPIRED));
        benefitRepository.saveAll(benefits);
    }

    private MembershipPlan qualifiedTier(long annualSpend) {
        return planRepository.findAll().stream()
                .filter(p -> p.getStatus() == MembershipPlanStatus.ACTIVE
                        && Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L) <= annualSpend)
                .max(Comparator.comparing(p -> Optional.ofNullable(p.getAnnualSpendMin()).orElse(0L)))
                .orElseGet(() -> tier("MEMBER"));
    }

    private void grantAnnualTickets(UserMembership membership, int totalEntitlement) {
        LocalDateTime cycleStart = Optional.ofNullable(membership.getStartAt()).orElse(LocalDateTime.now());
        LocalDateTime cycleEnd = Optional.ofNullable(membership.getEndAt()).orElse(cycleStart.plusYears(1));
        int year = cycleStart.getYear();
        long granted = benefitRepository.countByMembership_MembershipIdAndTypeAndBenefitYear(
                membership.getMembershipId(), MembershipBenefitType.FREE_2D_TICKET, year);
        for (long i = granted; i < totalEntitlement; i++) {
            benefitRepository.save(MembershipBenefit.builder().membership(membership)
                    .type(MembershipBenefitType.FREE_2D_TICKET).status(MembershipBenefitStatus.AVAILABLE)
                    .freeTicketType(resolveFreeTicketType(membership.getPlan()))
                    .benefitYear(year).expiresAt(cycleEnd.toLocalDate()).build());
        }
    }

    private MembershipFreeTicketType resolveFreeTicketType(MembershipPlan plan) {
        return Optional.ofNullable(plan.getFreeTicketType())
                .orElse(MembershipFreeTicketType.STANDARD_2D);
    }

    private void syncAnnualTicketBenefits(UserMembership membership) {
        rolloverIfNeeded(membership);
        grantAnnualTickets(membership,
                Optional.ofNullable(membership.getPlan().getAnnualFreeTickets()).orElse(0));
    }

    @Scheduled(cron = "0 10 0 * * *")
    @Transactional
    public void maintainBenefits() {
        LocalDate today = LocalDate.now();
        benefitRepository.findByStatusAndExpiresAtBefore(MembershipBenefitStatus.AVAILABLE, today.plusDays(1))
                .forEach(b -> b.setStatus(MembershipBenefitStatus.EXPIRED));
        for (UserMembership m : membershipRepository.findAll()) {
            if (m.getStatus() != MembershipStatus.ACTIVE && m.getStatus() != MembershipStatus.LOCKED) continue;
            rolloverIfNeeded(m);
        }
    }

    /** Chỉ còn để từ chối callback thanh toán Membership cũ một cách rõ ràng. */
    @Transactional
    public MembershipResponse activateAfterSuccessfulPayment(Long ignored, int ignoredAmount) {
        throw validation("Membership mới không thu phí đăng ký. Vui lòng đăng ký trực tiếp trong hồ sơ.");
    }

    private Optional<UserMembership> active(String userId) {
        return membershipRepository.findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(userId, MembershipStatus.ACTIVE);
    }

    private UserMembership requireActive(String userId) {
        return active(userId).orElseThrow(() -> validation("Tài khoản chưa đăng ký hội viên."));
    }

    private MembershipPlan tier(String code) {
        return planRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> validation("Chưa cấu hình hạng " + code + "."));
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private boolean isCustomer(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> "CUSTOMER".equalsIgnoreCase(r.getRoleName()));
    }

    private void recordTierChange(UserMembership m, String from, String to, String reason) {
        tierHistoryRepository.save(MembershipTierHistory.builder().membership(m).fromTier(from).toTier(to)
                .annualSpend(Optional.ofNullable(m.getAnnualSpend()).orElse(0L))
                .spendYear(Optional.ofNullable(m.getSpendYear()).orElse(LocalDate.now().getYear()))
                .reason(reason).build());
    }

    private MembershipPlanResponse toPlanResponse(MembershipPlan p) {
        return MembershipPlanResponse.builder().planId(p.getPlanId()).code(p.getCode()).name(p.getName())
                .description(p.getDescription()).price(0).durationDays(0)
                .ticketDiscountPercent(BigDecimal.ZERO).comboDiscountPercent(BigDecimal.ZERO).pointMultiplier(BigDecimal.ONE)
                .maxTicketDiscount(0).maxComboDiscount(0).priorityBookingHours(0).status(p.getStatus())
                .annualSpendMin(p.getAnnualSpendMin()).annualSpendMax(p.getAnnualSpendMax())
                .ticketEarnPercent(p.getTicketEarnPercent()).concessionEarnPercent(p.getConcessionEarnPercent())
                .annualFreeTickets(p.getAnnualFreeTickets()).freeTicketType(resolveFreeTicketType(p)).build();
    }

    private MembershipResponse toResponse(UserMembership m) {
        UserProfile p = profileRepository.findById(m.getUser().getUserId()).orElse(null);
        MembershipPlan next = planRepository.findAll().stream()
                .filter(t -> t.getStatus() == MembershipPlanStatus.ACTIVE)
                .filter(t -> Optional.ofNullable(t.getAnnualSpendMin()).orElse(0L) > Optional.ofNullable(m.getAnnualSpend()).orElse(0L))
                .min(Comparator.comparing(t -> Optional.ofNullable(t.getAnnualSpendMin()).orElse(0L))).orElse(null);
        long spend = Optional.ofNullable(m.getAnnualSpend()).orElse(0L);
        long availableTickets = benefitRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(m.getMembershipId()).stream()
                .filter(b -> b.getType() == MembershipBenefitType.FREE_2D_TICKET && b.getStatus() == MembershipBenefitStatus.AVAILABLE).count();
        return MembershipResponse.builder().membershipId(m.getMembershipId()).planCode(m.getPlan().getCode())
                .planName(m.getPlan().getName()).status(m.getStatus()).pricePaid(0).startAt(m.getStartAt()).endAt(m.getEndAt())
                .ticketDiscountPercent(BigDecimal.ZERO).comboDiscountPercent(BigDecimal.ZERO).pointMultiplier(BigDecimal.ONE)
                .memberCode(m.getMemberCode()).annualSpend(spend).spendYear(m.getSpendYear())
                .loyaltyPoints(p == null ? 0 : Optional.ofNullable(p.getLoyaltyPoints()).orElse(0))
                .pointsExpireAt(m.getEndAt())
                .nextTierSpend(next == null ? null : next.getAnnualSpendMin())
                .spendToNextTier(next == null ? 0 : Math.max(0, next.getAnnualSpendMin() - spend))
                .ticketEarnPercent(m.getPlan().getTicketEarnPercent()).concessionEarnPercent(m.getPlan().getConcessionEarnPercent())
                .availableFreeTickets((int) availableTickets)
                .joinedAt(m.getCreatedAt()).tierSince(m.getTierSince()).build();
    }

    private List<MembershipBenefitResponse> benefitResponses(UserMembership membership) {
        return benefitRepository.findByMembership_MembershipIdOrderByCreatedAtDesc(membership.getMembershipId()).stream()
                .filter(b -> b.getType() == MembershipBenefitType.FREE_2D_TICKET)
                .map(b -> MembershipBenefitResponse.builder().benefitId(b.getBenefitId()).type(b.getType().name())
                        .status(b.getStatus().name()).benefitYear(b.getBenefitYear()).expiresAt(b.getExpiresAt())
                        .freeTicketType(Optional.ofNullable(b.getFreeTicketType())
                                .orElse(MembershipFreeTicketType.STANDARD_2D))
                        .usedAt(b.getUsedAt()).bookingId(b.getBooking() == null ? null : b.getBooking().getBookingId())
                        .createdAt(b.getCreatedAt()).build()).toList();
    }

    private AdminMembershipResponse toAdminResponse(UserMembership m) {
        UserProfile p = profileRepository.findById(m.getUser().getUserId()).orElse(null);
        long spend = Optional.ofNullable(m.getAnnualSpend()).orElse(0L);
        MembershipPlan next = planRepository.findAll().stream()
                .filter(t -> t.getStatus() == MembershipPlanStatus.ACTIVE)
                .filter(t -> Optional.ofNullable(t.getAnnualSpendMin()).orElse(0L) > spend)
                .min(Comparator.comparing(t -> Optional.ofNullable(t.getAnnualSpendMin()).orElse(0L)))
                .orElse(null);
        long availableTickets = benefitRepository
                .findByMembership_MembershipIdOrderByCreatedAtDesc(m.getMembershipId()).stream()
                .filter(b -> b.getType() == MembershipBenefitType.FREE_2D_TICKET
                        && b.getStatus() == MembershipBenefitStatus.AVAILABLE)
                .count();
        return AdminMembershipResponse.builder().membershipId(m.getMembershipId()).userId(m.getUser().getUserId())
                .username(m.getUser().getUsername()).email(m.getUser().getEmail())
                .fullName(p == null ? null : p.getFullName()).phoneNumber(p == null ? null : p.getPhoneNumber())
                .loyaltyPoints(p == null ? 0 : Optional.ofNullable(p.getLoyaltyPoints()).orElse(0))
                .pointsExpireAt(m.getEndAt())
                .planCode(m.getPlan().getCode()).planName(m.getPlan().getName()).status(m.getStatus())
                .pricePaid(0).startAt(m.getStartAt()).endAt(m.getEndAt()).createdAt(m.getCreatedAt())
                .activatedAt(m.getActivatedAt()).ticketDiscountPercent(BigDecimal.ZERO).comboDiscountPercent(BigDecimal.ZERO)
                .pointMultiplier(BigDecimal.ONE).memberCode(m.getMemberCode()).annualSpend(spend)
                .spendYear(m.getSpendYear()).ticketEarnPercent(m.getPlan().getTicketEarnPercent())
                .concessionEarnPercent(m.getPlan().getConcessionEarnPercent())
                .nextTierSpend(next == null ? null : next.getAnnualSpendMin())
                .spendToNextTier(next == null ? 0 : Math.max(0, next.getAnnualSpendMin() - spend))
                .availableFreeTickets((int) availableTickets)
                .tierSince(m.getTierSince()).build();
    }

    private BigDecimal nvl(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private AppException validation(String message) { return new AppException(ErrorCode.VALIDATION_ERROR, message); }
}
