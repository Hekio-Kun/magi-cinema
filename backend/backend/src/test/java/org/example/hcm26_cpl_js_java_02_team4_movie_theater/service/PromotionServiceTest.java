package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionEvaluationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion.PromotionValidationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Booking;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MembershipPlan;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Promotion;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.PromotionUsage;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserMembership;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BirthdayRule;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 30, 10, 0);

    @Mock
    PromotionRepository promotionRepository;
    @Mock
    PromotionUsageRepository promotionUsageRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    UserProfileRepository userProfileRepository;
    @Mock
    UserMembershipRepository userMembershipRepository;
    @Mock
    MembershipPlanRepository membershipPlanRepository;
    @Mock
    BookingRepository bookingRepository;

    PromotionService promotionService;
    User customer;
    UserProfile profile;

    @BeforeEach
    void setUp() {
        promotionService = serviceAt(NOW);
        customer = customer(UserStatus.ACTIVE);
        profile = UserProfile.builder()
                .userId(customer.getUserId())
                .fullName("Customer")
                .dateOfBirth(LocalDate.of(2000, 7, 30))
                .dateOfBirthUpdatedAt(NOW.minusDays(90))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "customer",
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsPromotionAsDraftWithNormalizedCode() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setCode(" momo-july ");
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion promotion = invocation.getArgument(0);
            promotion.setPromotionId(1L);
            return promotion;
        });

        var response = promotionService.createPromotion(request);

        assertEquals("MOMO-JULY", response.getCode());
        assertEquals(PromotionStatus.DRAFT, response.getStatus());
    }

    @Test
    void createsMemberTierPromotionWithConfiguredMembershipPlan() {
        PromotionRequest request = validRequest(PromotionType.MEMBER_TIER);
        request.setEligibleMemberTiers(Set.of("member"));
        when(membershipPlanRepository.findByCodeIgnoreCase("MEMBER"))
                .thenReturn(Optional.of(MembershipPlan.builder().code("MEMBER").build()));
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion promotion = invocation.getArgument(0);
            promotion.setPromotionId(1L);
            return promotion;
        });

        var response = promotionService.createPromotion(request);

        assertEquals(Set.of("MEMBER"), response.getEligibleMemberTiers());
    }

    @Test
    void rejectsMemberTierPromotionWithUnknownMembershipPlan() {
        PromotionRequest request = validRequest(PromotionType.MEMBER_TIER);
        request.setEligibleMemberTiers(Set.of("UNKNOWN"));

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("Hạng hội viên không tồn tại: UNKNOWN.", exception.getCustomMessage());
        verify(promotionRepository, never()).save(any());
    }

    @Test
    void rejectsDuplicateCode() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        when(promotionRepository.existsByCodeIgnoreCase("PROMO01")).thenReturn(true);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.PROMOTION_CODE_EXISTED, exception.getErrorCode());
        verify(promotionRepository, never()).save(any());
    }

    @Test
    void activatesAndDeactivatesPromotion() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setStatus(PromotionStatus.DRAFT);
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));
        when(promotionRepository.save(promotion)).thenReturn(promotion);

        var activated = promotionService.activatePromotion(1L);
        var deactivated = promotionService.deactivatePromotion(1L);

        assertEquals(PromotionStatus.ACTIVE, activated.getStatus());
        assertEquals(PromotionStatus.INACTIVE, deactivated.getStatus());
        assertEquals(NOW, promotion.getDeactivatedAt());
    }

    @Test
    void rejectsInvalidTimeRange() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setEndAt(request.getStartAt());

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void rejectsPromotionAcrossCalendarYears() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setStartAt(LocalDateTime.of(2026, 12, 1, 0, 0));
        request.setEndAt(LocalDateTime.of(2027, 1, 31, 23, 59));

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals(
                "Thời gian khuyến mãi phải nằm trong cùng một năm.",
                exception.getCustomMessage());
    }

    @Test
    void rejectsBirthdayPromotionThatDoesNotCoverFullYear() {
        PromotionRequest request = annualBirthdayRequest(PromotionType.BIRTHDAY, 2026);
        request.setStartAt(LocalDateTime.of(2026, 7, 1, 0, 0));
        request.setEndAt(LocalDateTime.of(2026, 8, 31, 23, 59));

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals(
                "Promotion sinh nhật phải áp dụng cho toàn bộ năm đã chọn.",
                exception.getCustomMessage());
    }

    @Test
    void createsOneAnnualBirthdayPromotion() {
        PromotionRequest request = annualBirthdayRequest(PromotionType.BIRTHDAY, 2026);
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion promotion = invocation.getArgument(0);
            promotion.setPromotionId(1L);
            return promotion;
        });

        var response = promotionService.createPromotion(request);

        assertEquals(PromotionType.BIRTHDAY, response.getType());
        assertEquals(LocalDateTime.of(2026, 1, 1, 0, 0), response.getStartAt());
        assertEquals(LocalDateTime.of(2026, 12, 31, 23, 59), response.getEndAt());
        verify(promotionRepository).save(any(Promotion.class));
    }

    @Test
    void rejectsDuplicateBirthdayPolicyInSameYear() {
        PromotionRequest request = annualBirthdayRequest(PromotionType.BIRTHDAY, 2026);
        when(promotionRepository.existsPolicyInYear(
                eq(PromotionType.BIRTHDAY), any(LocalDateTime.class), any(LocalDateTime.class), eq(null)))
                .thenReturn(true);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals(
                "Đã tồn tại cấu hình promotion sinh nhật thông thường cho năm 2026.",
                exception.getCustomMessage());
    }

    @Test
    void excludesCurrentPromotionWhenCheckingDuplicateOnUpdate() {
        PromotionRequest request = annualBirthdayRequest(PromotionType.BIRTHDAY, 2026);
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));
        when(promotionRepository.save(promotion)).thenReturn(promotion);

        promotionService.updatePromotion(1L, request);

        verify(promotionRepository).existsPolicyInYear(
                eq(PromotionType.BIRTHDAY),
                any(LocalDateTime.class),
                any(LocalDateTime.class),
                eq(1L));
    }

    @Test
    void rejectsCrossYearUpdateBeforeLoadingPromotion() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setStartAt(LocalDateTime.of(2026, 12, 31, 0, 0));
        request.setEndAt(LocalDateTime.of(2027, 1, 1, 0, 0));

        assertThrows(AppException.class, () -> promotionService.updatePromotion(1L, request));

        verify(promotionRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void acceptsPromotionEndingOnLastDayOfSameYear() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setStartAt(LocalDateTime.of(2026, 8, 15, 0, 0));
        request.setEndAt(LocalDateTime.of(2026, 12, 31, 23, 59));
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion promotion = invocation.getArgument(0);
            promotion.setPromotionId(1L);
            return promotion;
        });

        var response = promotionService.createPromotion(request);

        assertEquals(2026, response.getStartAt().getYear());
        assertEquals(2026, response.getEndAt().getYear());
    }

    @Test
    void rejectsPercentageAboveOneHundred() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setDiscountValue(101);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
    }

    @Test
    void rejectsLimitedUsageWithoutLimitValue() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setTotalUsageLimitType(UsageLimitType.LIMITED);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals(
                "Phải nhập tổng lượt sử dụng khi chọn có giới hạn.",
                exception.getCustomMessage());
    }

    @Test
    void rejectsLimitValueForUnlimitedUsage() {
        PromotionRequest request = validRequest(PromotionType.E_WALLET);
        request.setWalletPaymentMethod(PaymentMethod.MOMO);
        request.setTotalUsageLimit(100);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.createPromotion(request));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals(
                "Không được nhập tổng lượt sử dụng khi chọn không giới hạn.",
                exception.getCustomMessage());
    }

    @Test
    void calculatesPercentageDiscountWithMaximum() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        promotion.setDiscountValue(20);
        promotion.setMaxDiscountAmount(50_000);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(400_000, PaymentMethod.MOMO));

        assertEquals(50_000, response.getDiscountAmount());
        assertEquals(350_000, response.getFinalAmount());
    }

    @Test
    void fixedDiscountNeverMakesTotalNegative() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setDiscountType(PromotionDiscountType.FIXED_AMOUNT);
        promotion.setDiscountValue(200_000);
        promotion.setWalletPaymentMethod(PaymentMethod.ZALOPAY);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(80_000, PaymentMethod.ZALOPAY));

        assertEquals(80_000, response.getDiscountAmount());
        assertEquals(0, response.getFinalAmount());
    }

    @Test
    void createsGeneralPromotionWithoutMembershipCondition() {
        PromotionRequest request = validRequest(PromotionType.GENERAL);
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(invocation -> {
            Promotion promotion = invocation.getArgument(0);
            promotion.setPromotionId(1L);
            return promotion;
        });

        var response = promotionService.createPromotion(request);

        assertEquals(PromotionType.GENERAL, response.getType());
        assertTrue(response.getEligibleMemberTiers().isEmpty());
        verify(membershipPlanRepository, never()).findByCodeIgnoreCase(any());
    }

    @Test
    void rejectsOrderWhenPromotionBudgetCannotCoverTheDiscount() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        promotion.setBudgetLimit(15_000);
        mockEligibleValidation(promotion, profile);
        when(promotionUsageRepository.sumDiscountAmount(
                1L,
                PromotionService.LIMITING_USAGE_STATUSES)).thenReturn(10_000L);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.MOMO)));

        assertEquals(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED, exception.getErrorCode());
        assertEquals(
                "Ngân sách giảm giá của chương trình không còn đủ cho đơn hàng này.",
                exception.getCustomMessage());
    }

    @Test
    void rejectsPromotionOnDisabledBookingChannel() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setOnlineEnabled(true);
        promotion.setCounterEnabled(false);
        mockValidation(promotion);
        PromotionValidationRequest request = validationRequest(100_000, PaymentMethod.MOMO);
        request.setBookingChannel(BookingChannel.COUNTER);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(request));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
        assertEquals("Promotion không áp dụng cho kênh bán vé tại quầy.", exception.getCustomMessage());
    }

    @Test
    void hidesPrivatePromotionFromPublicCatalog() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setPublicVisible(false);
        when(promotionRepository.findAll()).thenReturn(List.of(promotion));

        assertTrue(promotionService.getPromotionCatalog().isEmpty());
    }

    @Test
    void rejectsPromotionThatHasNotStarted() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setStartAt(NOW.plusHours(1));
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        mockValidation(promotion);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.MOMO)));

        assertEquals(ErrorCode.PROMOTION_NOT_STARTED, exception.getErrorCode());
    }

    @Test
    void rejectsExpiredPromotion() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setEndAt(NOW);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        mockValidation(promotion);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.MOMO)));

        assertEquals(ErrorCode.PROMOTION_EXPIRED, exception.getErrorCode());
    }

    @Test
    void rejectsPromotionOutsideDailyWindow() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setDailyStartTime(NOW.toLocalTime().plusHours(1));
        promotion.setDailyEndTime(NOW.toLocalTime().plusHours(2));
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        mockValidation(promotion);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.MOMO)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void acceptsConfiguredMemberTier() {
        Promotion promotion = activePromotion(PromotionType.MEMBER_TIER);
        promotion.setEligibleMemberTiers(Set.of("PREMIER"));
        mockValidation(promotion);
        mockActiveMembership("PREMIER");

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(10_000, response.getDiscountAmount());
    }

    @Test
    void rejectsCustomerWithoutActiveMembership() {
        Promotion promotion = activePromotion(PromotionType.MEMBER_TIER);
        promotion.setEligibleMemberTiers(Set.of("PREMIER"));
        mockValidation(promotion);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsUnauthenticatedCustomer() {
        SecurityContextHolder.clearContext();

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
    }

    @Test
    void rejectsUnconfiguredMemberTier() {
        Promotion promotion = activePromotion(PromotionType.MEMBER_TIER);
        promotion.setEligibleMemberTiers(Set.of("CLASSIC"));
        mockValidation(promotion);
        mockActiveMembership("PREMIER");

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsInactiveCustomer() {
        customer.setStatus(UserStatus.INACTIVE);
        Promotion promotion = activePromotion(PromotionType.MEMBER_TIER);
        promotion.setEligibleMemberTiers(Set.of("PREMIER"));
        mockValidation(promotion);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void acceptsExactBirthday() {
        Promotion promotion = birthdayPromotion(BirthdayRule.EXACT_DATE);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
    }

    @Test
    void acceptsBirthdayMonthForMatchingCustomerWithoutMonthlyPromotionRecord() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
    }

    @Test
    void rejectsBirthdayMonthForCustomerBornInAnotherMonth() {
        profile.setDateOfBirth(LocalDate.of(2000, 8, 30));
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsBirthdayBenefitAfterChangingBirthdayFromJulyToAugustInSameYear() {
        LocalDateTime august = LocalDateTime.of(2026, 8, 30, 10, 0);
        promotionService = serviceAt(august);
        profile.setDateOfBirth(LocalDate.of(2000, 8, 30));
        profile.setDateOfBirthUpdatedAt(august.minusDays(30));
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);
        mockUsedBirthdayBenefit(2026);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED, exception.getErrorCode());
        assertEquals(
                "Bạn đã sử dụng ưu đãi sinh nhật trong năm 2026. "
                        + "Việc thay đổi ngày sinh không làm phát sinh thêm lượt sử dụng.",
                exception.getCustomMessage());
    }

    @Test
    void rejectsBirthdayBenefitAfterChangingBirthdayAgainToDecemberInSameYear() {
        LocalDateTime december = LocalDateTime.of(2026, 12, 30, 10, 0);
        promotionService = serviceAt(december);
        profile.setDateOfBirth(LocalDate.of(2000, 12, 30));
        profile.setDateOfBirthUpdatedAt(december.minusDays(30));
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);
        mockUsedBirthdayBenefit(2026);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED, exception.getErrorCode());
    }

    @Test
    void rejectsSecondBirthdayPromotionInSameBenefitGroupAndYear() {
        Promotion secondPromotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        secondPromotion.setPromotionId(2L);
        secondPromotion.setCode("BIRTHDAY02");
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(promotionRepository.findByCodeIgnoreCase("PROMO01")).thenReturn(Optional.of(secondPromotion));
        when(userProfileRepository.findById(customer.getUserId())).thenReturn(Optional.of(profile));
        mockUsedBirthdayBenefit(2026);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED, exception.getErrorCode());
    }

    @Test
    void rejectsLeapDayPromotionAfterRegularBirthdayBenefitWasUsed() {
        LocalDateTime februaryTwentyEight = LocalDateTime.of(2025, 2, 28, 10, 0);
        promotionService = serviceAt(februaryTwentyEight);
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        profile.setDateOfBirthUpdatedAt(februaryTwentyEight.minusDays(30));
        Promotion promotion = leapDayBirthdayPromotion(
                BirthdayRule.EXACT_DATE,
                LeapDayPolicy.FEBRUARY_28,
                2025);
        mockEligibleValidation(promotion, profile);
        mockUsedBirthdayBenefit(2025);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED, exception.getErrorCode());
    }

    @Test
    void rejectsRegularBirthdayPromotionAfterLeapDayBenefitWasUsed() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);
        mockUsedBirthdayBenefit(2026);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.BIRTHDAY_BENEFIT_ALREADY_USED, exception.getErrorCode());
    }

    @Test
    void allowsBirthdayBenefitAgainForNextApplicationYear() {
        LocalDateTime nextYear = LocalDateTime.of(2027, 7, 30, 10, 0);
        promotionService = serviceAt(nextYear);
        profile.setDateOfBirthUpdatedAt(nextYear.minusDays(90));
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        promotion.setStartAt(LocalDateTime.of(2027, 1, 1, 0, 0));
        promotion.setEndAt(LocalDateTime.of(2027, 12, 31, 23, 59));
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
        verify(promotionUsageRepository)
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        eq(PromotionService.BIRTHDAY_YEARLY_BENEFIT_TYPES),
                        eq(2027),
                        eq(PromotionService.LIMITING_USAGE_STATUSES));
    }

    @Test
    void hidesBirthdayPromotionFromAvailableListAfterAnnualBenefitWasUsed() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        when(promotionRepository.findAll(any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(promotion));
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(userProfileRepository.findById(customer.getUserId())).thenReturn(Optional.of(profile));
        mockUsedBirthdayBenefit(2026);

        List<PromotionEvaluationResponse> available = promotionService.getAvailablePromotions(100_000, null);

        assertTrue(available.isEmpty());
    }

    @Test
    void releasedBirthdayUsageDoesNotOccupyAnnualBenefit() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
        assertFalse(PromotionService.LIMITING_USAGE_STATUSES.contains(PromotionUsageStatus.RELEASED));
        verify(promotionUsageRepository)
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        eq(PromotionService.BIRTHDAY_YEARLY_BENEFIT_TYPES),
                        eq(2026),
                        eq(PromotionService.LIMITING_USAGE_STATUSES));
    }

    @Test
    void nonBirthdayPromotionKeepsExistingUsagePolicy() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, PaymentMethod.MOMO));

        assertEquals(90_000, response.getFinalAmount());
        verify(promotionUsageRepository, never())
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        any(), anySet(), any(), anySet());
    }

    @Test
    void acceptsBirthdayDateRange() {
        profile.setDateOfBirth(LocalDate.of(2000, 8, 2));
        Promotion promotion = birthdayPromotion(BirthdayRule.DATE_RANGE);
        promotion.setBirthdayDaysBefore(3);
        promotion.setBirthdayDaysAfter(1);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(10_000, response.getDiscountAmount());
    }

    @Test
    void rejectsMissingBirthday() {
        profile.setDateOfBirth(null);
        Promotion promotion = birthdayPromotion(BirthdayRule.EXACT_DATE);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsRecentlyChangedBirthday() {
        profile.setDateOfBirthUpdatedAt(NOW.minusDays(1));
        Promotion promotion = birthdayPromotion(BirthdayRule.EXACT_DATE);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void appliesFebruaryTwentyEightPolicyForLeapDayBirthday() {
        LocalDateTime februaryTwentyEight = LocalDateTime.of(2025, 2, 28, 10, 0);
        promotionService = serviceAt(februaryTwentyEight);
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        profile.setDateOfBirthUpdatedAt(februaryTwentyEight.minusDays(90));
        Promotion promotion = leapDayBirthdayPromotion(BirthdayRule.EXACT_DATE, LeapDayPolicy.FEBRUARY_28, 2025);
        promotion.setLeapDayPolicy(LeapDayPolicy.FEBRUARY_28);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
    }

    @Test
    void appliesMarchFirstPolicyForLeapDayBirthday() {
        LocalDateTime marchFirst = LocalDateTime.of(2025, 3, 1, 10, 0);
        promotionService = serviceAt(marchFirst);
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        profile.setDateOfBirthUpdatedAt(marchFirst.minusDays(90));
        Promotion promotion = leapDayBirthdayPromotion(BirthdayRule.EXACT_DATE, LeapDayPolicy.MARCH_1, 2025);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
    }

    @Test
    void appliesLeapDayOnlyPolicyInLeapYear() {
        LocalDateTime leapDay = LocalDateTime.of(2028, 2, 29, 10, 0);
        promotionService = serviceAt(leapDay);
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        profile.setDateOfBirthUpdatedAt(leapDay.minusDays(90));
        Promotion promotion = leapDayBirthdayPromotion(BirthdayRule.EXACT_DATE, LeapDayPolicy.LEAP_DAY_ONLY, 2028);
        mockEligibleValidation(promotion, profile);

        PromotionEvaluationResponse response = promotionService.validatePromotion(
                validationRequest(100_000, null));

        assertEquals(90_000, response.getFinalAmount());
    }

    @Test
    void rejectsLeapDayOnlyPolicyInNonLeapYear() {
        LocalDateTime februaryTwentyEight = LocalDateTime.of(2025, 2, 28, 10, 0);
        promotionService = serviceAt(februaryTwentyEight);
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        profile.setDateOfBirthUpdatedAt(februaryTwentyEight.minusDays(90));
        Promotion promotion = leapDayBirthdayPromotion(BirthdayRule.EXACT_DATE, LeapDayPolicy.LEAP_DAY_ONLY, 2025);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsRegularBirthdayCustomerForLeapDayPromotion() {
        Promotion promotion = leapDayBirthdayPromotion(BirthdayRule.BIRTH_MONTH, LeapDayPolicy.FEBRUARY_28, 2026);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsLeapDayCustomerForRegularBirthdayPromotion() {
        profile.setDateOfBirth(LocalDate.of(2000, 2, 29));
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_NOT_APPLICABLE, exception.getErrorCode());
    }

    @Test
    void rejectsWrongWallet() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        mockEligibleValidation(promotion, profile);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.ZALOPAY)));

        assertEquals(ErrorCode.PROMOTION_PAYMENT_METHOD_INVALID, exception.getErrorCode());
    }

    @Test
    void rejectsExhaustedGlobalLimit() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        promotion.setTotalUsageLimitType(UsageLimitType.LIMITED);
        promotion.setTotalUsageLimit(1);
        mockEligibleValidation(promotion, profile);
        when(promotionUsageRepository.countByPromotion_PromotionIdAndStatusIn(
                eq(1L),
                anySet())).thenReturn(1L);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, PaymentMethod.MOMO)));

        assertEquals(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED, exception.getErrorCode());
    }

    @Test
    void rejectsExhaustedBirthdayCycleLimit() {
        Promotion promotion = birthdayPromotion(BirthdayRule.EXACT_DATE);
        mockEligibleValidation(promotion, profile);
        when(promotionUsageRepository
                .countByPromotion_PromotionIdAndUser_UserIdAndBirthdayCycleYearAndStatusIn(
                        eq(1L),
                        eq(customer.getUserId()),
                        eq(2026),
                        anySet()))
                .thenReturn(1L);

        AppException exception = assertThrows(
                AppException.class,
                () -> promotionService.validatePromotion(validationRequest(100_000, null)));

        assertEquals(ErrorCode.PROMOTION_CUSTOMER_LIMIT_REACHED, exception.getErrorCode());
    }

    @Test
    void reservesUsageAndPersistsServerCalculatedAmount() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        Booking booking = Booking.builder()
                .bookingId(9L)
                .user(customer)
                .totalAmount(100_000)
                .status(BookingStatus.PENDING)
                .build();
        when(promotionRepository.findByCodeForUpdate("PROMO01")).thenReturn(Optional.of(promotion));
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.empty());

        promotionService.reserveForBooking(booking, "promo01", PaymentMethod.MOMO);

        assertEquals(100_000, booking.getOriginalAmount());
        assertEquals(10_000, booking.getDiscountAmount());
        assertEquals(90_000, booking.getTotalAmount());
        ArgumentCaptor<PromotionUsage> usageCaptor = ArgumentCaptor.forClass(PromotionUsage.class);
        verify(promotionUsageRepository).save(usageCaptor.capture());
        assertEquals(PromotionUsageStatus.RESERVED, usageCaptor.getValue().getStatus());
    }

    @Test
    void reservesBirthdayBenefitUnderMemberLockBeforeAnnualUsageCheck() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        Booking booking = Booking.builder()
                .bookingId(9L)
                .user(customer)
                .totalAmount(100_000)
                .status(BookingStatus.PENDING)
                .build();
        when(promotionRepository.findByCodeForUpdate("PROMO01")).thenReturn(Optional.of(promotion));
        when(userProfileRepository.findByUserIdForUpdate(customer.getUserId())).thenReturn(Optional.of(profile));
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.empty());

        promotionService.reserveForBooking(booking, "PROMO01", PaymentMethod.CASH);

        InOrder lockAndReservation = org.mockito.Mockito.inOrder(
                userProfileRepository,
                promotionUsageRepository);
        lockAndReservation.verify(userProfileRepository).findByUserIdForUpdate(customer.getUserId());
        lockAndReservation.verify(promotionUsageRepository)
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        eq(PromotionService.BIRTHDAY_YEARLY_BENEFIT_TYPES),
                        eq(2026),
                        eq(PromotionService.LIMITING_USAGE_STATUSES));
        lockAndReservation.verify(promotionUsageRepository).save(any(PromotionUsage.class));
    }

    @Test
    void existingBirthdayReservationDoesNotBlockItsOwnPaymentRevalidation() {
        Promotion promotion = birthdayPromotion(BirthdayRule.BIRTH_MONTH);
        Booking booking = discountedBooking(promotion);
        PromotionUsage usage = reservedUsage(promotion, booking);
        usage.setBirthdayCycleYear(2026);
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));
        when(userProfileRepository.findByUserIdForUpdate(customer.getUserId())).thenReturn(Optional.of(profile));
        when(promotionUsageRepository
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        anySet(),
                        eq(2026),
                        anySet()))
                .thenReturn(1L);
        when(promotionUsageRepository
                .countByPromotion_PromotionIdAndUser_UserIdAndBirthdayCycleYearAndStatusIn(
                        eq(1L),
                        eq(customer.getUserId()),
                        eq(2026),
                        anySet()))
                .thenReturn(1L);

        PromotionService.PaymentPreparation result =
                promotionService.prepareForPayment(booking, PaymentMethod.CASH);

        assertTrue(result.valid());
        assertEquals(PromotionUsageStatus.RESERVED, usage.getStatus());
    }

    @Test
    void duplicateConfirmationDoesNotApplyUsageTwice() {
        Booking booking = Booking.builder().bookingId(9L).build();
        PromotionUsage usage = PromotionUsage.builder()
                .status(PromotionUsageStatus.RESERVED)
                .booking(booking)
                .build();
        when(promotionUsageRepository.findByBookingIdForUpdate(9L))
                .thenReturn(Optional.of(usage))
                .thenReturn(Optional.of(usage));

        promotionService.confirmUsage(booking);
        promotionService.confirmUsage(booking);

        assertEquals(PromotionUsageStatus.APPLIED, usage.getStatus());
        verify(promotionUsageRepository).save(usage);
    }

    @Test
    void confirmationRechecksBirthdayYearlyBenefitUnderMemberLock() {
        Booking booking = Booking.builder().bookingId(9L).build();
        PromotionUsage usage = PromotionUsage.builder()
                .status(PromotionUsageStatus.RESERVED)
                .booking(booking)
                .user(customer)
                .promotionType(PromotionType.BIRTHDAY)
                .birthdayCycleYear(2026)
                .build();
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));
        when(userProfileRepository.findByUserIdForUpdate(customer.getUserId())).thenReturn(Optional.of(profile));
        when(promotionUsageRepository
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        anySet(),
                        eq(2026),
                        anySet()))
                .thenReturn(1L);

        promotionService.confirmUsage(booking);

        InOrder confirmation = org.mockito.Mockito.inOrder(userProfileRepository, promotionUsageRepository);
        confirmation.verify(userProfileRepository).findByUserIdForUpdate(customer.getUserId());
        confirmation.verify(promotionUsageRepository)
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        eq(PromotionService.BIRTHDAY_YEARLY_BENEFIT_TYPES),
                        eq(2026),
                        eq(PromotionService.LIMITING_USAGE_STATUSES));
        confirmation.verify(promotionUsageRepository).save(usage);
        assertEquals(PromotionUsageStatus.APPLIED, usage.getStatus());
    }

    @Test
    void releasesUninitiatedUsageWhenPaymentRevalidatesAfterDeactivation() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setStatus(PromotionStatus.INACTIVE);
        promotion.setDeactivatedAt(NOW.minusMinutes(1));
        Booking booking = Booking.builder()
                .bookingId(9L)
                .status(BookingStatus.PENDING)
                .totalAmount(90_000)
                .originalAmount(100_000)
                .discountAmount(10_000)
                .promotion(promotion)
                .promotionCode(promotion.getCode())
                .build();
        PromotionUsage usage = PromotionUsage.builder()
                .promotion(promotion)
                .booking(booking)
                .user(customer)
                .status(PromotionUsageStatus.RESERVED)
                .originalAmount(100_000)
                .reservedAt(NOW.minusMinutes(5))
                .build();
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));

        PromotionService.PaymentPreparation preparation =
                promotionService.prepareForPayment(booking, PaymentMethod.MOMO);

        assertFalse(preparation.valid());
        assertEquals(PromotionUsageStatus.RELEASED, usage.getStatus());
        assertEquals(100_000, booking.getTotalAmount());
        assertEquals(0, booking.getDiscountAmount());
    }

    @Test
    void releasesReservationWhenWalletChangesBeforePayment() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setWalletPaymentMethod(PaymentMethod.MOMO);
        Booking booking = discountedBooking(promotion);
        PromotionUsage usage = reservedUsage(promotion, booking);
        usage.setPaymentMethod(PaymentMethod.MOMO);
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));

        PromotionService.PaymentPreparation preparation =
                promotionService.prepareForPayment(booking, PaymentMethod.ZALOPAY);

        assertFalse(preparation.valid());
        assertEquals(PromotionUsageStatus.RELEASED, usage.getStatus());
        assertEquals(100_000, booking.getTotalAmount());
    }

    @Test
    void releasesReservationWhenMemberTierChangesBeforePayment() {
        Promotion promotion = activePromotion(PromotionType.MEMBER_TIER);
        promotion.setEligibleMemberTiers(Set.of("PREMIER"));
        Booking booking = discountedBooking(promotion);
        PromotionUsage usage = reservedUsage(promotion, booking);
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));
        when(promotionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(promotion));
        mockActiveMembership("CLASSIC");

        PromotionService.PaymentPreparation preparation =
                promotionService.prepareForPayment(booking, PaymentMethod.CASH);

        assertFalse(preparation.valid());
        assertEquals(PromotionUsageStatus.RELEASED, usage.getStatus());
    }

    @Test
    void releasesReservationWhenPendingBookingIsCancelled() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        Booking booking = discountedBooking(promotion);
        PromotionUsage usage = reservedUsage(promotion, booking);
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));

        promotionService.releaseForBooking(booking, "Đơn hàng bị hủy.");

        assertEquals(PromotionUsageStatus.RELEASED, usage.getStatus());
        assertEquals("Đơn hàng bị hủy.", usage.getReleaseReason());
        assertEquals(100_000, booking.getTotalAmount());
    }

    @Test
    void keepsInitiatedPaymentReservationWhenPromotionIsDeactivated() {
        Promotion promotion = activePromotion(PromotionType.E_WALLET);
        promotion.setStatus(PromotionStatus.INACTIVE);
        promotion.setDeactivatedAt(NOW.minusMinutes(1));
        Booking booking = discountedBooking(promotion);
        PromotionUsage usage = reservedUsage(promotion, booking);
        usage.setPaymentMethod(PaymentMethod.MOMO);
        usage.setPaymentInitiatedAt(NOW.minusMinutes(2));
        when(promotionUsageRepository.findByBookingIdForUpdate(9L)).thenReturn(Optional.of(usage));

        PromotionService.PaymentPreparation preparation =
                promotionService.prepareForPayment(booking, PaymentMethod.MOMO);

        assertTrue(preparation.valid());
        assertEquals(PromotionUsageStatus.RESERVED, usage.getStatus());
        verify(promotionRepository, never()).findByIdForUpdate(anyLong());
    }

    private PromotionService serviceAt(LocalDateTime time) {
        Clock clock = Clock.fixed(time.atZone(ZONE).toInstant(), ZONE);
        return new PromotionService(
                promotionRepository,
                promotionUsageRepository,
                userRepository,
                userProfileRepository,
                userMembershipRepository,
                membershipPlanRepository,
                bookingRepository,
                clock);
    }

    private PromotionRequest validRequest(PromotionType type) {
        PromotionRequest request = PromotionRequest.builder()
                .name("Promotion")
                .code("PROMO01")
                .type(type)
                .discountType(PromotionDiscountType.PERCENTAGE)
                .discountValue(10)
                .startAt(NOW.minusDays(1))
                .endAt(NOW.plusDays(1))
                .totalUsageLimitType(UsageLimitType.UNLIMITED)
                .perCustomerUsageLimitType(UsageLimitType.UNLIMITED)
                .build();
        if (type == PromotionType.E_WALLET) {
            request.setApplicableChannels(Set.of(BookingChannel.ONLINE));
        }
        return request;
    }

    private Promotion activePromotion(PromotionType type) {
        return Promotion.builder()
                .promotionId(1L)
                .name("Promotion")
                .code("PROMO01")
                .type(type)
                .discountType(PromotionDiscountType.PERCENTAGE)
                .discountValue(10)
                .startAt(NOW.minusDays(1))
                .endAt(NOW.plusDays(1))
                .status(PromotionStatus.ACTIVE)
                .eligibleMemberTiers(Set.of())
                .build();
    }

    private Promotion birthdayPromotion(BirthdayRule rule) {
        Promotion promotion = activePromotion(PromotionType.BIRTHDAY);
        promotion.setStartAt(LocalDateTime.of(NOW.getYear(), 1, 1, 0, 0));
        promotion.setEndAt(LocalDateTime.of(NOW.getYear(), 12, 31, 23, 59));
        promotion.setBirthdayRule(rule);
        promotion.setBirthdayMinProfileAgeDays(30);
        promotion.setPerCustomerUsageLimitType(UsageLimitType.LIMITED);
        promotion.setPerCustomerUsageLimit(1);
        return promotion;
    }

    private Promotion leapDayBirthdayPromotion(BirthdayRule rule, LeapDayPolicy policy, int year) {
        Promotion promotion = activePromotion(PromotionType.LEAP_DAY_BIRTHDAY);
        promotion.setStartAt(LocalDateTime.of(year, 1, 1, 0, 0));
        promotion.setEndAt(LocalDateTime.of(year, 12, 31, 23, 59));
        promotion.setBirthdayRule(rule);
        promotion.setLeapDayPolicy(policy);
        promotion.setBirthdayMinProfileAgeDays(30);
        promotion.setPerCustomerUsageLimitType(UsageLimitType.LIMITED);
        promotion.setPerCustomerUsageLimit(1);
        return promotion;
    }

    private PromotionRequest annualBirthdayRequest(PromotionType type, int year) {
        PromotionRequest request = validRequest(type);
        request.setStartAt(LocalDateTime.of(year, 1, 1, 0, 0));
        request.setEndAt(LocalDateTime.of(year, 12, 31, 23, 59));
        request.setBirthdayRule(BirthdayRule.BIRTH_MONTH);
        request.setBirthdayMinProfileAgeDays(30);
        if (type == PromotionType.LEAP_DAY_BIRTHDAY) {
            request.setLeapDayPolicy(LeapDayPolicy.FEBRUARY_28);
        }
        return request;
    }

    private Booking discountedBooking(Promotion promotion) {
        return Booking.builder()
                .bookingId(9L)
                .user(customer)
                .status(BookingStatus.PENDING)
                .totalAmount(90_000)
                .originalAmount(100_000)
                .discountAmount(10_000)
                .promotion(promotion)
                .promotionCode(promotion.getCode())
                .build();
    }

    private PromotionUsage reservedUsage(Promotion promotion, Booking booking) {
        return PromotionUsage.builder()
                .promotion(promotion)
                .booking(booking)
                .user(customer)
                .status(PromotionUsageStatus.RESERVED)
                .originalAmount(100_000)
                .discountAmount(10_000)
                .finalAmount(90_000)
                .reservedAt(NOW.minusMinutes(5))
                .build();
    }

    private void mockValidation(Promotion promotion) {
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(promotionRepository.findByCodeIgnoreCase("PROMO01")).thenReturn(Optional.of(promotion));
    }

    private void mockEligibleValidation(Promotion promotion, UserProfile userProfile) {
        mockValidation(promotion);
        if (promotion.getType() == PromotionType.BIRTHDAY
                || promotion.getType() == PromotionType.LEAP_DAY_BIRTHDAY) {
            when(userProfileRepository.findById(customer.getUserId())).thenReturn(Optional.of(userProfile));
        }
    }

    private void mockActiveMembership(String planCode) {
        MembershipPlan plan = MembershipPlan.builder().code(planCode).build();
        UserMembership membership = UserMembership.builder()
                .user(customer)
                .plan(plan)
                .status(MembershipStatus.ACTIVE)
                .build();
        when(userMembershipRepository.findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(
                customer.getUserId(), MembershipStatus.ACTIVE))
                .thenReturn(Optional.of(membership));
    }

    private void mockUsedBirthdayBenefit(int applicationYear) {
        when(promotionUsageRepository
                .countByUser_UserIdAndPromotionTypeInAndBirthdayCycleYearAndStatusIn(
                        eq(customer.getUserId()),
                        eq(PromotionService.BIRTHDAY_YEARLY_BENEFIT_TYPES),
                        eq(applicationYear),
                        eq(PromotionService.LIMITING_USAGE_STATUSES)))
                .thenReturn(1L);
    }

    private PromotionValidationRequest validationRequest(int amount, PaymentMethod paymentMethod) {
        return PromotionValidationRequest.builder()
                .code("PROMO01")
                .orderAmount(amount)
                .paymentMethod(paymentMethod)
                .build();
    }

    private User customer(UserStatus status) {
        Role role = Role.builder().roleName("CUSTOMER").build();
        return User.builder()
                .userId("user-1")
                .username("customer")
                .email("customer@example.com")
                .status(status)
                .roles(Set.of(role))
                .build();
    }
}
