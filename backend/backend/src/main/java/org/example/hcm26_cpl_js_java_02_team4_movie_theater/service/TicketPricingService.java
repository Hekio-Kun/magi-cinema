package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.TicketPriceConfig;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.TicketPriceConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketPricingService {

    public static final int DEFAULT_BASE_PRICE = 75000;
    public static final int DEFAULT_STANDARD_3D_PRICE = 95000;
    public static final int DEFAULT_IMAX_3D_PRICE = 125000;
    public static final int DEFAULT_FOUR_DX_3D_PRICE = 135000;
    public static final int DEFAULT_VIP_SEAT_SURCHARGE = 15000;
    public static final int DEFAULT_COUPLE_SEAT_SURCHARGE = 75000;
    public static final int DEFAULT_DISABLED_SEAT_SURCHARGE = 0;
    public static final int DEFAULT_U22_BASE_PRICE = 55000;

    TicketPriceConfigRepository ticketPriceConfigRepository;

    @Transactional
    public TicketPriceConfigResponse getConfig() {
        return toResponse(getOrCreateConfig());
    }

    @Transactional
    public TicketPriceConfigResponse updateConfig(TicketPriceConfigRequest request) {
        TicketPriceConfig config = getOrCreateConfig();
        config.setStandard2dPrice(request.getStandard2dPrice());
        config.setStandard3dPrice(request.getStandard3dPrice());
        config.setImax3dPrice(request.getImax3dPrice());
        config.setFourDx3dPrice(request.getFourDx3dPrice());
        config.setVipSeatSurcharge(request.getVipSeatSurcharge());
        config.setCoupleSeatSurcharge(request.getCoupleSeatSurcharge());
        config.setDisabledSeatSurcharge(request.getDisabledSeatSurcharge());
        config.setU22BasePrice(request.getU22BasePrice());
        return toResponse(ticketPriceConfigRepository.saveAndFlush(config));
    }

    @Transactional
    public int resolveConfiguredPresentationBasePrice(MoviePresentation presentation) {
        TicketPriceConfig config = getOrCreateConfig();
        if (presentation == null) {
            return config.getStandard2dPrice();
        }
        if (presentation.getFormat() == MovieFormat.IMAX) {
            return config.getImax3dPrice();
        }
        if (presentation.getFormat() == MovieFormat._4DX) {
            return config.getFourDx3dPrice();
        }
        return presentation.getProjectionType() == MovieProjectionType.THREE_D
                ? config.getStandard3dPrice()
                : config.getStandard2dPrice();
    }

    private TicketPriceConfig getOrCreateConfig() {
        return ticketPriceConfigRepository.findById(TicketPriceConfig.SINGLETON_ID)
                .orElseGet(() -> ticketPriceConfigRepository.saveAndFlush(TicketPriceConfig.builder()
                        .configId(TicketPriceConfig.SINGLETON_ID)
                        .standard2dPrice(DEFAULT_BASE_PRICE)
                        .standard3dPrice(DEFAULT_STANDARD_3D_PRICE)
                        .imax3dPrice(DEFAULT_IMAX_3D_PRICE)
                        .fourDx3dPrice(DEFAULT_FOUR_DX_3D_PRICE)
                        .vipSeatSurcharge(DEFAULT_VIP_SEAT_SURCHARGE)
                        .coupleSeatSurcharge(DEFAULT_COUPLE_SEAT_SURCHARGE)
                        .disabledSeatSurcharge(DEFAULT_DISABLED_SEAT_SURCHARGE)
                        .u22BasePrice(DEFAULT_U22_BASE_PRICE)
                        .build()));
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
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    @Transactional
    public int resolveConfiguredSeatSurcharge(SeatType seatType) {
        TicketPriceConfig config = getOrCreateConfig();
        if (seatType == null) {
            return 0;
        }
        return switch (seatType) {
            case VIP -> valueOrDefault(config.getVipSeatSurcharge(), DEFAULT_VIP_SEAT_SURCHARGE);
            case COUPLE -> valueOrDefault(config.getCoupleSeatSurcharge(), DEFAULT_COUPLE_SEAT_SURCHARGE);
            case DISABLED -> valueOrDefault(config.getDisabledSeatSurcharge(), DEFAULT_DISABLED_SEAT_SURCHARGE);
            case NORMAL -> 0;
        };
    }

    @Transactional
    public int calculateConfiguredTicketPrice(Showtime showtime, SeatType seatType) {
        return resolveBasePrice(showtime) + resolveConfiguredSeatSurcharge(seatType);
    }

    @Transactional
    public int calculateConfiguredU22TicketPrice(Showtime showtime, SeatType seatType) {
        TicketPriceConfig config = getOrCreateConfig();
        int normalPrice = resolveBasePrice(showtime) + resolveConfiguredSeatSurcharge(seatType);
        int u22Price = valueOrDefault(config.getU22BasePrice(), DEFAULT_U22_BASE_PRICE)
                + resolveConfiguredSeatSurcharge(seatType);
        return Math.min(normalPrice, u22Price);
    }

    private static int valueOrDefault(Integer value, int defaultValue) {
        return value == null || value < 0 ? defaultValue : value;
    }

    public static int resolveBasePrice(Showtime showtime) {
        Integer basePrice = showtime == null ? null : showtime.getBasePrice();
        return basePrice == null || basePrice <= 0 ? DEFAULT_BASE_PRICE : basePrice;
    }

    public static int resolveSeatSurcharge(SeatType seatType) {
        if (seatType == null) {
            return 0;
        }
        return switch (seatType) {
            case VIP -> 15000;
            case COUPLE -> 75000;
            case NORMAL, DISABLED -> 0;
        };
    }

    public static int suggestPresentationBasePrice(int standardBasePrice, MoviePresentation presentation) {
        int price = standardBasePrice > 0 ? standardBasePrice : DEFAULT_BASE_PRICE;
        if (presentation == null) {
            return price;
        }
        if (presentation.getFormat() == MovieFormat.IMAX) {
            price += 30_000;
        } else if (presentation.getFormat() == MovieFormat._4DX) {
            price += 40_000;
        }
        if (presentation.getProjectionType() == MovieProjectionType.THREE_D) {
            price += 20_000;
        }
        return price;
    }

    public static int calculateTicketPrice(Showtime showtime, SeatType seatType) {
        return resolveBasePrice(showtime) + resolveSeatSurcharge(seatType);
    }

}
