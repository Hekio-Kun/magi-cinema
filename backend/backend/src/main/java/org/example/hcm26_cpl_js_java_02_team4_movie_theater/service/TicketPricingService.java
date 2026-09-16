package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.TicketPriceConfig;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.TicketPriceConfigHistory;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketPriceConfigHistoryRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketPriceConfigRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketPricingService {

    public static final int DEFAULT_BASE_PRICE = 75_000;
    public static final int DEFAULT_STANDARD_3D_PRICE = 95_000;
    public static final int DEFAULT_IMAX_3D_PRICE = 125_000;
    public static final int DEFAULT_FOUR_DX_3D_PRICE = 135_000;
    public static final int DEFAULT_VIP_SEAT_SURCHARGE = 15_000;
    public static final int DEFAULT_COUPLE_SEAT_SURCHARGE = 75_000;
    public static final int DEFAULT_DISABLED_SEAT_SURCHARGE = 0;
    public static final int DEFAULT_U22_BASE_PRICE = 55_000;
    public static final int DEFAULT_WEEKEND_SURCHARGE = 10_000;
    public static final int DEFAULT_EARLY_BIRD_DISCOUNT = 10_000;
    public static final int DEFAULT_PRIME_TIME_SURCHARGE = 10_000;
    public static final int DEFAULT_LATE_SHOW_SURCHARGE = 5_000;
    public static final int DEFAULT_ROUNDING_UNIT = 1_000;
    private static final Set<Integer> ALLOWED_ROUNDING_UNITS = Set.of(100, 500, 1_000, 5_000);

    TicketPriceConfigRepository ticketPriceConfigRepository;
    TicketPriceConfigHistoryRepository historyRepository;
    ObjectMapper objectMapper;

    @Transactional
    public TicketPriceConfigResponse getConfig() {
        return toResponse(getOrCreateConfig());
    }

    @Transactional
    public TicketPriceConfigResponse getPublicConfig() {
        TicketPriceConfigResponse response = toResponse(getOrCreateConfig());
        response.setUpdatedBy(null);
        response.setVersion(null);
        return response;
    }

    @Transactional
    public TicketPriceConfigResponse updateConfig(TicketPriceConfigRequest request) {
        validateRequest(request);
        TicketPriceConfig config = getOrCreateConfig();
        if (request.getVersion() != null && !Objects.equals(request.getVersion(), config.getVersion())) {
            throw validation("Bảng giá đã được tài khoản khác cập nhật. Hãy tải lại dữ liệu trước khi lưu.");
        }
        applyRequest(config, request);
        config.setUpdatedBy(currentUsername());
        TicketPriceConfig saved = ticketPriceConfigRepository.saveAndFlush(config);
        saveHistory(saved, normalizeReason(request.getChangeReason(), "Cập nhật bảng giá"), saved.getUpdatedBy());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TicketPriceConfigHistoryResponse> getHistory(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        return historyRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit)).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    @Transactional
    public TicketPriceConfigResponse restoreHistory(Long historyId, String reason) {
        TicketPriceConfigHistory history = historyRepository.findById(historyId)
                .orElseThrow(() -> validation("Không tìm thấy phiên bản bảng giá cần khôi phục."));
        TicketPriceConfigResponse snapshot = readSnapshot(history.getConfigSnapshot());
        TicketPriceConfig config = getOrCreateConfig();
        applySnapshot(config, snapshot);
        config.setUpdatedBy(currentUsername());
        TicketPriceConfig saved = ticketPriceConfigRepository.saveAndFlush(config);
        saveHistory(saved, normalizeReason(reason, "Khôi phục bảng giá phiên bản #" + historyId), saved.getUpdatedBy());
        return toResponse(saved);
    }

    @Transactional
    public int resolveConfiguredPresentationBasePrice(MoviePresentation presentation) {
        TicketPriceConfig config = getOrCreateConfig();
        if (presentation == null) return config.getStandard2dPrice();
        if (presentation.getFormat() == MovieFormat.IMAX) return config.getImax3dPrice();
        if (presentation.getFormat() == MovieFormat._4DX) return config.getFourDx3dPrice();
        return presentation.getProjectionType() == MovieProjectionType.THREE_D
                ? config.getStandard3dPrice()
                : config.getStandard2dPrice();
    }

    @Transactional
    public int resolveConfiguredSeatSurcharge(SeatType seatType) {
        return resolveSeatSurcharge(getOrCreateConfig(), seatType);
    }

    @Transactional
    public TicketPriceBreakdown calculatePriceBreakdown(Showtime showtime, SeatType seatType, boolean u22) {
        TicketPriceConfig config = getOrCreateConfig();
        if (u22 && !Boolean.TRUE.equals(config.getU22Enabled())) {
            throw validation("Chính sách vé U22 hiện đang tạm ngừng.");
        }

        int basePrice = resolveBasePrice(showtime);
        int effectiveBasePrice = u22 ? Math.min(basePrice, config.getU22BasePrice()) : basePrice;
        int seatSurcharge = resolveSeatSurcharge(config, seatType);
        int scheduleAdjustment = 0;
        List<String> appliedRules = new ArrayList<>();

        if (u22) appliedRules.add("Giá U22");
        if (seatSurcharge > 0) appliedRules.add("Phụ thu ghế " + seatType.name());

        if (showtime != null && showtime.getShowDate() != null) {
            DayOfWeek day = showtime.getShowDate().getDayOfWeek();
            if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
                scheduleAdjustment += config.getWeekendSurcharge();
                if (config.getWeekendSurcharge() > 0) appliedRules.add("Phụ thu cuối tuần");
            }
        }

        LocalTime startTime = showtime == null ? null : showtime.getStartTime();
        if (startTime != null) {
            if (startTime.isBefore(config.getEarlyBirdEnd())) {
                scheduleAdjustment -= config.getEarlyBirdDiscount();
                if (config.getEarlyBirdDiscount() > 0) appliedRules.add("Ưu đãi suất sớm");
            } else if (!startTime.isBefore(config.getPrimeTimeStart()) && startTime.isBefore(config.getPrimeTimeEnd())) {
                scheduleAdjustment += config.getPrimeTimeSurcharge();
                if (config.getPrimeTimeSurcharge() > 0) appliedRules.add("Phụ thu giờ cao điểm");
            } else if (!startTime.isBefore(config.getLateShowStart())) {
                scheduleAdjustment += config.getLateShowSurcharge();
                if (config.getLateShowSurcharge() > 0) appliedRules.add("Phụ thu suất muộn");
            }
        }

        int rawPrice = Math.max(1_000, effectiveBasePrice + seatSurcharge + scheduleAdjustment);
        int finalPrice = roundUp(rawPrice, config.getPriceRoundingUnit());
        return TicketPriceBreakdown.builder()
                .basePrice(effectiveBasePrice)
                .seatSurcharge(seatSurcharge)
                .scheduleAdjustment(scheduleAdjustment)
                .finalPrice(finalPrice)
                .appliedRules(List.copyOf(appliedRules))
                .build();
    }

    @Transactional
    public int calculateConfiguredTicketPrice(Showtime showtime, SeatType seatType) {
        return calculatePriceBreakdown(showtime, seatType, false).getFinalPrice();
    }

    @Transactional
    public int calculateConfiguredU22TicketPrice(Showtime showtime, SeatType seatType) {
        return calculatePriceBreakdown(showtime, seatType, true).getFinalPrice();
    }

    private TicketPriceConfig getOrCreateConfig() {
        TicketPriceConfig config = ticketPriceConfigRepository.findById(TicketPriceConfig.SINGLETON_ID).orElse(null);
        if (config != null) {
            normalizeLegacyConfig(config);
            return config;
        }
        TicketPriceConfig created = ticketPriceConfigRepository.saveAndFlush(defaultConfig());
        saveHistory(created, "Khởi tạo bảng giá", "SYSTEM");
        return created;
    }

    private TicketPriceConfig defaultConfig() {
        return TicketPriceConfig.builder()
                .configId(TicketPriceConfig.SINGLETON_ID)
                .standard2dPrice(DEFAULT_BASE_PRICE)
                .standard3dPrice(DEFAULT_STANDARD_3D_PRICE)
                .imax3dPrice(DEFAULT_IMAX_3D_PRICE)
                .fourDx3dPrice(DEFAULT_FOUR_DX_3D_PRICE)
                .vipSeatSurcharge(DEFAULT_VIP_SEAT_SURCHARGE)
                .coupleSeatSurcharge(DEFAULT_COUPLE_SEAT_SURCHARGE)
                .disabledSeatSurcharge(DEFAULT_DISABLED_SEAT_SURCHARGE)
                .u22BasePrice(DEFAULT_U22_BASE_PRICE)
                .u22Enabled(true)
                .weekendSurcharge(DEFAULT_WEEKEND_SURCHARGE)
                .earlyBirdEnd(LocalTime.of(12, 0))
                .earlyBirdDiscount(DEFAULT_EARLY_BIRD_DISCOUNT)
                .primeTimeStart(LocalTime.of(18, 0))
                .primeTimeEnd(LocalTime.of(22, 0))
                .primeTimeSurcharge(DEFAULT_PRIME_TIME_SURCHARGE)
                .lateShowStart(LocalTime.of(22, 0))
                .lateShowSurcharge(DEFAULT_LATE_SHOW_SURCHARGE)
                .priceRoundingUnit(DEFAULT_ROUNDING_UNIT)
                .updatedBy("SYSTEM")
                .build();
    }

    private void normalizeLegacyConfig(TicketPriceConfig config) {
        if (config.getU22Enabled() == null) config.setU22Enabled(true);
        if (config.getWeekendSurcharge() == null) config.setWeekendSurcharge(DEFAULT_WEEKEND_SURCHARGE);
        if (config.getEarlyBirdEnd() == null) config.setEarlyBirdEnd(LocalTime.of(12, 0));
        if (config.getEarlyBirdDiscount() == null) config.setEarlyBirdDiscount(DEFAULT_EARLY_BIRD_DISCOUNT);
        if (config.getPrimeTimeStart() == null) config.setPrimeTimeStart(LocalTime.of(18, 0));
        if (config.getPrimeTimeEnd() == null) config.setPrimeTimeEnd(LocalTime.of(22, 0));
        if (config.getPrimeTimeSurcharge() == null) config.setPrimeTimeSurcharge(DEFAULT_PRIME_TIME_SURCHARGE);
        if (config.getLateShowStart() == null) config.setLateShowStart(LocalTime.of(22, 0));
        if (config.getLateShowSurcharge() == null) config.setLateShowSurcharge(DEFAULT_LATE_SHOW_SURCHARGE);
        if (config.getPriceRoundingUnit() == null || config.getPriceRoundingUnit() <= 0) config.setPriceRoundingUnit(DEFAULT_ROUNDING_UNIT);
        if (config.getUpdatedBy() == null) config.setUpdatedBy("SYSTEM");
    }

    private void validateRequest(TicketPriceConfigRequest request) {
        if (request.getStandard3dPrice() < request.getStandard2dPrice())
            throw validation("Giá Standard 3D không được thấp hơn Standard 2D.");
        if (request.getImax3dPrice() < request.getStandard3dPrice())
            throw validation("Giá IMAX 3D không được thấp hơn Standard 3D.");
        if (request.getFourDx3dPrice() < request.getStandard3dPrice())
            throw validation("Giá 4DX 3D không được thấp hơn Standard 3D.");
        if (request.getU22BasePrice() > request.getStandard2dPrice())
            throw validation("Giá U22 không được cao hơn giá Standard 2D.");
        if (!request.getEarlyBirdEnd().isBefore(request.getPrimeTimeStart()))
            throw validation("Giờ kết thúc suất sớm phải trước giờ bắt đầu cao điểm.");
        if (!request.getPrimeTimeStart().isBefore(request.getPrimeTimeEnd()))
            throw validation("Khung giờ cao điểm không hợp lệ.");
        if (request.getLateShowStart().isBefore(request.getPrimeTimeEnd()))
            throw validation("Giờ bắt đầu suất muộn không được trước giờ kết thúc cao điểm.");
        if (!ALLOWED_ROUNDING_UNITS.contains(request.getPriceRoundingUnit()))
            throw validation("Đơn vị làm tròn chỉ hỗ trợ 100đ, 500đ, 1.000đ hoặc 5.000đ.");
    }

    private void applyRequest(TicketPriceConfig config, TicketPriceConfigRequest request) {
        config.setStandard2dPrice(request.getStandard2dPrice());
        config.setStandard3dPrice(request.getStandard3dPrice());
        config.setImax3dPrice(request.getImax3dPrice());
        config.setFourDx3dPrice(request.getFourDx3dPrice());
        config.setVipSeatSurcharge(request.getVipSeatSurcharge());
        config.setCoupleSeatSurcharge(request.getCoupleSeatSurcharge());
        config.setDisabledSeatSurcharge(request.getDisabledSeatSurcharge());
        config.setU22BasePrice(request.getU22BasePrice());
        config.setU22Enabled(request.getU22Enabled());
        config.setWeekendSurcharge(request.getWeekendSurcharge());
        config.setEarlyBirdEnd(request.getEarlyBirdEnd());
        config.setEarlyBirdDiscount(request.getEarlyBirdDiscount());
        config.setPrimeTimeStart(request.getPrimeTimeStart());
        config.setPrimeTimeEnd(request.getPrimeTimeEnd());
        config.setPrimeTimeSurcharge(request.getPrimeTimeSurcharge());
        config.setLateShowStart(request.getLateShowStart());
        config.setLateShowSurcharge(request.getLateShowSurcharge());
        config.setPriceRoundingUnit(request.getPriceRoundingUnit());
    }

    private void applySnapshot(TicketPriceConfig config, TicketPriceConfigResponse snapshot) {
        config.setStandard2dPrice(snapshot.getStandard2dPrice());
        config.setStandard3dPrice(snapshot.getStandard3dPrice());
        config.setImax3dPrice(snapshot.getImax3dPrice());
        config.setFourDx3dPrice(snapshot.getFourDx3dPrice());
        config.setVipSeatSurcharge(snapshot.getVipSeatSurcharge());
        config.setCoupleSeatSurcharge(snapshot.getCoupleSeatSurcharge());
        config.setDisabledSeatSurcharge(snapshot.getDisabledSeatSurcharge());
        config.setU22BasePrice(snapshot.getU22BasePrice());
        config.setU22Enabled(snapshot.getU22Enabled());
        config.setWeekendSurcharge(snapshot.getWeekendSurcharge());
        config.setEarlyBirdEnd(snapshot.getEarlyBirdEnd());
        config.setEarlyBirdDiscount(snapshot.getEarlyBirdDiscount());
        config.setPrimeTimeStart(snapshot.getPrimeTimeStart());
        config.setPrimeTimeEnd(snapshot.getPrimeTimeEnd());
        config.setPrimeTimeSurcharge(snapshot.getPrimeTimeSurcharge());
        config.setLateShowStart(snapshot.getLateShowStart());
        config.setLateShowSurcharge(snapshot.getLateShowSurcharge());
        config.setPriceRoundingUnit(snapshot.getPriceRoundingUnit());
    }

    private int resolveSeatSurcharge(TicketPriceConfig config, SeatType seatType) {
        if (seatType == null) return 0;
        return switch (seatType) {
            case VIP -> valueOrDefault(config.getVipSeatSurcharge(), DEFAULT_VIP_SEAT_SURCHARGE);
            case COUPLE -> valueOrDefault(config.getCoupleSeatSurcharge(), DEFAULT_COUPLE_SEAT_SURCHARGE);
            case DISABLED -> valueOrDefault(config.getDisabledSeatSurcharge(), DEFAULT_DISABLED_SEAT_SURCHARGE);
            case NORMAL -> 0;
        };
    }

    private TicketPriceConfigResponse toResponse(TicketPriceConfig config) {
        return TicketPriceConfigResponse.builder()
                .standard2dPrice(config.getStandard2dPrice())
                .standard3dPrice(config.getStandard3dPrice())
                .imax3dPrice(config.getImax3dPrice())
                .fourDx3dPrice(config.getFourDx3dPrice())
                .vipSeatSurcharge(valueOrDefault(config.getVipSeatSurcharge(), DEFAULT_VIP_SEAT_SURCHARGE))
                .coupleSeatSurcharge(valueOrDefault(config.getCoupleSeatSurcharge(), DEFAULT_COUPLE_SEAT_SURCHARGE))
                .disabledSeatSurcharge(valueOrDefault(config.getDisabledSeatSurcharge(), DEFAULT_DISABLED_SEAT_SURCHARGE))
                .u22BasePrice(valueOrDefault(config.getU22BasePrice(), DEFAULT_U22_BASE_PRICE))
                .u22Enabled(Boolean.TRUE.equals(config.getU22Enabled()))
                .weekendSurcharge(valueOrDefault(config.getWeekendSurcharge(), DEFAULT_WEEKEND_SURCHARGE))
                .earlyBirdEnd(config.getEarlyBirdEnd())
                .earlyBirdDiscount(valueOrDefault(config.getEarlyBirdDiscount(), DEFAULT_EARLY_BIRD_DISCOUNT))
                .primeTimeStart(config.getPrimeTimeStart())
                .primeTimeEnd(config.getPrimeTimeEnd())
                .primeTimeSurcharge(valueOrDefault(config.getPrimeTimeSurcharge(), DEFAULT_PRIME_TIME_SURCHARGE))
                .lateShowStart(config.getLateShowStart())
                .lateShowSurcharge(valueOrDefault(config.getLateShowSurcharge(), DEFAULT_LATE_SHOW_SURCHARGE))
                .priceRoundingUnit(valueOrDefault(config.getPriceRoundingUnit(), DEFAULT_ROUNDING_UNIT))
                .updatedBy(config.getUpdatedBy())
                .version(config.getVersion())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private void saveHistory(TicketPriceConfig config, String reason, String actor) {
        try {
            historyRepository.save(TicketPriceConfigHistory.builder()
                    .configSnapshot(objectMapper.writeValueAsString(toResponse(config)))
                    .changeReason(reason)
                    .changedBy(actor == null || actor.isBlank() ? "SYSTEM" : actor)
                    .build());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu lịch sử bảng giá.", exception);
        }
    }

    private TicketPriceConfigHistoryResponse toHistoryResponse(TicketPriceConfigHistory history) {
        return TicketPriceConfigHistoryResponse.builder()
                .historyId(history.getHistoryId())
                .changeReason(history.getChangeReason())
                .changedBy(history.getChangedBy())
                .createdAt(history.getCreatedAt())
                .config(readSnapshot(history.getConfigSnapshot()))
                .build();
    }

    private TicketPriceConfigResponse readSnapshot(String snapshot) {
        try {
            return objectMapper.readValue(snapshot, TicketPriceConfigResponse.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Lịch sử bảng giá bị lỗi định dạng.", exception);
        }
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null || !authentication.isAuthenticated() ? "SYSTEM" : authentication.getName();
    }

    private String normalizeReason(String reason, String fallback) {
        return reason == null || reason.isBlank() ? fallback : reason.trim();
    }

    private int roundUp(int value, int unit) {
        int safeUnit = unit <= 0 ? DEFAULT_ROUNDING_UNIT : unit;
        return ((value + safeUnit - 1) / safeUnit) * safeUnit;
    }

    private static int valueOrDefault(Integer value, int defaultValue) {
        return value == null || value < 0 ? defaultValue : value;
    }

    private AppException validation(String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, message);
    }

    public static int resolveBasePrice(Showtime showtime) {
        Integer basePrice = showtime == null ? null : showtime.getBasePrice();
        return basePrice == null || basePrice <= 0 ? DEFAULT_BASE_PRICE : basePrice;
    }

    public static int resolveSeatSurcharge(SeatType seatType) {
        if (seatType == null) return 0;
        return switch (seatType) {
            case VIP -> DEFAULT_VIP_SEAT_SURCHARGE;
            case COUPLE -> DEFAULT_COUPLE_SEAT_SURCHARGE;
            case NORMAL, DISABLED -> 0;
        };
    }

    public static int suggestPresentationBasePrice(int standardBasePrice, MoviePresentation presentation) {
        int price = standardBasePrice > 0 ? standardBasePrice : DEFAULT_BASE_PRICE;
        if (presentation == null) return price;
        if (presentation.getFormat() == MovieFormat.IMAX) price += 30_000;
        else if (presentation.getFormat() == MovieFormat._4DX) price += 40_000;
        if (presentation.getProjectionType() == MovieProjectionType.THREE_D) price += 20_000;
        return price;
    }

    public static int calculateTicketPrice(Showtime showtime, SeatType seatType) {
        return resolveBasePrice(showtime) + resolveSeatSurcharge(seatType);
    }
}
