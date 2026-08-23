package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionEvaluationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionCatalogResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionUsageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionValidationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Promotion;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PromotionUsage;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserMembership;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BirthdayRule;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.LeapDayPolicy;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionDiscountType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionUsageStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UsageLimitType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MembershipPlanRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PromotionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PromotionUsageRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserMembershipRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.Year;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PromotionService {

    static final Set<PromotionUsageStatus> LIMITING_USAGE_STATUSES =
            Set.of(PromotionUsageStatus.RESERVED, PromotionUsageStatus.APPLIED);
    static final Set<PromotionType> BIRTHDAY_YEARLY_BENEFIT_TYPES =
            Set.of(PromotionType.BIRTHDAY, PromotionType.LEAP_DAY_BIRTHDAY);

    PromotionRepository promotionRepository;
    PromotionUsageRepository promotionUsageRepository;
    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    UserMembershipRepository userMembershipRepository;
    MembershipPlanRepository membershipPlanRepository;
    BookingRepository bookingRepository;
    Clock clock;

    @Transactional(readOnly = true)
    public List<PromotionResponse> getPromotions(PromotionStatus status, PromotionType type) {
        return promotionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(promotion -> status == null || promotion.getStatus() == status)
                .filter(promotion -> type == null || promotion.getType() == type)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponse getPromotion(Long promotionId) {
        return toResponse(getPromotionEntity(promotionId));
    }

    @Transactional(readOnly = true)
    public List<PromotionCatalogResponse> getPromotionCatalog() {
        LocalDateTime now = LocalDateTime.now(clock);
        return promotionRepository.findAll(Sort.by(Sort.Direction.ASC, "endAt")).stream()
                .filter(promotion -> promotion.getStatus() == PromotionStatus.ACTIVE)
                .filter(promotion -> now.isBefore(promotion.getEndAt()))
                .map(promotion -> PromotionCatalogResponse.builder()
                        .name(promotion.getName())
                        .code(promotion.getCode())
                        .description(promotion.getDescription())
                        .type(promotion.getType())
                        .discountType(promotion.getDiscountType())
                        .discountValue(promotion.getDiscountValue())
                        .maxDiscountAmount(promotion.getMaxDiscountAmount())
                        .minOrderAmount(promotion.getMinOrderAmount())
                        .eligibleMemberTiers(new LinkedHashSet<>(promotion.getEligibleMemberTiers()))
                        .walletPaymentMethod(promotion.getWalletPaymentMethod())
                        .endAt(promotion.getEndAt())
                        .build())
                .toList();
    }

    @Transactional
    public PromotionResponse createPromotion(PromotionRequest request) {
        validateRequest(request);
        validateUniqueBirthdayPolicy(request, null);
        String code = normalizeCode(request.getCode());
        if (promotionRepository.existsByCodeIgnoreCase(code)) {
            throw new AppException(ErrorCode.PROMOTION_CODE_EXISTED);
        }

        Promotion promotion = new Promotion();
        applyRequest(promotion, request);
        promotion.setCode(code);
        promotion.setStatus(PromotionStatus.DRAFT);
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse updatePromotion(Long promotionId, PromotionRequest request) {
        validateRequest(request);
        validateUniqueBirthdayPolicy(request, promotionId);
        Promotion promotion = promotionRepository.findByIdForUpdate(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        if (promotionUsageRepository.countByPromotion_PromotionIdAndStatusIn(
                promotionId,
                Set.of(PromotionUsageStatus.RESERVED)) > 0) {
            throw new AppException(
                    ErrorCode.PROMOTION_USAGE_LOCKED,
                    "Promotion đang được giữ cho đơn chờ thanh toán và chưa thể chỉnh sửa.");
        }

        String code = normalizeCode(request.getCode());
        if (!code.equals(promotion.getCode())
                && promotionUsageRepository.existsByPromotion_PromotionId(promotionId)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể đổi mã promotion đã có lịch sử sử dụng.");
        }
        if (promotionRepository.existsByCodeIgnoreCaseAndPromotionIdNot(code, promotionId)) {
            throw new AppException(ErrorCode.PROMOTION_CODE_EXISTED);
        }

        PromotionStatus currentStatus = promotion.getStatus();
        applyRequest(promotion, request);
        promotion.setCode(code);
        promotion.setStatus(currentStatus);
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse activatePromotion(Long promotionId) {
        Promotion promotion = promotionRepository.findByIdForUpdate(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        LocalDateTime now = LocalDateTime.now(clock);
        if (!promotion.getEndAt().isAfter(now)) {
            throw new AppException(ErrorCode.PROMOTION_EXPIRED);
        }
        promotion.setStatus(PromotionStatus.ACTIVE);
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse deactivatePromotion(Long promotionId) {
        Promotion promotion = promotionRepository.findByIdForUpdate(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        promotion.setStatus(PromotionStatus.INACTIVE);
        promotion.setDeactivatedAt(LocalDateTime.now(clock));
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional(readOnly = true)
    public List<PromotionEvaluationResponse> getAvailablePromotions(
            Integer orderAmount,
            PaymentMethod paymentMethod) {
        if (orderAmount == null || orderAmount < 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giá trị đơn hàng không hợp lệ.");
        }
        User user = getCurrentUser();
        LocalDateTime now = LocalDateTime.now(clock);
        return promotionRepository.findAll(Sort.by(Sort.Direction.ASC, "endAt")).stream()
                .map(promotion -> evaluateSafely(promotion, user, orderAmount, paymentMethod, now))
                .filter(java.util.Objects::nonNull)
                .map(evaluation -> evaluation.response())
                .toList();
    }

    @Transactional(readOnly = true)
    public PromotionEvaluationResponse validatePromotion(PromotionValidationRequest request) {
        User user = resolveValidationUser(request.getMemberUserId());
        Promotion promotion = promotionRepository.findByCodeIgnoreCase(normalizeCode(request.getCode()))
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        return evaluate(promotion, user, request.getOrderAmount(), request.getPaymentMethod(), LocalDateTime.now(clock))
                .response();
    }

    public PromotionEvaluationResponse reserveForBooking(
            Booking booking,
            String code,
            PaymentMethod paymentMethod) {
        if (code == null || code.isBlank()) {
            booking.setOriginalAmount(booking.getTotalAmount());
            booking.setDiscountAmount(0);
            booking.setPaymentMethod(paymentMethod);
            return null;
        }

        Promotion promotion = promotionRepository.findByCodeForUpdate(normalizeCode(code))
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        PromotionEvaluation evaluation = evaluateForReservation(
                promotion,
                booking.getUser(),
                booking.getTotalAmount(),
                paymentMethod,
                LocalDateTime.now(clock));

        PromotionUsage usage = promotionUsageRepository.findByBookingIdForUpdate(booking.getBookingId())
                .orElseGet(PromotionUsage::new);
        if (usage.getStatus() == PromotionUsageStatus.RESERVED
                || usage.getStatus() == PromotionUsageStatus.APPLIED) {
            throw new AppException(ErrorCode.PROMOTION_ALREADY_APPLIED);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        usage.setPromotion(promotion);
        usage.setUser(booking.getUser());
        usage.setBooking(booking);
        usage.setPromotionCode(promotion.getCode());
        usage.setPromotionType(promotion.getType());
        usage.setMemberTier(evaluation.memberTier());
        usage.setBirthday(evaluation.birthday());
        usage.setBirthdayCycleYear(evaluation.birthdayCycleYear());
        usage.setPaymentMethod(paymentMethod);
        usage.setOriginalAmount(booking.getTotalAmount());
        usage.setDiscountAmount(evaluation.response().getDiscountAmount());
        usage.setFinalAmount(evaluation.response().getFinalAmount());
        usage.setStatus(PromotionUsageStatus.RESERVED);
        usage.setReservedAt(now);
        usage.setPaymentInitiatedAt(null);
        usage.setConfirmedAt(null);
        usage.setReleasedAt(null);
        usage.setReleaseReason(null);
        promotionUsageRepository.save(usage);

        booking.setOriginalAmount(booking.getTotalAmount());
        booking.setDiscountAmount(evaluation.response().getDiscountAmount());
        booking.setTotalAmount(evaluation.response().getFinalAmount());
        booking.setPromotion(promotion);
        booking.setPromotionCode(promotion.getCode());
        booking.setPaymentMethod(paymentMethod);
        bookingRepository.save(booking);
        return evaluation.response();
    }

    public PaymentPreparation prepareForPayment(Booking booking, PaymentMethod paymentMethod) {
        PromotionUsage usage = promotionUsageRepository.findByBookingIdForUpdate(booking.getBookingId())
                .orElse(null);
        if (usage == null || usage.getStatus() == PromotionUsageStatus.RELEASED) {
            booking.setPaymentMethod(paymentMethod);
            bookingRepository.save(booking);
            return PaymentPreparation.success();
        }
        if (usage.getStatus() == PromotionUsageStatus.APPLIED) {
            return PaymentPreparation.success();
        }
        if (usage.getPaymentInitiatedAt() != null) {
            if (usage.getPaymentMethod() != paymentMethod) {
                return PaymentPreparation.failure(
                        "Đơn đã được gửi sang " + usage.getPaymentMethod()
                                + ". Hãy hủy đơn trước khi đổi phương thức thanh toán.");
            }
            return PaymentPreparation.success();
        }

        Promotion promotion = promotionRepository.findByIdForUpdate(usage.getPromotion().getPromotionId())
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        if (promotion.getDeactivatedAt() != null
                && !usage.getReservedAt().isAfter(promotion.getDeactivatedAt())) {
            String message = "Promotion đã bị vô hiệu hóa sau khi được áp dụng vào đơn.";
            releaseUsage(usage, message);
            return PaymentPreparation.failure(message);
        }
        try {
            evaluateExistingReservation(
                    promotion,
                    booking.getUser(),
                    usage.getOriginalAmount(),
                    paymentMethod,
                    LocalDateTime.now(clock));
        } catch (AppException exception) {
            releaseUsage(usage, resolveMessage(exception));
            return PaymentPreparation.failure(resolveMessage(exception));
        }

        usage.setPaymentMethod(paymentMethod);
        usage.setPaymentInitiatedAt(LocalDateTime.now(clock));
        booking.setPaymentMethod(paymentMethod);
        promotionUsageRepository.save(usage);
        bookingRepository.save(booking);
        return PaymentPreparation.success();
    }

    public void confirmUsage(Booking booking) {
        promotionUsageRepository.findByBookingIdForUpdate(booking.getBookingId())
                .filter(usage -> usage.getStatus() == PromotionUsageStatus.RESERVED)
                .ifPresent(usage -> {
                    if (isBirthdayPromotion(usage.getPromotionType())) {
                        userProfileRepository.findByUserIdForUpdate(usage.getUser().getUserId());
                        validateBirthdayYearlyBenefit(
                                usage.getUser(),
                                usage.getBirthdayCycleYear(),
                                true);
                    }
                    usage.setStatus(PromotionUsageStatus.APPLIED);
                    usage.setConfirmedAt(LocalDateTime.now(clock));
                    promotionUsageRepository.save(usage);
                });
    }

    public void releaseForBooking(Booking booking, String reason) {
        promotionUsageRepository.findByBookingIdForUpdate(booking.getBookingId())
                .filter(usage -> usage.getStatus() == PromotionUsageStatus.RESERVED)
                .ifPresent(usage -> releaseUsage(usage, reason));
    }

    public void removeFromPendingBooking(Booking booking) {
        PromotionUsage usage = promotionUsageRepository.findByBookingIdForUpdate(booking.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
        if (usage.getStatus() != PromotionUsageStatus.RESERVED) {
            throw new AppException(ErrorCode.PROMOTION_NOT_APPLICABLE, "Promotion không còn ở trạng thái tạm giữ.");
        }
        if (usage.getPaymentInitiatedAt() != null) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LOCKED);
        }
        releaseUsage(usage, "Khách hàng bỏ promotion khỏi đơn.");
    }

    @Transactional(readOnly = true)
    public List<PromotionUsageResponse> getUsageHistory() {
        return promotionUsageRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toUsageResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionUsageResponse> getMyUsageHistory() {
        return promotionUsageRepository.findByUser_UserIdOrderByCreatedAtDesc(getCurrentUser().getUserId()).stream()
                .map(this::toUsageResponse)
                .toList();
    }

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void expirePromotions() {
        LocalDateTime now = LocalDateTime.now(clock);
        promotionRepository.findAll().stream()
                .filter(promotion -> promotion.getStatus() == PromotionStatus.ACTIVE)
                .filter(promotion -> !promotion.getEndAt().isAfter(now))
                .forEach(promotion -> {
                    Promotion locked = promotionRepository.findByIdForUpdate(promotion.getPromotionId())
                            .orElse(promotion);
                    locked.setStatus(PromotionStatus.EXPIRED);
                    locked.setDeactivatedAt(now);
                    promotionRepository.save(locked);
                });
    }

    private PromotionEvaluation evaluateSafely(
            Promotion promotion,
            User user,
            int orderAmount,
            PaymentMethod paymentMethod,
            LocalDateTime now) {
        try {
            return evaluate(promotion, user, orderAmount, paymentMethod, now);
        } catch (AppException ignored) {
            return null;
        }
    }

    private PromotionEvaluation evaluate(
            Promotion promotion,
            User user,
            int orderAmount,
            PaymentMethod paymentMethod,
            LocalDateTime now) {
        return evaluate(promotion, user, orderAmount, paymentMethod, now, false, false);
    }

    private PromotionEvaluation evaluateExistingReservation(
            Promotion promotion,
            User user,
            int orderAmount,
            PaymentMethod paymentMethod,
            LocalDateTime now) {
        return evaluate(promotion, user, orderAmount, paymentMethod, now, true, true);
    }

    private PromotionEvaluation evaluateForReservation(
            Promotion promotion,
            User user,
            int orderAmount,
            PaymentMethod paymentMethod,
            LocalDateTime now) {
        return evaluate(promotion, user, orderAmount, paymentMethod, now, false, true);
    }

    private PromotionEvaluation evaluate(
            Promotion promotion,
            User user,
            int orderAmount,
            PaymentMethod paymentMethod,
            LocalDateTime now,
            boolean existingReservation,
            boolean lockProfile) {
        if (promotion.getType() == PromotionType.E_WALLET && hasAuthority("BOOKING_MANAGE")) {
            throw new AppException(ErrorCode.PROMOTION_NOT_APPLICABLE, "Chỉ áp dụng voucher ví điện tử khi đặt vé online.");
        }
        validatePromotionState(promotion, now);
        if (orderAmount < 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giá trị đơn hàng không hợp lệ.");
        }
        int minimumAmount = promotion.getMinOrderAmount() == null ? 0 : promotion.getMinOrderAmount();
        if (orderAmount < minimumAmount) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Đơn hàng chưa đạt giá trị tối thiểu " + minimumAmount + " đồng.");
        }
        validateActiveCustomer(user);

        String memberTier = null;
        LocalDate birthday = null;
        Integer birthdayCycleYear = null;
        if (promotion.getType() == PromotionType.MEMBER_TIER) {
            memberTier = validateMemberTier(promotion, user);
        } else if (isBirthdayPromotion(promotion.getType())) {
            UserProfile profile = lockProfile
                    ? userProfileRepository.findByUserIdForUpdate(user.getUserId()).orElse(null)
                    : userProfileRepository.findById(user.getUserId()).orElse(null);
            BirthdayEligibility eligibility = validateBirthday(promotion, profile, now);
            birthday = eligibility.birthday();
            birthdayCycleYear = eligibility.cycleYear();
        } else if (promotion.getType() == PromotionType.E_WALLET) {
            validateWallet(promotion, paymentMethod);
        }

        validateUsageLimits(promotion, user, birthdayCycleYear, existingReservation);
        int discountAmount = calculateDiscount(promotion, orderAmount);
        PromotionEvaluationResponse response = PromotionEvaluationResponse.builder()
                .promotionId(promotion.getPromotionId())
                .name(promotion.getName())
                .code(promotion.getCode())
                .description(promotion.getDescription())
                .originalAmount(orderAmount)
                .discountAmount(discountAmount)
                .finalAmount(Math.max(0, orderAmount - discountAmount))
                .build();
        return new PromotionEvaluation(response, memberTier, birthday, birthdayCycleYear);
    }

    private void validatePromotionState(Promotion promotion, LocalDateTime now) {
        if (promotion.getStatus() != PromotionStatus.ACTIVE) {
            throw new AppException(ErrorCode.PROMOTION_NOT_ACTIVE);
        }
        if (now.isBefore(promotion.getStartAt())) {
            throw new AppException(ErrorCode.PROMOTION_NOT_STARTED);
        }
        if (!now.isBefore(promotion.getEndAt())) {
            throw new AppException(ErrorCode.PROMOTION_EXPIRED);
        }
        if (promotion.getDailyStartTime() != null) {
            LocalTime time = now.toLocalTime();
            LocalTime start = promotion.getDailyStartTime();
            LocalTime end = promotion.getDailyEndTime();
            boolean valid = start.isBefore(end)
                    ? !time.isBefore(start) && time.isBefore(end)
                    : !time.isBefore(start) || time.isBefore(end);
            if (!valid) {
                throw new AppException(
                        ErrorCode.PROMOTION_NOT_APPLICABLE,
                        "Promotion không áp dụng trong khung giờ hiện tại.");
            }
        }
    }

    private void validateActiveCustomer(User user) {
        if (user == null || user.getStatus() != UserStatus.ACTIVE || !isCustomerAccount(user)) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Promotion chỉ áp dụng cho tài khoản khách hàng đang hoạt động.");
        }
    }

    private String validateMemberTier(Promotion promotion, User user) {
        UserMembership membership = userMembershipRepository
                .findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(
                        user.getUserId(), MembershipStatus.ACTIVE)
                .orElseThrow(() -> new AppException(
                        ErrorCode.PROMOTION_NOT_APPLICABLE,
                        "Tài khoản chưa có hội viên đang hoạt động."));
        String tier = normalizeTier(membership.getPlan().getCode());
        if (!promotion.getEligibleMemberTiers().contains(tier)) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Hạng thành viên không thuộc đối tượng áp dụng.");
        }
        return tier;
    }

    private BirthdayEligibility validateBirthday(
            Promotion promotion,
            UserProfile profile,
            LocalDateTime now) {
        if (profile == null || profile.getDateOfBirth() == null) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Khách hàng chưa có ngày sinh.");
        }
        int minimumProfileAgeDays = defaultZero(promotion.getBirthdayMinProfileAgeDays());
        LocalDateTime birthdayUpdatedAt = profile.getDateOfBirthUpdatedAt() != null
                ? profile.getDateOfBirthUpdatedAt()
                : profile.getCreatedAt();
        if (minimumProfileAgeDays > 0
                && (birthdayUpdatedAt == null || birthdayUpdatedAt.plusDays(minimumProfileAgeDays).isAfter(now))) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Ngày sinh chưa đủ thời gian ổn định để sử dụng promotion.");
        }

        LocalDate today = now.toLocalDate();
        LocalDate birthday = profile.getDateOfBirth();
        boolean leapDayBirthday = birthday.getMonth() == Month.FEBRUARY && birthday.getDayOfMonth() == 29;
        if (promotion.getType() == PromotionType.LEAP_DAY_BIRTHDAY && !leapDayBirthday) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Promotion này chỉ áp dụng cho khách sinh ngày 29/02.");
        }
        if (promotion.getType() == PromotionType.BIRTHDAY && leapDayBirthday) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Khách sinh ngày 29/02 cần sử dụng promotion sinh nhật 29/02 riêng.");
        }

        int applicationYear = promotion.getStartAt().getYear();
        LocalDate occurrence = birthdayOccurrence(birthday, applicationYear, promotion.getLeapDayPolicy());
        if (occurrence != null && isBirthdayDateEligible(promotion, today, occurrence)) {
            return new BirthdayEligibility(birthday, applicationYear);
        }
        throw new AppException(
                ErrorCode.PROMOTION_NOT_APPLICABLE,
                "Hiện tại không nằm trong thời gian ưu đãi sinh nhật.");
    }

    private LocalDate birthdayOccurrence(LocalDate birthday, int year, LeapDayPolicy policy) {
        if (birthday.getMonth() != Month.FEBRUARY || birthday.getDayOfMonth() != 29 || Year.isLeap(year)) {
            try {
                return birthday.withYear(year);
            } catch (DateTimeException ignored) {
                return null;
            }
        }
        return switch (policy) {
            case FEBRUARY_28 -> LocalDate.of(year, Month.FEBRUARY, 28);
            case MARCH_1 -> LocalDate.of(year, Month.MARCH, 1);
            case LEAP_DAY_ONLY -> null;
        };
    }

    private boolean isBirthdayDateEligible(Promotion promotion, LocalDate today, LocalDate occurrence) {
        return switch (promotion.getBirthdayRule()) {
            case EXACT_DATE -> today.equals(occurrence);
            case DATE_RANGE -> !today.isBefore(occurrence.minusDays(defaultZero(promotion.getBirthdayDaysBefore())))
                    && !today.isAfter(occurrence.plusDays(defaultZero(promotion.getBirthdayDaysAfter())));
            case BIRTH_MONTH -> today.getYear() == occurrence.getYear()
                    && today.getMonth() == occurrence.getMonth();
        };
    }

    private void validateWallet(Promotion promotion, PaymentMethod paymentMethod) {
        if (paymentMethod == null || paymentMethod != promotion.getWalletPaymentMethod()) {
            throw new AppException(ErrorCode.PROMOTION_PAYMENT_METHOD_INVALID);
        }
    }

    private void validateUsageLimits(
            Promotion promotion,
            User user,
            Integer birthdayCycleYear,
            boolean existingReservation) {
        long totalUsageCount = promotionUsageRepository.countByPromotion_PromotionIdAndStatusIn(
                promotion.getPromotionId(),
                LIMITING_USAGE_STATUSES);
        if (existingReservation) {
            totalUsageCount = Math.max(0, totalUsageCount - 1);
        }
        if (promotion.getTotalUsageLimitType() == UsageLimitType.LIMITED
                && totalUsageCount >= promotion.getTotalUsageLimit()) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED);
        }

        if (isBirthdayPromotion(promotion.getType())) {
            validateBirthdayYearlyBenefit(user, birthdayCycleYear, existingReservation);
        }

        long customerUsageCount = isBirthdayPromotion(promotion.getType())
                ? promotionUsageRepository
                        .countByPromotion_PromotionIdAndUser_UserIdAndBirthdayCycleYearAndStatusIn(
                                promotion.getPromotionId(),
                                user.getUserId(),
                                birthdayCycleYear,
                                LIMITING_USAGE_STATUSES)
                : promotionUsageRepository.countByPromotion_PromotionIdAndUser_UserIdAndStatusIn(
                        promotion.getPromotionId(),
                        user.getUserId(),
                        LIMITING_USAGE_STATUSES);
        if (existingReservation) {
            customerUsageCount = Math.max(0, customerUsageCount - 1);
        }
        if (promotion.getPerCustomerUsageLimitType() == UsageLimitType.LIMITED
                && customerUsageCount >= promotion.getPerCustomerUsageLimit()) {
            throw new AppException(ErrorCode.PROMOTION_CUSTOMER_LIMIT_REACHED);
        }
    }

    private void validateBirthdayYearlyBenefit(
            User user,
            Integer applicationYear,
            boolean existingReservation) {
        long annualUsageCount = promotionUsageRepository
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        user.getUserId(),
                        BIRTHDAY_YEARLY_BENEFIT_TYPES,
                        applicationYear,
                        LIMITING_USAGE_STATUSES);
        if (existingReservation) {
            annualUsageCount = Math.max(0, annualUsageCount - 1);
        }
        if (annualUsageCount > 0) {
            throw new AppException(
                    ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED,
                    "Bạn đã sử dụng ưu đãi sinh nhật trong năm " + applicationYear
                            + ". Việc thay đổi ngày sinh không làm phát sinh thêm lượt sử dụng.");
        }
    }

    private int calculateDiscount(Promotion promotion, int orderAmount) {
        long discount = promotion.getDiscountType() == PromotionDiscountType.PERCENTAGE
                ? (long) orderAmount * promotion.getDiscountValue() / 100
                : promotion.getDiscountValue();
        if (promotion.getMaxDiscountAmount() != null) {
            discount = Math.min(discount, promotion.getMaxDiscountAmount());
        }
        return (int) Math.min(Math.max(0L, discount), orderAmount);
    }

    private void releaseUsage(PromotionUsage usage, String reason) {
        usage.setStatus(PromotionUsageStatus.RELEASED);
        usage.setReleasedAt(LocalDateTime.now(clock));
        usage.setReleaseReason(reason);
        promotionUsageRepository.save(usage);

        Booking booking = usage.getBooking();
        if (booking != null && booking.getStatus() == BookingStatus.PENDING) {
            Integer originalAmount = booking.getOriginalAmount() == null
                    ? usage.getOriginalAmount()
                    : booking.getOriginalAmount();
            booking.setTotalAmount(originalAmount);
            booking.setDiscountAmount(0);
            booking.setPromotion(null);
            booking.setPromotionCode(null);
            bookingRepository.save(booking);
        }
    }

    private void validateRequest(PromotionRequest request) {
        if (!request.getStartAt().isBefore(request.getEndAt())) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
        if (request.getStartAt().getYear() != request.getEndAt().getYear()) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Thời gian khuyến mãi phải nằm trong cùng một năm.");
        }
        if ((request.getDailyStartTime() == null) != (request.getDailyEndTime() == null)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Khung giờ áp dụng phải có đủ giờ bắt đầu và kết thúc.");
        }
        if (request.getDailyStartTime() != null
                && request.getDailyStartTime().equals(request.getDailyEndTime())) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Giờ bắt đầu và kết thúc khung giờ không được trùng nhau.");
        }
        if (request.getDiscountType() == PromotionDiscountType.PERCENTAGE
                && request.getDiscountValue() > 100) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phần trăm giảm phải từ 1 đến 100.");
        }
        validateUsageLimit(
                request.getTotalUsageLimitType(),
                request.getTotalUsageLimit(),
                "tổng lượt sử dụng");
        validateUsageLimit(
                request.getPerCustomerUsageLimitType(),
                request.getPerCustomerUsageLimit(),
                "lượt sử dụng trên mỗi khách hàng");
        if (request.getTotalUsageLimitType() == UsageLimitType.LIMITED
                && request.getPerCustomerUsageLimitType() == UsageLimitType.LIMITED
                && request.getPerCustomerUsageLimit() > request.getTotalUsageLimit()) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Lượt dùng mỗi khách hàng không được vượt tổng lượt promotion.");
        }

        if (request.getType() == PromotionType.MEMBER_TIER) {
            Set<String> tiers = normalizeTiers(request.getEligibleMemberTiers());
            if (tiers.isEmpty()) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Promotion theo hạng phải có ít nhất một hạng thành viên.");
            }
            if (tiers.stream().anyMatch(tier -> !tier.matches("^[A-Z0-9_-]{2,50}$"))) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Mã hạng thành viên không hợp lệ.");
            }
            Set<String> unknownTiers = tiers.stream()
                    .filter(tier -> membershipPlanRepository.findByCodeIgnoreCase(tier).isEmpty())
                    .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
            if (!unknownTiers.isEmpty()) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Hạng hội viên không tồn tại: " + String.join(", ", unknownTiers) + ".");
            }
        }
        if (isBirthdayPromotion(request.getType()) && request.getBirthdayRule() == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Promotion sinh nhật phải cấu hình quy tắc thời gian hưởng ưu đãi.");
        }
        if (isBirthdayPromotion(request.getType())
                && (!request.getStartAt().toLocalDate().equals(LocalDate.of(request.getStartAt().getYear(), 1, 1))
                || !request.getEndAt().toLocalDate().equals(LocalDate.of(request.getStartAt().getYear(), 12, 31)))) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Promotion sinh nhật phải áp dụng cho toàn bộ năm đã chọn.");
        }
        if (request.getType() == PromotionType.LEAP_DAY_BIRTHDAY && request.getLeapDayPolicy() == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Promotion sinh nhật 29/02 phải cấu hình chính sách cho năm không nhuận.");
        }
        if (request.getType() != PromotionType.LEAP_DAY_BIRTHDAY && request.getLeapDayPolicy() != null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Chính sách 29/02 chỉ áp dụng cho promotion sinh nhật 29/02.");
        }
        if (isBirthdayPromotion(request.getType())
                && (request.getBirthdayMinProfileAgeDays() == null
                || request.getBirthdayMinProfileAgeDays() < 1)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Promotion sinh nhật phải cấu hình số ngày tối thiểu kể từ lần đổi ngày sinh.");
        }
        if (request.getType() == PromotionType.E_WALLET
                && request.getWalletPaymentMethod() != PaymentMethod.MOMO
                && request.getWalletPaymentMethod() != PaymentMethod.ZALOPAY) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Promotion ví điện tử chỉ hỗ trợ MOMO hoặc ZALOPAY.");
        }
    }

    private void validateUniqueBirthdayPolicy(PromotionRequest request, Long excludedPromotionId) {
        if (!isBirthdayPromotion(request.getType())) {
            return;
        }
        int applicationYear = request.getStartAt().getYear();
        LocalDateTime yearStart = LocalDateTime.of(applicationYear, 1, 1, 0, 0);
        LocalDateTime yearEndExclusive = yearStart.plusYears(1);
        if (promotionRepository.existsPolicyInYear(
                request.getType(),
                yearStart,
                yearEndExclusive,
                excludedPromotionId)) {
            String policyName = request.getType() == PromotionType.LEAP_DAY_BIRTHDAY
                    ? "sinh nhật 29/02"
                    : "sinh nhật thông thường";
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Đã tồn tại cấu hình promotion " + policyName + " cho năm " + applicationYear + ".");
        }
    }

    private boolean isBirthdayPromotion(PromotionType type) {
        return type != null && BIRTHDAY_YEARLY_BENEFIT_TYPES.contains(type);
    }

    private void validateUsageLimit(UsageLimitType type, Integer value, String fieldName) {
        if (type == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phải chọn loại giới hạn cho " + fieldName + ".");
        }
        if (type == UsageLimitType.LIMITED && value == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Phải nhập " + fieldName + " khi chọn có giới hạn.");
        }
        if (type == UsageLimitType.UNLIMITED && value != null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không được nhập " + fieldName + " khi chọn không giới hạn.");
        }
    }

    private void applyRequest(Promotion promotion, PromotionRequest request) {
        promotion.setName(request.getName().trim());
        promotion.setDescription(normalizeOptional(request.getDescription()));
        promotion.setType(request.getType());
        promotion.setDiscountType(request.getDiscountType());
        promotion.setDiscountValue(request.getDiscountValue());
        promotion.setMaxDiscountAmount(request.getMaxDiscountAmount());
        promotion.setMinOrderAmount(request.getMinOrderAmount());
        promotion.setStartAt(request.getStartAt());
        promotion.setEndAt(request.getEndAt());
        promotion.setDailyStartTime(request.getDailyStartTime());
        promotion.setDailyEndTime(request.getDailyEndTime());
        promotion.setTotalUsageLimitType(request.getTotalUsageLimitType());
        promotion.setTotalUsageLimit(request.getTotalUsageLimitType() == UsageLimitType.LIMITED
                ? request.getTotalUsageLimit()
                : null);
        promotion.setPerCustomerUsageLimitType(request.getPerCustomerUsageLimitType());
        promotion.setPerCustomerUsageLimit(request.getPerCustomerUsageLimitType() == UsageLimitType.LIMITED
                ? request.getPerCustomerUsageLimit()
                : null);

        promotion.setEligibleMemberTiers(request.getType() == PromotionType.MEMBER_TIER
                ? normalizeTiers(request.getEligibleMemberTiers())
                : new LinkedHashSet<>());
        promotion.setBirthdayRule(isBirthdayPromotion(request.getType())
                ? request.getBirthdayRule()
                : null);
        promotion.setBirthdayDaysBefore(isBirthdayPromotion(request.getType())
                && request.getBirthdayRule() == BirthdayRule.DATE_RANGE
                ? defaultZero(request.getBirthdayDaysBefore())
                : null);
        promotion.setBirthdayDaysAfter(isBirthdayPromotion(request.getType())
                && request.getBirthdayRule() == BirthdayRule.DATE_RANGE
                ? defaultZero(request.getBirthdayDaysAfter())
                : null);
        promotion.setLeapDayPolicy(request.getType() == PromotionType.LEAP_DAY_BIRTHDAY
                ? request.getLeapDayPolicy()
                : null);
        promotion.setBirthdayMinProfileAgeDays(isBirthdayPromotion(request.getType())
                ? request.getBirthdayMinProfileAgeDays()
                : null);
        promotion.setWalletPaymentMethod(request.getType() == PromotionType.E_WALLET
                ? request.getWalletPaymentMethod()
                : null);
    }

    private PromotionResponse toResponse(Promotion promotion) {
        long reserved = promotionUsageRepository.countByPromotion_PromotionIdAndStatusIn(
                promotion.getPromotionId(),
                Set.of(PromotionUsageStatus.RESERVED));
        long applied = promotionUsageRepository.countByPromotion_PromotionIdAndStatusIn(
                promotion.getPromotionId(),
                Set.of(PromotionUsageStatus.APPLIED));
        return PromotionResponse.builder()
                .promotionId(promotion.getPromotionId())
                .name(promotion.getName())
                .code(promotion.getCode())
                .description(promotion.getDescription())
                .type(promotion.getType())
                .discountType(promotion.getDiscountType())
                .discountValue(promotion.getDiscountValue())
                .maxDiscountAmount(promotion.getMaxDiscountAmount())
                .minOrderAmount(promotion.getMinOrderAmount())
                .startAt(promotion.getStartAt())
                .endAt(promotion.getEndAt())
                .dailyStartTime(promotion.getDailyStartTime())
                .dailyEndTime(promotion.getDailyEndTime())
                .status(promotion.getStatus())
                .totalUsageLimitType(promotion.getTotalUsageLimitType())
                .totalUsageLimit(promotion.getTotalUsageLimit())
                .perCustomerUsageLimitType(promotion.getPerCustomerUsageLimitType())
                .perCustomerUsageLimit(promotion.getPerCustomerUsageLimit())
                .reservedUsageCount(reserved)
                .appliedUsageCount(applied)
                .eligibleMemberTiers(new LinkedHashSet<>(promotion.getEligibleMemberTiers()))
                .birthdayRule(promotion.getBirthdayRule())
                .birthdayDaysBefore(promotion.getBirthdayDaysBefore())
                .birthdayDaysAfter(promotion.getBirthdayDaysAfter())
                .leapDayPolicy(promotion.getLeapDayPolicy())
                .birthdayMinProfileAgeDays(promotion.getBirthdayMinProfileAgeDays())
                .walletPaymentMethod(promotion.getWalletPaymentMethod())
                .createdAt(promotion.getCreatedAt())
                .updatedAt(promotion.getUpdatedAt())
                .build();
    }

    private PromotionUsageResponse toUsageResponse(PromotionUsage usage) {
        return PromotionUsageResponse.builder()
                .promotionUsageId(usage.getPromotionUsageId())
                .promotionId(usage.getPromotion().getPromotionId())
                .bookingId(usage.getBooking().getBookingId())
                .userId(usage.getUser().getUserId())
                .username(usage.getUser().getUsername())
                .promotionCode(usage.getPromotionCode())
                .promotionType(usage.getPromotionType())
                .memberTier(usage.getMemberTier())
                .birthday(usage.getBirthday())
                .birthdayCycleYear(usage.getBirthdayCycleYear())
                .paymentMethod(usage.getPaymentMethod())
                .originalAmount(usage.getOriginalAmount())
                .discountAmount(usage.getDiscountAmount())
                .finalAmount(usage.getFinalAmount())
                .status(usage.getStatus())
                .reservedAt(usage.getReservedAt())
                .paymentInitiatedAt(usage.getPaymentInitiatedAt())
                .confirmedAt(usage.getConfirmedAt())
                .releasedAt(usage.getReleasedAt())
                .releaseReason(usage.getReleaseReason())
                .build();
    }

    private User resolveValidationUser(String memberUserId) {
        User currentUser = getCurrentUser();
        if (memberUserId == null || memberUserId.isBlank()
                || memberUserId.equals(currentUser.getUserId())) {
            return currentUser;
        }
        if (!hasAuthority("BOOKING_MANAGE")) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        return userRepository.findById(memberUserId.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> authority.equals(grantedAuthority.getAuthority()));
    }

    private boolean isCustomerAccount(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(role -> "CUSTOMER".equalsIgnoreCase(role.getRoleName()));
    }

    private Promotion getPromotionEntity(Long promotionId) {
        return promotionRepository.findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeTier(String tier) {
        return tier == null ? "" : tier.trim().toUpperCase(Locale.ROOT);
    }

    private Set<String> normalizeTiers(Set<String> tiers) {
        if (tiers == null) {
            return new LinkedHashSet<>();
        }
        return tiers.stream()
                .map(this::normalizeTier)
                .filter(tier -> !tier.isBlank())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String resolveMessage(AppException exception) {
        return exception.getCustomMessage() == null
                ? exception.getErrorCode().getMessage()
                : exception.getCustomMessage();
    }

    private record PromotionEvaluation(
            PromotionEvaluationResponse response,
            String memberTier,
            LocalDate birthday,
            Integer birthdayCycleYear) {
    }

    private record BirthdayEligibility(LocalDate birthday, Integer cycleYear) {
    }

    public record PaymentPreparation(boolean valid, String message) {
        static PaymentPreparation success() {
            return new PaymentPreparation(true, null);
        }

        static PaymentPreparation failure(String message) {
            return new PaymentPreparation(false, message);
        }
    }
}
