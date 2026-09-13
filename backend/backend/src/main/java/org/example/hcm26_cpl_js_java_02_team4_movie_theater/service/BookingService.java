package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingAdminResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingPromotionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingProductDetailResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingTicketDetailResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.SeatType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeSeatStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingChannel;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CounterCustomerType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipBenefitType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.ShowtimeMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingService {

    BookingRepository bookingRepository;
    TicketRepository ticketRepository;
    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    EmailService emailService;
    ComboRepository comboRepository;
    BookingComboRepository bookingComboRepository;
    BookingFoodItemRepository bookingFoodItemRepository;
    BookingFoodStockReservationRepository bookingFoodStockReservationRepository;
    FoodVariantRepository foodVariantRepository;
    ZaloPayPaymentService zaloPayPaymentService;
    MomoPaymentService momoPaymentService;
    PromotionService promotionService;
    SeatRealtimeService seatRealtimeService;
    DashboardNotificationService dashboardNotificationService;
    TransactionTemplate transactionTemplate;
    ShowtimeMapper showtimeMapper;
    TicketPricingService ticketPricingService;
    MembershipService membershipService;
    EntityManager entityManager;
    CashierShiftService cashierShiftService;

    private static final Set<ShowtimeStatus> UNBOOKABLE_SHOWTIME_STATUSES = Set.of(
            ShowtimeStatus.CANCELLED,
            ShowtimeStatus.COMPLETED);
    private static final int EARLY_BOOKING_WINDOW_DAYS = 7;
    private static final int FOOD_STOCK_ALERT_THRESHOLD = 200;

    @NonFinal
    @Value("${booking.hold.duration-minutes:10}")
    long holdDurationMinutes;

    public BookingResponse createBooking(BookingRequest request) {
        validateRequest(request);
        PendingBookingResult pendingBooking = transactionTemplate.execute(status -> createPendingBooking(request));
        if (pendingBooking == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể tạo đặt vé.");
        }

        if (pendingBooking.response().getTotalAmount() == 0) {
            BookingResponse completed = transactionTemplate.execute(status -> {
                Booking booking = bookingRepository.findByIdForUpdate(pendingBooking.response().getBookingId())
                        .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
                if (!confirmLockedBookingPayment(booking, 0, true)) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể xác nhận booking miễn phí.");
                }
                return mapToResponse(booking);
            });
            if (completed == null) throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể hoàn tất booking miễn phí.");
            return completed;
        }

        pendingBooking.response().setPayUrl(
                zaloPayPaymentService.buildPaymentPageUrl(pendingBooking.response().getBookingId()));
        return pendingBooking.response();
    }

    public BookingResponse createPaymentForPendingBooking(Long bookingId, PaymentMethod paymentMethod) {
        if (paymentMethod != PaymentMethod.ZALOPAY && paymentMethod != PaymentMethod.MOMO) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ hỗ trợ thanh toán ZaloPay hoặc MoMo.");
        }
        PreparedPayment preparedPayment = preparePayment(bookingId, paymentMethod);
        rejectInvalidPromotionPreparation(preparedPayment);
        BookingResponse response = preparedPayment.response();
        if (paymentMethod == PaymentMethod.ZALOPAY) {
            response.setPayUrl(zaloPayPaymentService.buildPaymentPageUrl(preparedPayment.bookingId()));
        }
        return response;
    }

    @Transactional
    public BookingResponse applyPromotion(Long bookingId, BookingPromotionRequest request) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
        validatePendingBookingCanBePaid(booking);
        promotionService.reserveForBooking(booking, request.getCode(), request.getPaymentMethod());
        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponse removePromotion(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
        validatePendingBookingCanBePaid(booking);
        promotionService.removeFromPendingBooking(booking);
        return mapToResponse(booking);
    }

    public ZaloPayPaymentResponse createZaloPayPaymentForPendingBooking(Long bookingId) {
        PreparedPayment preparedPayment = preparePayment(bookingId, PaymentMethod.ZALOPAY);
        rejectInvalidPromotionPreparation(preparedPayment);
        return zaloPayPaymentService.createPaymentRequest(
                preparedPayment.bookingId(),
                preparedPayment.userId(),
                preparedPayment.orderInfo(),
                preparedPayment.amount());
    }

    public MomoPaymentResponse createMomoPaymentForPendingBooking(Long bookingId) {
        PreparedPayment preparedPayment = preparePayment(bookingId, PaymentMethod.MOMO);
        rejectInvalidPromotionPreparation(preparedPayment);
        return momoPaymentService.createPaymentRequest(
                preparedPayment.bookingId(),
                preparedPayment.orderInfo(),
                preparedPayment.amount());
    }

    private PreparedPayment preparePayment(Long bookingId, PaymentMethod paymentMethod) {
        PreparedPayment preparedPayment = transactionTemplate.execute(status -> {
            Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                    .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
            validatePendingBookingCanBePaid(booking);
            PromotionService.PaymentPreparation promotionPreparation =
                    promotionService.prepareForPayment(booking, paymentMethod);
            String userId = booking.getUser() == null ? "movie-theater" : booking.getUser().getUserId();
            return new PreparedPayment(
                    booking.getBookingId(),
                    userId,
                    "Movie ticket booking " + booking.getBookingId(),
                    booking.getTotalAmount(),
                    mapToResponse(booking),
                    promotionPreparation);
        });
        if (preparedPayment == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể chuẩn bị thanh toán.");
        }
        return preparedPayment;
    }

    private void rejectInvalidPromotionPreparation(PreparedPayment preparedPayment) {
        if (!preparedPayment.promotionPreparation().valid()) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    preparedPayment.promotionPreparation().message());
        }
    }

    @Transactional
    public BookingResponse getMyPendingBookingForShowtime(Long showtimeId) {
        if (showtimeId == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không được để trống.");
        }

        User user = getCurrentUser();
        return bookingRepository
                .findFirstByUser_UserIdAndShowtime_ShowtimeIdAndStatusOrderByCreatedAtDesc(
                        user.getUserId(),
                        showtimeId,
                        BookingStatus.PENDING)
                .map(booking -> {
                    if (!isPendingBookingStillValid(booking)) {
                        releaseSeatsAndCancel(booking);
                        return null;
                    }
                    return mapToResponse(booking);
                })
                .orElse(null);
    }

    @Transactional
    public void cancelMyPendingBooking(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
        validateBookingBelongsToCurrentUser(booking);
        if (!BookingStatus.PENDING.equals(booking.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Booking không còn chờ thanh toán.");
        }
        releaseSeatsAndCancel(booking);
    }

    @Transactional
    public int cancelMyPendingBookingsForShowtime(Long showtimeId) {
        if (showtimeId == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không được để trống.");
        }

        User user = getCurrentUser();
        List<Booking> pendingBookings =
                bookingRepository.findByUserAndShowtimeAndStatusForUpdate(
                        user.getUserId(),
                        showtimeId,
                        BookingStatus.PENDING);
        pendingBookings.forEach(this::releaseSeatsAndCancel);
        return pendingBookings.size();
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingAdminResponse> getAllBookings(
            int page,
            int size,
            BookingChannel channel,
            BookingStatus status,
            String keyword,
            LocalDate showDateFrom,
            LocalDate showDateTo,
            LocalDate createdFrom,
            LocalDate createdTo) {
        if (page < 1) page = 1;
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(page - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        validateAdminBookingFilterDates(showDateFrom, showDateTo, createdFrom, createdTo);

        String normalizedKeyword = normalizeBookingKeyword(keyword);
        LocalDateTime createdFromTime = createdFrom == null ? null : createdFrom.atStartOfDay();
        LocalDateTime createdToExclusive = createdTo == null ? null : createdTo.plusDays(1).atStartOfDay();

        Page<Booking> bookingPage = bookingRepository.findAll(
                buildAdminBookingSpecification(
                        channel,
                        status,
                        normalizedKeyword,
                        showDateFrom,
                        showDateTo,
                        createdFromTime,
                        createdToExclusive),
                pageable);
        
        List<BookingAdminResponse> responses = bookingPage.getContent().stream()
                .map(this::mapToAdminResponse)
                .toList();

        return PageResponse.<BookingAdminResponse>builder()
                .page(page)
                .totalPages(bookingPage.getTotalPages())
                .size(safeSize)
                .totalElements(bookingPage.getTotalElements())
                .content(responses)
                .build();
    }

    private Specification<Booking> buildAdminBookingSpecification(
            BookingChannel channel,
            BookingStatus status,
            String normalizedKeyword,
            LocalDate showDateFrom,
            LocalDate showDateTo,
            LocalDateTime createdFrom,
            LocalDateTime createdToExclusive) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (channel != null) {
                predicates.add(criteriaBuilder.equal(root.get("bookingChannel"), channel));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }
            if (createdFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), createdFrom));
            }
            if (createdToExclusive != null) {
                predicates.add(criteriaBuilder.lessThan(root.get("createdAt"), createdToExclusive));
            }

            Join<Booking, Showtime> showtimeJoin = null;
            if (showDateFrom != null || showDateTo != null || normalizedKeyword != null) {
                showtimeJoin = root.join("showtime");
            }
            if (showDateFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(showtimeJoin.get("showDate"), showDateFrom));
            }
            if (showDateTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(showtimeJoin.get("showDate"), showDateTo));
            }

            if (normalizedKeyword != null) {
                String keywordLike = "%" + normalizedKeyword + "%";
                Long numericKeyword = parseLongOrNull(normalizedKeyword);
                Join<Booking, User> userJoin = root.join("user");
                Join<Booking, User> sellerJoin = root.join("soldBy", JoinType.LEFT);
                Join<Showtime, Movie> movieJoin = showtimeJoin.join("movie");
                Join<Showtime, CinemaRoom> cinemaRoomJoin = showtimeJoin.join("cinemaRoom");
                List<Predicate> keywordPredicates = new ArrayList<>();

                if (numericKeyword != null) {
                    keywordPredicates.add(criteriaBuilder.equal(root.get("bookingId"), numericKeyword));
                    keywordPredicates.add(criteriaBuilder.equal(showtimeJoin.get("showtimeId"), numericKeyword));
                }
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(userJoin.get("username")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(userJoin.get("email")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(sellerJoin.get("username")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(sellerJoin.get("email")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(movieJoin.get("movieNameVn")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(movieJoin.get("movieNameEnglish")), keywordLike));
                keywordPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(cinemaRoomJoin.get("cinemaRoomName")), keywordLike));
                predicates.add(criteriaBuilder.or(keywordPredicates.toArray(Predicate[]::new)));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void validateAdminBookingFilterDates(
            LocalDate showDateFrom,
            LocalDate showDateTo,
            LocalDate createdFrom,
            LocalDate createdTo) {
        if (showDateFrom != null && showDateTo != null && showDateFrom.isAfter(showDateTo)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Ngày chiếu bắt đầu không được sau ngày chiếu kết thúc.");
        }
        if (createdFrom != null && createdTo != null && createdFrom.isAfter(createdTo)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Ngày tạo bắt đầu không được sau ngày tạo kết thúc.");
        }
    }

    private String normalizeBookingKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1).trim();
        }
        return normalized.isBlank() ? null : normalized;
    }

    private Long parseLongOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BookingAdminResponse mapToAdminResponse(Booking booking) {
        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(booking.getBookingId());
        List<BookingCombo> bookingCombos = bookingComboRepository.findByBooking_BookingId(booking.getBookingId());
        List<BookingFoodItem> bookingFoodItems = bookingFoodItemRepository.findByBooking_BookingId(booking.getBookingId());
        MoviePresentation presentation = showtimeMapper.resolveDisplayPresentation(booking.getShowtime());
        BookingChannel bookingChannel = booking.getBookingChannel() == null
                ? BookingChannel.ONLINE
                : booking.getBookingChannel();
        User seller = booking.getSoldBy();
        if (seller == null && bookingChannel == BookingChannel.COUNTER && !isCustomerAccount(booking.getUser())) {
            // Đơn tại quầy cũ lưu nhân viên trong user; dùng làm dữ liệu dự phòng khi chưa có sold_by_user_id.
            seller = booking.getUser();
        }
        CounterCustomerType counterCustomerType = booking.getCounterCustomerType();
        if (counterCustomerType == null && bookingChannel == BookingChannel.COUNTER) {
            counterCustomerType = isCustomerAccount(booking.getUser())
                    ? CounterCustomerType.ACCOUNT
                    : CounterCustomerType.GUEST;
        }

        return BookingAdminResponse.builder()
                .bookingId(booking.getBookingId())
                .username(booking.getUser().getUsername())
                .email(booking.getUser().getEmail())
                .showtimeId(booking.getShowtime().getShowtimeId())
                .movieTitle(booking.getShowtime().getMovie().getMovieNameVn())
                .cinemaRoomName(booking.getShowtime().getCinemaRoom().getCinemaRoomName())
                .presentationId(presentation == null ? null : presentation.getPresentationId())
                .presentationName(presentation == null ? null : presentation.getDisplayName())
                .presentationFormat(presentation == null ? null : presentation.getFormat())
                .projectionType(presentation == null ? null : presentation.getProjectionType())
                .languageType(presentation == null ? null : presentation.getLanguageType())
                .showDate(booking.getShowtime().getShowDate().toString())
                .startTime(booking.getShowtime().getStartTime().toString())
                .totalAmount(booking.getTotalAmount())
                .originalAmount(booking.getOriginalAmount())
                .discountAmount(booking.getDiscountAmount())
                .promotionCode(booking.getPromotionCode())
                .paymentMethod(booking.getPaymentMethod())
                .status(booking.getStatus())
                .bookingChannel(bookingChannel)
                .staffUsername(seller == null ? null : seller.getUsername())
                .staffEmail(seller == null ? null : seller.getEmail())
                .counterCustomerType(counterCustomerType)
                .createdAt(booking.getCreatedAt())
                .seatCodes(tickets.stream().map(t -> t.getShowtimeSeat().getSeat().getSeatCode()).toList())
                .combos(bookingCombos.stream().map(this::formatBookingCombo).toList())
                .foodItems(bookingFoodItems.stream().map(this::formatBookingFoodItem).toList())
                .build();
    }

    @Transactional
    public PendingBookingResult createPendingBooking(BookingRequest request) {

        User operator = getCurrentUser();
        User bookingOwner = resolveBookingOwner(request, operator);

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        validateShowtimeForBooking(showtime);
        rejectIfUserAlreadyHasPendingBooking(bookingOwner, showtime.getShowtimeId());

        List<ShowtimeSeat> selectedSeats = showtimeSeatRepository.findAllByIdForUpdate(request.getShowtimeSeatIds());

        if (selectedSeats.size() != request.getShowtimeSeatIds().size()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Một số ghế không tồn tại.");
        }
        validateSelectedSeats(showtime, selectedSeats, operator);

        int totalAmount = 0;
        int ticketSubtotal = 0;
        int pointEligibleTicketSubtotal = 0;
        int concessionSubtotal = 0;
        int membershipTicketDiscount = 0;
        int membershipConcessionDiscount = 0;
        List<Ticket> tickets = new ArrayList<>();
        Set<Long> u22SeatIds = request.getU22SeatIds() == null
                ? Set.of()
                : new HashSet<>(request.getU22SeatIds());

        boolean counterBooking = isCounterOperator();
        CashierShift cashierShift = counterBooking ? cashierShiftService.requireOpenShiftForCurrentUser() : null;
        Booking booking = Booking.builder()
                .user(bookingOwner)
                .showtime(showtime)
                .bookingChannel(counterBooking ? BookingChannel.COUNTER : BookingChannel.ONLINE)
                .soldBy(counterBooking ? operator : null)
                .cashierShift(cashierShift)
                .counterCustomerType(counterBooking
                        ? hasMemberCustomer(request) ? CounterCustomerType.ACCOUNT : CounterCustomerType.GUEST
                        : null)
                .status(BookingStatus.PENDING)
                .totalAmount(0)
                .originalAmount(0)
                .discountAmount(0)
                .paymentMethod(request.getPaymentMethod())
                .loyaltyPointsEarned(0)
                .tickets(new ArrayList<>())
                .build();

        booking = bookingRepository.save(booking);
        List<MembershipBenefit> heldBenefits = membershipService.holdBenefits(
                bookingOwner.getUserId(), booking, request.getMembershipBenefitIds());
        List<MembershipBenefit> freeTicketBenefits = heldBenefits.stream()
                .filter(item -> item.getType() == MembershipBenefitType.FREE_2D_TICKET).toList();

        for (ShowtimeSeat sSeat : selectedSeats) {
            sSeat.setStatus(ShowtimeSeatStatus.HOLDING);
            sSeat.setSelectionHeldByUserId(null);
            sSeat.setSelectionHoldToken(null);
            sSeat.setSelectionHoldExpiresAt(null);
            showtimeSeatRepository.save(sSeat);

            int normalPrice = ticketPricingService.calculateConfiguredTicketPrice(showtime, sSeat.getSeat().getType());
            int price = u22SeatIds.contains(sSeat.getShowtimeSeatId())
                    ? ticketPricingService.calculateConfiguredU22TicketPrice(showtime, sSeat.getSeat().getType())
                    : normalPrice;
            totalAmount = addBookingValue(totalAmount, price);
            ticketSubtotal = addBookingValue(ticketSubtotal, price);
            pointEligibleTicketSubtotal = addBookingValue(pointEligibleTicketSubtotal, price);

            Ticket ticket = Ticket.builder()
                    .booking(booking)
                    .showtimeSeat(sSeat)
                    .price(price)
                    .build();
            tickets.add(ticket);
        }

        booking.setTotalAmount(totalAmount);
        ticketRepository.saveAll(tickets);
        booking.setTickets(tickets);

        List<BookingCombo> bookingCombos = new ArrayList<>();
        Map<Long, StockRequirement> stockRequirements = new LinkedHashMap<>();
        if (request.getCombos() != null && !request.getCombos().isEmpty()) {
            for (org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingComboRequest cReq : request.getCombos()) {
                Combo combo = comboRepository.findById(cReq.getComboId())
                        .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Combo không tồn tại"));
                if (combo.getStatus() != ComboStatus.ACTIVE) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo đã ngừng bán: " + combo.getName());
                }
                collectComboStockRequirements(combo, cReq.getQuantity(), stockRequirements);

                BookingCombo bc = BookingCombo.builder()
                        .booking(booking)
                        .combo(combo)
                        .quantity(cReq.getQuantity())
                        .price((long) multiplyBookingValue(combo.getPrice(), cReq.getQuantity()))
                        .comboNameSnapshot(combo.getName())
                        .unitPriceSnapshot(combo.getPrice())
                        .build();
                bookingCombos.add(bc);
                totalAmount = addBookingValue(totalAmount, bc.getPrice());
                concessionSubtotal = addBookingValue(concessionSubtotal, bc.getPrice());
            }
            booking.setTotalAmount(totalAmount);
        }

        List<BookingFoodItem> bookingFoodItems = new ArrayList<>();
        if (request.getFoodItems() != null && !request.getFoodItems().isEmpty()) {
            for (org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.booking.BookingFoodItemRequest itemRequest : request.getFoodItems()) {
                FoodVariant variant = getVariantMetaForStock(itemRequest.getFoodVariantId());
                addStockRequirement(stockRequirements, variant, itemRequest.getQuantity());

                BookingFoodItem bookingFoodItem = BookingFoodItem.builder()
                        .booking(booking)
                        .foodVariant(variant)
                        .displayNameSnapshot(buildVariantDisplayName(variant))
                        .unitPriceSnapshot(variant.getPrice())
                        .quantity(itemRequest.getQuantity())
                        .price((long) multiplyBookingValue(variant.getPrice(), itemRequest.getQuantity()))
                        .build();
                bookingFoodItems.add(bookingFoodItem);
                totalAmount = addBookingValue(totalAmount, bookingFoodItem.getPrice());
                concessionSubtotal = addBookingValue(concessionSubtotal, bookingFoodItem.getPrice());
            }
        }

        if (!freeTicketBenefits.isEmpty()) {
            MoviePresentation bookingPresentation = showtimeMapper.resolveDisplayPresentation(showtime);
            MembershipBenefit unsupportedBenefit = freeTicketBenefits.stream()
                    .filter(benefit -> !supportsFreeTicket(
                            resolveFreeTicketType(benefit), bookingPresentation))
                    .findFirst().orElse(null);
            if (unsupportedBenefit != null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Quyền lợi " + freeTicketTypeLabel(resolveFreeTicketType(unsupportedBenefit))
                                + " không áp dụng cho suất chiếu này.");
            }
            List<Ticket> eligibleAdultTickets = tickets.stream()
                    .filter(ticket -> !u22SeatIds.contains(ticket.getShowtimeSeat().getShowtimeSeatId()))
                    .filter(ticket -> ticket.getShowtimeSeat().getSeat().getType() != SeatType.COUPLE)
                    .toList();
            if (freeTicketBenefits.size() > eligibleAdultTickets.size()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Vé hội viên miễn phí không áp dụng cho ghế Couple. Mỗi quyền lợi cần một ghế phù hợp.");
            }
            int waivedBasePrice = TicketPricingService.resolveBasePrice(showtime);
            for (int index = 0; index < freeTicketBenefits.size(); index++) {
                Ticket ticket = eligibleAdultTickets.get(index);
                int originalTicketPrice = ticket.getPrice();
                int discount = Math.min(ticket.getPrice(), waivedBasePrice);
                ticket.setPrice(ticket.getPrice() - discount);
                membershipTicketDiscount += discount;
                ticketSubtotal -= discount;
                // Vé dùng quyền lợi miễn phí không tích điểm, kể cả phần phụ thu ghế còn phải trả.
                pointEligibleTicketSubtotal -= originalTicketPrice;
                totalAmount -= discount;
            }
            ticketRepository.saveAll(tickets);
        }

        reserveFoodStock(booking, stockRequirements);
        if (!bookingCombos.isEmpty()) {
            bookingComboRepository.saveAll(bookingCombos);
        }
        if (!bookingFoodItems.isEmpty()) {
            bookingFoodItemRepository.saveAll(bookingFoodItems);
        }
        MembershipService.ActiveMembershipBenefits benefits =
                membershipService.getActiveBenefits(bookingOwner.getUserId());
        // Membership mới không giảm trực tiếp giá đơn. Hạng được snapshot tại đây,
        // vì giao dịch này chỉ được hưởng hạng có trước lúc bắt đầu thanh toán.

        int voucherDiscount = 0;
        booking.setMembership(benefits.membership());
        booking.setMembershipPlanCode(benefits.planCode());
        booking.setMembershipPlanName(benefits.planName());
        booking.setTicketSubtotal(ticketSubtotal);
        booking.setMembershipPointEligibleTicketSubtotal(Math.max(0, pointEligibleTicketSubtotal));
        booking.setConcessionSubtotal(concessionSubtotal);
        booking.setMembershipTicketDiscount(membershipTicketDiscount);
        booking.setMembershipConcessionDiscount(membershipConcessionDiscount);
        booking.setMembershipFreeTicketsUsed(freeTicketBenefits.size());
        booking.setVoucherDiscount(voucherDiscount);
        booking.setPointMultiplierApplied(BigDecimal.ONE);
        booking.setMembershipTicketEarnPercent(benefits.ticketEarnPercent());
        booking.setMembershipConcessionEarnPercent(benefits.concessionEarnPercent());
        // Điểm Membership chỉ dùng để đổi quà tặng nhận tại quầy, không trừ trực tiếp vào booking.
        booking.setLoyaltyPointsRedeemed(0);
        booking.setTotalAmount(Math.max(0, totalAmount));
        bookingRepository.save(booking);
        promotionService.reserveForBooking(
                booking,
                request.getVoucherCode(),
                request.getPaymentMethod());
        if (booking.getDiscountAmount() != null && booking.getDiscountAmount() > 0) {
            booking.setVoucherDiscount(booking.getDiscountAmount());
            bookingRepository.save(booking);
        }
        seatRealtimeService.publishSeatStatusChangeAfterCommit(showtime.getShowtimeId(), selectedSeats);

        if (booking.getTotalAmount() != null && booking.getTotalAmount() <= 0) {
            confirmLockedBookingPayment(booking, 0, true);
        }

        String orderInfo = "Movie ticket booking " + booking.getBookingId();
        BookingResponse response = mapToResponse(booking);
        return new PendingBookingResult(response, orderInfo, booking.getTotalAmount());
    }

    @Transactional
    public boolean confirmBookingPayment(Long bookingId, long paidAmount) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
        return confirmLockedBookingPayment(booking, paidAmount, true);
    }

    public BookingResponse confirmCounterCashPayment(Long bookingId, PaymentMethod paymentMethod) {
        if (paymentMethod != PaymentMethod.CASH && paymentMethod != PaymentMethod.BANK_TRANSFER) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Quầy chỉ có thể xác nhận tiền mặt hoặc chuyển khoản ngân hàng.");
        }
        CounterPaymentResult result = transactionTemplate.execute(status -> {
            Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                    .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
            validatePendingBookingCanBePaid(booking);
            PromotionService.PaymentPreparation promotionPreparation =
                    promotionService.prepareForPayment(booking, paymentMethod);
            if (!promotionPreparation.valid()) {
                return new CounterPaymentResult(null, promotionPreparation);
            }
            long amount = booking.getTotalAmount() == null ? 0L : booking.getTotalAmount();
            if (!confirmLockedBookingPayment(booking, amount, false)) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Không thể xác nhận thanh toán tiền mặt cho đơn này.");
            }
            return new CounterPaymentResult(mapToResponse(booking), promotionPreparation);
        });
        if (result == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED, "Không thể xác nhận thanh toán.");
        }
        if (!result.promotionPreparation().valid()) {
            throw new AppException(
                    ErrorCode.PROMOTION_NOT_APPLICABLE,
                    result.promotionPreparation().message());
        }
        return result.response();
    }

    @Transactional(readOnly = true)
    public BookingResponse getCounterBookingStatus(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));
        return mapToResponse(booking);
    }

    @Transactional
    public void cancelBookingPayment(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Booking not found"));

        if (BookingStatus.CANCELLED.equals(booking.getStatus()) || BookingStatus.SUCCESS.equals(booking.getStatus())) {
            return;
        }

        releaseSeatsAndCancel(booking);
    }

    private boolean confirmLockedBookingPayment(Booking booking, long paidAmount, boolean sendEmail) {
        Long bookingId = booking.getBookingId();
        if (BookingStatus.SUCCESS.equals(booking.getStatus())) {
            return true;
        }
        if (!BookingStatus.PENDING.equals(booking.getStatus())) {
            return false;
        }
        if (booking.getShowtime() == null
                || !isBookableShowtimeStatus(booking.getShowtime().getStatus())) {
            releaseSeatsAndCancel(booking);
            return false;
        }
        // Cho phép xác nhận ngay cả khi suất chiếu vừa bắt đầu - tránh hủy nhầm đơn hợp lệ
        // do callback gateway trả về chậm vài giây sau giờ chiếu (grace period = holdDurationMinutes * 2).
        LocalDateTime now = LocalDateTime.now();
        if (booking.getCreatedAt() != null
                && booking.getCreatedAt().plusMinutes(holdDurationMinutes * 2).isBefore(now)) {
            releaseSeatsAndCancel(booking);
            return false;
        }
        if (booking.getTotalAmount() == null || paidAmount != booking.getTotalAmount()) {
            log.warn("Payment amount mismatch for booking {}. expected={}, paid={}",
                    bookingId, booking.getTotalAmount(), paidAmount);
            releaseSeatsAndCancel(booking);
            return false;
        }

        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(bookingId);
        if (tickets.isEmpty()) {
            releaseSeatsAndCancel(booking);
            return false;
        }
        List<ShowtimeSeat> selectedSeats = tickets.stream()
                .map(Ticket::getShowtimeSeat)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (selectedSeats.size() != tickets.size() || !isSeatSelectionValid(booking.getShowtime(), selectedSeats)) {
            releaseSeatsAndCancel(booking);
            return false;
        }

        promotionService.confirmUsage(booking);
        booking.setStatus(BookingStatus.SUCCESS);
        booking.ensureTicketQrToken();
        membershipService.useHeldBenefits(booking);
        booking.setLoyaltyPointsEarned(membershipService.completeSuccessfulBooking(booking));
        bookingRepository.save(booking);

        for (Ticket ticket : tickets) {
            ShowtimeSeat sSeat = ticket.getShowtimeSeat();
            sSeat.setStatus(ShowtimeSeatStatus.BOOKED);
            showtimeSeatRepository.save(sSeat);
        }
        seatRealtimeService.publishSeatStatusChangeAfterCommit(booking.getShowtime().getShowtimeId(), selectedSeats);

        if (sendEmail) {
            List<BookingCombo> bookingCombos = bookingComboRepository.findByBooking_BookingId(bookingId);
            List<BookingFoodItem> bookingFoodItems = bookingFoodItemRepository.findByBooking_BookingId(bookingId);
            try {
                emailService.sendBookingConfirmationEmail(booking.getUser().getEmail(), booking, tickets, bookingCombos, bookingFoodItems);
            } catch (Exception e) {
                log.error("Failed to send booking confirmation email for booking {}", bookingId, e);
            }
        }
        return true;
    }

    private void releaseSeatsAndCancel(Booking booking) {
        BookingStatus previousStatus = booking.getStatus();
        if (BookingStatus.PENDING.equals(previousStatus)) {
            promotionService.releaseForBooking(booking, "Booking đã bị hủy hoặc hết thời gian giữ.");
            membershipService.releaseHeldPoints(booking);
            membershipService.releaseHeldBenefits(booking);
        }
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        if (BookingStatus.PENDING.equals(previousStatus)) {
            restoreFoodStock(booking.getBookingId());
        }
        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(booking.getBookingId());
        List<ShowtimeSeat> releasedSeats = new ArrayList<>();
        for (Ticket ticket : tickets) {
            ShowtimeSeat sSeat = ticket.getShowtimeSeat();
            if (sSeat.getStatus() == ShowtimeSeatStatus.HOLDING) {
                sSeat.setStatus(ShowtimeSeatStatus.AVAILABLE);
                showtimeSeatRepository.save(sSeat);
                releasedSeats.add(sSeat);
            }
        }
        if (!releasedSeats.isEmpty() && booking.getShowtime() != null) {
            seatRealtimeService.publishSeatStatusChangeAfterCommit(
                    booking.getShowtime().getShowtimeId(),
                    releasedSeats);
        }
    }

    @Scheduled(fixedDelayString = "${booking.hold.cleanup-delay-ms:60000}")
    public void releaseExpiredPendingBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(holdDurationMinutes);
        List<Booking> expiredBookings = bookingRepository.findByStatusAndCreatedAtBefore(BookingStatus.PENDING, cutoff);
        expiredBookings.forEach(booking -> {
            try {
                transactionTemplate.executeWithoutResult(status -> cancelBookingPayment(booking.getBookingId()));
            } catch (Exception exception) {
                log.warn("Failed to release expired booking {}", booking.getBookingId(), exception);
            }
        });
    }

    private void validateRequest(BookingRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin đặt vé không được để trống.");
        }
        if (request.getShowtimeId() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không được để trống.");
        }
        if (request.getShowtimeSeatIds() == null || request.getShowtimeSeatIds().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách ghế không được để trống.");
        }
        if (request.getShowtimeSeatIds().size() > 8) {
            throw new AppException(ErrorCode.INVALID_SEAT_QUANTITY);
        }
        if (request.getShowtimeSeatIds().stream().anyMatch(java.util.Objects::isNull)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách ghế không hợp lệ.");
        }

        Set<Long> uniqueSeatIds = new HashSet<>(request.getShowtimeSeatIds());
        if (uniqueSeatIds.size() != request.getShowtimeSeatIds().size()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách ghế bị trùng.");
        }
        Set<Long> u22SeatIds = request.getU22SeatIds() == null
                ? Set.of()
                : new HashSet<>(request.getU22SeatIds());
        if (!uniqueSeatIds.containsAll(u22SeatIds)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế áp dụng U22 không thuộc danh sách ghế đã chọn.");
        }
        if (!u22SeatIds.isEmpty() && !Boolean.TRUE.equals(request.getU22DocumentVerified())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vé U22 chưa được xác minh giấy tờ.");
        }

        if (request.getCombos() != null) {
            request.getCombos().forEach(combo -> {
                if (combo == null || combo.getComboId() == null || combo.getQuantity() == null || combo.getQuantity() < 1) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin combo không hợp lệ.");
                }
            });
        }
        if (request.getFoodItems() != null) {
            request.getFoodItems().forEach(item -> {
                if (item == null || item.getFoodVariantId() == null || item.getQuantity() == null || item.getQuantity() < 1) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin món lẻ không hợp lệ.");
                }
            });
        }
    }

    private void validateSelectedSeats(Showtime showtime, List<ShowtimeSeat> selectedSeats, User user) {
        LocalDateTime now = LocalDateTime.now();
        for (ShowtimeSeat sSeat : selectedSeats) {
            if (sSeat.getSeat() == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin ghế không hợp lệ.");
            }
            if (sSeat.getSeat().getStatus() != SeatStatus.ACTIVE) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế " + sSeat.getSeat().getSeatCode() + " hiện không khả dụng.");
            }
            if (sSeat.getShowtime() == null || !sSeat.getShowtime().getShowtimeId().equals(showtime.getShowtimeId())) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế không thuộc suất chiếu này.");
            }
            boolean heldByCurrentUser = sSeat.getStatus() == ShowtimeSeatStatus.HOLDING
                    && user.getUserId().equals(sSeat.getSelectionHeldByUserId())
                    && sSeat.getSelectionHoldExpiresAt() != null
                    && sSeat.getSelectionHoldExpiresAt().isAfter(now);
            if (sSeat.getStatus() != ShowtimeSeatStatus.AVAILABLE && !heldByCurrentUser) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Ghế " + sSeat.getSeat().getSeatCode() + " đã được khách khác giữ hoặc đã bán.");
            }
        }

        validateBookingSeatSelection(showtime, selectedSeats);
    }

    private void validateBookingSeatSelection(Showtime showtime, List<ShowtimeSeat> selectedSeats) {
        validateCoupleSeatSelection(showtime, selectedSeats);
        validateSingleSeatGapSelection(showtime, selectedSeats);
    }

    private void validateCoupleSeatSelection(Showtime showtime, List<ShowtimeSeat> selectedSeats) {
        Set<Long> selectedShowtimeSeatIds = selectedSeats.stream()
                .map(ShowtimeSeat::getShowtimeSeatId)
                .collect(Collectors.toSet());

        Map<String, List<ShowtimeSeat>> coupleSeatsByRow = showtimeSeatRepository
                .findByShowtime_ShowtimeId(showtime.getShowtimeId())
                .stream()
                .filter(sSeat -> sSeat.getSeat() != null && sSeat.getSeat().getType() == SeatType.COUPLE)
                .collect(Collectors.groupingBy(sSeat -> sSeat.getSeat().getSeatRow()));

        for (Map.Entry<String, List<ShowtimeSeat>> entry : coupleSeatsByRow.entrySet()) {
            List<ShowtimeSeat> rowCoupleSeats = new ArrayList<>(entry.getValue());
            rowCoupleSeats.sort(Comparator
                    .comparing((ShowtimeSeat sSeat) -> sSeat.getSeat().getSeatNumber())
                    .thenComparing(ShowtimeSeat::getShowtimeSeatId));

            for (int i = 0; i < rowCoupleSeats.size(); i += 2) {
                ShowtimeSeat leftSeat = rowCoupleSeats.get(i);
                ShowtimeSeat rightSeat = i + 1 < rowCoupleSeats.size() ? rowCoupleSeats.get(i + 1) : null;
                boolean leftSelected = selectedShowtimeSeatIds.contains(leftSeat.getShowtimeSeatId());
                boolean rightSelected = rightSeat != null
                        && selectedShowtimeSeatIds.contains(rightSeat.getShowtimeSeatId());

                if ((leftSelected || rightSelected) && (rightSeat == null || leftSelected != rightSelected)) {
                    throw new AppException(
                            ErrorCode.INVALID_SEAT_SELECTION,
                            "Ghế đôi " + buildCouplePairLabel(leftSeat, rightSeat)
                                    + " phải được chọn đủ 2 ghế trong cùng một cặp.");
                }
            }
        }
    }

    private void validateSingleSeatGapSelection(Showtime showtime, List<ShowtimeSeat> selectedSeats) {
        Set<Long> selectedShowtimeSeatIds = selectedSeats.stream()
                .map(ShowtimeSeat::getShowtimeSeatId)
                .collect(Collectors.toSet());
        Set<String> selectedRows = selectedSeats.stream()
                .map(sSeat -> sSeat.getSeat().getSeatRow())
                .collect(Collectors.toSet());

        Map<String, List<ShowtimeSeat>> seatsByRow = showtimeSeatRepository
                .findByShowtime_ShowtimeId(showtime.getShowtimeId())
                .stream()
                .filter(sSeat -> sSeat.getSeat() != null)
                .collect(Collectors.groupingBy(sSeat -> sSeat.getSeat().getSeatRow()));

        for (Map.Entry<String, List<ShowtimeSeat>> entry : seatsByRow.entrySet()) {
            if (!selectedRows.contains(entry.getKey())) {
                continue;
            }

            List<ShowtimeSeat> rowSeats = new ArrayList<>(entry.getValue());
            rowSeats.sort(Comparator
                    .comparing((ShowtimeSeat sSeat) -> sSeat.getSeat().getSeatNumber())
                    .thenComparing(ShowtimeSeat::getShowtimeSeatId));

            for (int i = 0; i < rowSeats.size(); i++) {
                ShowtimeSeat currentSeat = rowSeats.get(i);
                if (!isEmptyAfterSelection(currentSeat, selectedShowtimeSeatIds)) {
                    continue;
                }

                ShowtimeSeat leftSeat = i > 0 ? rowSeats.get(i - 1) : null;
                ShowtimeSeat rightSeat = i < rowSeats.size() - 1 ? rowSeats.get(i + 1) : null;
                boolean hasSelectedNeighbor =
                        (leftSeat != null && selectedShowtimeSeatIds.contains(leftSeat.getShowtimeSeatId()))
                                || (rightSeat != null && selectedShowtimeSeatIds.contains(rightSeat.getShowtimeSeatId()));

                if (!hasSelectedNeighbor) {
                    continue;
                }

                boolean leftBlocked = leftSeat == null || isBlockedAfterSelection(leftSeat, selectedShowtimeSeatIds);
                boolean rightBlocked = rightSeat == null || isBlockedAfterSelection(rightSeat, selectedShowtimeSeatIds);
                if (leftBlocked && rightBlocked) {
                    throw new AppException(
                            ErrorCode.INVALID_SEAT_SELECTION,
                            "Không được để trống lẻ ghế " + currentSeat.getSeat().getSeatCode()
                                    + ". Vui lòng chọn thêm ghế đó hoặc chọn nhóm ghế khác.");
                }
            }
        }
    }

    private boolean isBlockedAfterSelection(ShowtimeSeat seat, Set<Long> selectedShowtimeSeatIds) {
        return selectedShowtimeSeatIds.contains(seat.getShowtimeSeatId())
                || seat.getSeat() == null
                || seat.getSeat().getStatus() != SeatStatus.ACTIVE
                || seat.getStatus() == ShowtimeSeatStatus.BOOKED
                || seat.getStatus() == ShowtimeSeatStatus.HOLDING;
    }

    private boolean isEmptyAfterSelection(ShowtimeSeat seat, Set<Long> selectedShowtimeSeatIds) {
        return seat.getSeat() != null
                && seat.getSeat().getStatus() == SeatStatus.ACTIVE
                && seat.getStatus() == ShowtimeSeatStatus.AVAILABLE
                && !selectedShowtimeSeatIds.contains(seat.getShowtimeSeatId());
    }

    private boolean isSeatSelectionValid(Showtime showtime, List<ShowtimeSeat> selectedSeats) {
        try {
            validateBookingSeatSelection(showtime, selectedSeats);
            return true;
        } catch (AppException exception) {
            log.warn("Invalid seat selection for showtime {}", showtime.getShowtimeId(), exception);
            return false;
        }
    }

    private String buildCouplePairLabel(ShowtimeSeat leftSeat, ShowtimeSeat rightSeat) {
        if (rightSeat != null) {
            return leftSeat.getSeat().getSeatCode() + " - " + rightSeat.getSeat().getSeatCode();
        }
        return leftSeat.getSeat().getSeatCode()
                + " - "
                + leftSeat.getSeat().getSeatRow()
                + (leftSeat.getSeat().getSeatNumber() + 1);
    }

    private void validateShowtimeForBooking(Showtime showtime) {
        if (!isBookableShowtimeStatus(showtime.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không còn nhận đặt vé.");
        }
        if (showtime.getMovie() == null
                || showtime.getMovie().getStatus() == MovieStatus.INACTIVE
                || showtime.getMovie().getStatus() == MovieStatus.ENDED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phim không còn nhận đặt vé.");
        }
        if (showtime.getCinemaRoom() == null || showtime.getCinemaRoom().getStatus() != RoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phòng chiếu không hoạt động.");
        }
        if (showtime.getShowDate() == null || showtime.getStartTime() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không hợp lệ.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = LocalDateTime.of(showtime.getShowDate(), showtime.getStartTime());
        if (!startsAt.isAfter(now)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu đã bắt đầu hoặc đã kết thúc.");
        }
        if (now.isBefore(startsAt.minusDays(EARLY_BOOKING_WINDOW_DAYS))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Suất chiếu chỉ mở đặt vé trước giờ chiếu tối đa 7 ngày.");
        }
    }

    private boolean isBookableShowtimeStatus(ShowtimeStatus status) {
        return status == null || !UNBOOKABLE_SHOWTIME_STATUSES.contains(status);
    }

    private boolean isWithinBookingWindow(Showtime showtime, LocalDateTime now) {
        if (showtime == null || showtime.getShowDate() == null || showtime.getStartTime() == null) {
            return false;
        }
        LocalDateTime startsAt = LocalDateTime.of(showtime.getShowDate(), showtime.getStartTime());
        return startsAt.isAfter(now)
                && !now.isBefore(startsAt.minusDays(EARLY_BOOKING_WINDOW_DAYS));
    }

    private void validatePendingBookingCanBePaid(Booking booking) {
        validateBookingBelongsToCurrentUser(booking);
        if (!BookingStatus.PENDING.equals(booking.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Booking không còn chờ thanh toán.");
        }
        if (booking.getCreatedAt() == null
                || booking.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(holdDurationMinutes))) {
            releaseSeatsAndCancel(booking);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Booking đã quá hạn giữ ghế.");
        }
        if (booking.getShowtime() == null) {
            releaseSeatsAndCancel(booking);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Suất chiếu không hợp lệ.");
        }
        validateShowtimeForBooking(booking.getShowtime());

        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(booking.getBookingId());
        if (tickets.isEmpty()) {
            releaseSeatsAndCancel(booking);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Booking không có ghế.");
        }
        List<ShowtimeSeat> heldSeats = tickets.stream()
                .map(Ticket::getShowtimeSeat)
                .filter(java.util.Objects::nonNull)
                .toList();
        boolean allSeatsStillHolding = heldSeats.size() == tickets.size()
                && heldSeats.stream().allMatch(seat -> seat.getStatus() == ShowtimeSeatStatus.HOLDING);
        if (!allSeatsStillHolding) {
            releaseSeatsAndCancel(booking);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ghế giữ chỗ không còn hợp lệ.");
        }
        if (!isSeatSelectionValid(booking.getShowtime(), heldSeats)) {
            releaseSeatsAndCancel(booking);
            throw new AppException(ErrorCode.INVALID_SEAT_SELECTION, "Lựa chọn ghế không hợp lệ. Vui lòng chọn lại ghế.");
        }
    }

    private void rejectIfUserAlreadyHasPendingBooking(User user, Long showtimeId) {
        bookingRepository
                .findFirstByUser_UserIdAndShowtime_ShowtimeIdAndStatusOrderByCreatedAtDesc(
                        user.getUserId(),
                        showtimeId,
                        BookingStatus.PENDING)
                .ifPresent(booking -> {
                    if (isPendingBookingStillValid(booking)) {
                        throw new AppException(
                                ErrorCode.VALIDATION_ERROR,
                                "Bạn đang giữ ghế cho suất chiếu này. Vui lòng thanh toán tiếp hoặc hủy giữ ghế trước khi chọn ghế khác.");
                    }
                    releaseSeatsAndCancel(booking);
                });
    }

    private boolean isPendingBookingStillValid(Booking booking) {
        if (!BookingStatus.PENDING.equals(booking.getStatus())) {
            return false;
        }
        if (booking.getCreatedAt() == null
                || booking.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(holdDurationMinutes))) {
            return false;
        }

        if (booking.getShowtime() == null) {
            return false;
        }

        List<Ticket> tickets = ticketRepository.findByBooking_BookingId(booking.getBookingId());
        List<ShowtimeSeat> heldSeats = tickets.stream()
                .map(Ticket::getShowtimeSeat)
                .filter(java.util.Objects::nonNull)
                .toList();
        return !tickets.isEmpty()
                && heldSeats.size() == tickets.size()
                && heldSeats.stream().allMatch(seat -> seat.getStatus() == ShowtimeSeatStatus.HOLDING)
                && isSeatSelectionValid(booking.getShowtime(), heldSeats);
    }

    private void validateBookingBelongsToCurrentUser(Booking booking) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean canManageBooking = SecurityContextHolder.getContext()
                .getAuthentication()
                .getAuthorities()
                .stream()
                .anyMatch(authority -> "BOOKING_MANAGE".equals(authority.getAuthority()));
        if (!canManageBooking
                && (booking.getUser() == null || !booking.getUser().getUsername().equals(username))) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public List<BookingResponse> getMyBookings() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<Booking> bookings = bookingRepository.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId());
        List<Booking> bookingsNeedingQr = bookings.stream()
                .filter(booking -> BookingStatus.SUCCESS.equals(booking.getStatus()))
                .filter(Booking::ensureTicketQrToken)
                .toList();
        if (!bookingsNeedingQr.isEmpty()) {
            bookingRepository.saveAll(bookingsNeedingQr);
        }
        return bookings.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private BookingResponse mapToResponse(Booking booking) {
        List<Ticket> tickets = booking.getTickets() != null
                ? booking.getTickets()
                : ticketRepository.findByBooking_BookingId(booking.getBookingId());
        MoviePresentation presentation = showtimeMapper.resolveDisplayPresentation(booking.getShowtime());

        List<Long> showtimeSeatIds = tickets.stream()
                .map(Ticket::getShowtimeSeat)
                .filter(java.util.Objects::nonNull)
                .map(ShowtimeSeat::getShowtimeSeatId)
                .collect(Collectors.toList());

        List<String> seatCodes = booking.getTickets() != null 
                ? booking.getTickets().stream().map(t -> t.getShowtimeSeat().getSeat().getSeatCode()).collect(Collectors.toList())
                : tickets.stream().map(t -> t.getShowtimeSeat().getSeat().getSeatCode()).collect(Collectors.toList());

        List<BookingCombo> bookingCombos = bookingComboRepository.findByBooking_BookingId(booking.getBookingId());
        List<BookingFoodItem> bookingFoodItems = bookingFoodItemRepository.findByBooking_BookingId(booking.getBookingId());

        return BookingResponse.builder()
                .bookingId(booking.getBookingId())
                .showtimeId(booking.getShowtime().getShowtimeId())
                .movieTitle(booking.getShowtime().getMovie().getMovieNameVn())
                .cinemaRoomName(booking.getShowtime().getCinemaRoom().getCinemaRoomName())
                .presentationId(presentation == null ? null : presentation.getPresentationId())
                .presentationName(presentation == null ? null : presentation.getDisplayName())
                .presentationFormat(presentation == null ? null : presentation.getFormat())
                .projectionType(presentation == null ? null : presentation.getProjectionType())
                .languageType(presentation == null ? null : presentation.getLanguageType())
                .showDate(booking.getShowtime().getShowDate().toString())
                .startTime(booking.getShowtime().getStartTime().toString())
                .totalAmount(booking.getTotalAmount())
                .originalAmount(booking.getOriginalAmount())
                .discountAmount(booking.getDiscountAmount())
                .promotionCode(booking.getPromotionCode())
                .paymentMethod(booking.getPaymentMethod())
                .loyaltyPointsEarned(booking.getLoyaltyPointsEarned() == null
                        ? 0
                        : booking.getLoyaltyPointsEarned())
                .membershipPlanCode(booking.getMembershipPlanCode())
                .membershipPlanName(booking.getMembershipPlanName())
                .ticketSubtotal(booking.getTicketSubtotal())
                .concessionSubtotal(booking.getConcessionSubtotal())
                .membershipTicketDiscount(booking.getMembershipTicketDiscount())
                .membershipConcessionDiscount(booking.getMembershipConcessionDiscount())
                .membershipFreeTicketsUsed(booking.getMembershipFreeTicketsUsed())
                .voucherDiscount(booking.getVoucherDiscount())
                .pointMultiplierApplied(booking.getPointMultiplierApplied())
                .membershipTicketEarnPercent(booking.getMembershipTicketEarnPercent())
                .membershipConcessionEarnPercent(booking.getMembershipConcessionEarnPercent())
                .loyaltyPointsRedeemed(booking.getLoyaltyPointsRedeemed())
                .membershipEligibleSpend(booking.getMembershipEligibleSpend())
                .status(booking.getStatus())
                .createdAt(booking.getCreatedAt())
                .holdExpiresAt(booking.getCreatedAt() == null
                        ? null
                        : booking.getCreatedAt().plusMinutes(holdDurationMinutes))
                .showtimeSeatIds(showtimeSeatIds)
                .seatCodes(seatCodes)
                .combos(bookingCombos.stream()
                        .map(this::formatBookingCombo)
                        .collect(Collectors.toList()))
                .foodItems(bookingFoodItems.stream()
                        .map(this::formatBookingFoodItem)
                        .collect(Collectors.toList()))
                .ticketDetails(tickets.stream().map(ticket -> BookingTicketDetailResponse.builder()
                        .ticketId(ticket.getTicketId())
                        .seatCode(ticket.getShowtimeSeat().getSeat().getSeatCode())
                        .seatType(ticket.getShowtimeSeat().getSeat().getType() == null
                                ? null : ticket.getShowtimeSeat().getSeat().getType().name())
                        .price(ticket.getPrice()).build()).toList())
                .productDetails(java.util.stream.Stream.concat(
                        bookingCombos.stream().map(item -> BookingProductDetailResponse.builder()
                                .type("COMBO")
                                .name(item.getComboNameSnapshot() == null ? item.getCombo().getName() : item.getComboNameSnapshot())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPriceSnapshot())
                                .totalPrice(item.getPrice()).build()),
                        bookingFoodItems.stream().map(item -> BookingProductDetailResponse.builder()
                                .type("FOOD")
                                .name(item.getDisplayNameSnapshot())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPriceSnapshot())
                                .totalPrice(item.getPrice()).build())
                ).toList())
                .ticketQrToken(BookingStatus.SUCCESS.equals(booking.getStatus())
                        ? booking.getTicketQrToken()
                        : null)
                .payUrl(null)
                .build();
    }


    private User resolveBookingOwner(BookingRequest request, User operator) {
        if (request.getMemberUserId() == null || request.getMemberUserId().isBlank()) {
            return operator;
        }
        boolean canSellAtCounter = isCounterOperator();
        if (!canSellAtCounter) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        User member = userRepository.findById(request.getMemberUserId().trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (member.getStatus() != UserStatus.ACTIVE || !isCustomerAccount(member)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tài khoản thành viên không hợp lệ.");
        }
        return member;
    }

    private boolean isCounterOperator() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getAuthorities()
                .stream()
                .anyMatch(authority -> "BOOKING_MANAGE".equals(authority.getAuthority()));
    }

    private boolean hasMemberCustomer(BookingRequest request) {
        return request.getMemberUserId() != null && !request.getMemberUserId().isBlank();
    }

    private boolean isCustomerAccount(User user) {
        return user != null
                && user.getRoles() != null
                && user.getRoles().stream()
                        .anyMatch(role -> "CUSTOMER".equalsIgnoreCase(role.getRoleName()));
    }

    private int calculatePercentageDiscount(int subtotal, BigDecimal percent, int maximumDiscount) {
        if (subtotal <= 0 || percent == null || percent.signum() <= 0 || maximumDiscount <= 0) {
            return 0;
        }
        int calculated = BigDecimal.valueOf(subtotal)
                .multiply(percent)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .intValue();
        return Math.min(calculated, maximumDiscount);
    }

    private String formatBookingCombo(BookingCombo bookingCombo) {
        String comboName = bookingCombo.getComboNameSnapshot();
        if ((comboName == null || comboName.isBlank()) && bookingCombo.getCombo() != null) {
            comboName = bookingCombo.getCombo().getName();
        }
        if (comboName == null || comboName.isBlank()) {
            comboName = "Combo đã xóa";
        }
        return bookingCombo.getQuantity() + "x " + comboName;
    }

    private String formatBookingFoodItem(BookingFoodItem bookingFoodItem) {
        String displayName = bookingFoodItem.getDisplayNameSnapshot();
        if ((displayName == null || displayName.isBlank()) && bookingFoodItem.getFoodVariant() != null) {
            displayName = buildVariantDisplayName(bookingFoodItem.getFoodVariant());
        }
        if (displayName == null || displayName.isBlank()) {
            displayName = "Món lẻ đã xóa";
        }
        return bookingFoodItem.getQuantity() + "x " + displayName;
    }

    private String buildVariantDisplayName(FoodVariant variant) {
        List<String> parts = new ArrayList<>();
        if (variant.getFoodItem() != null && variant.getFoodItem().getName() != null) {
            parts.add(variant.getFoodItem().getName());
        }
        if (variant.getVariantName() != null && !variant.getVariantName().isBlank()
                && !"Mặc định".equalsIgnoreCase(variant.getVariantName().trim())) {
            parts.add(variant.getVariantName().trim());
        }
        if (variant.getSizeLabel() != null && !variant.getSizeLabel().isBlank()) {
            parts.add("Size " + variant.getSizeLabel().trim());
        }
        if (variant.getFlavor() != null && !variant.getFlavor().isBlank()) {
            parts.add(variant.getFlavor().trim());
        }
        return parts.isEmpty() ? "Món lẻ" : String.join(" - ", parts);
    }

    private void collectComboStockRequirements(Combo combo, Integer comboQuantity, Map<Long, StockRequirement> stockRequirements) {
        if (combo.getItems() == null || combo.getItems().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo chưa có thành phần: " + combo.getName());
        }
        int selectedComboQuantity = comboQuantity == null ? 1 : comboQuantity;
        for (ComboItem comboItem : combo.getItems()) {
            FoodVariant configuredVariant = comboItem.getFoodVariant();
            if (configuredVariant == null || configuredVariant.getFoodVariantId() == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo chưa cấu hình biến thể món lẻ: " + combo.getName());
            }
            // Dùng getVariantMetaForStock (không lấy lock) — lock thật lấy tập hợp ở reserveFoodStock.
            FoodVariant variant = getVariantMetaForStock(configuredVariant.getFoodVariantId());
            int componentQuantity = comboItem.getQuantity() == null ? 1 : comboItem.getQuantity();
            addStockRequirement(stockRequirements, variant, multiplyBookingValue(selectedComboQuantity, componentQuantity));
        }
    }

    /**
     * Lấy thông tin biến thể thức ăn để tính toán KHÔNG có khoá DB.
     * Chỉ dùng để thu thập metadata trước khi gọi reserveFoodStock.
     */
    private FoodVariant getVariantMetaForStock(Long foodVariantId) {
        FoodVariant variant = foodVariantRepository.findById(foodVariantId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ không tồn tại"));
        if (!variant.isActive() || variant.getFoodItem() == null || !variant.getFoodItem().isActive()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ đã ngừng bán: " + buildVariantDisplayName(variant));
        }
        return variant;
    }

    /**
     * @deprecated Dùng getVariantMetaForStock (không lock) rồi để reserveFoodStock
     *             tự lock tập hợp theo thứ tự sorted. Giữ lại để tương thích ngược
     *             với các nơi gọi trong restoreFoodStock (chỉ cần đọc id).
     */
    private FoodVariant getActiveVariantForStock(Long foodVariantId) {
        return getVariantMetaForStock(foodVariantId);
    }

    private void addStockRequirement(Map<Long, StockRequirement> stockRequirements, FoodVariant variant, int quantity) {
        if (quantity <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng món lẻ phải lớn hơn 0.");
        }
        Long variantId = variant.getFoodVariantId();
        StockRequirement existing = stockRequirements.get(variantId);
        if (existing == null) {
            stockRequirements.put(variantId, new StockRequirement(variant, quantity));
            return;
        }
        stockRequirements.put(variantId, new StockRequirement(existing.variant(), addBookingValue(existing.quantity(), quantity)));
    }

    private int addBookingValue(long left, long right) {
        try {
            return Math.toIntExact(Math.addExact(left, right));
        } catch (ArithmeticException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tổng tiền hoặc số lượng đặt vé vượt giới hạn cho phép.");
        }
    }

    private int multiplyBookingValue(long value, int quantity) {
        try {
            return Math.toIntExact(Math.multiplyExact(value, quantity));
        } catch (ArithmeticException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tổng tiền hoặc số lượng đặt vé vượt giới hạn cho phép.");
        }
    }

    private void reserveFoodStock(Booking booking, Map<Long, StockRequirement> stockRequirements) {
        if (stockRequirements.isEmpty()) {
            return;
        }

        // ===== CHỐNG DEADLOCK =====
        // Lấy khoá bi quan PESSIMISTIC_WRITE cho tất cả biến thể thức ăn CỰC TẬP HỢP, một lần duy nhất.
        // Khoá theo thứ tự foodVariantId ASC (được đảm bảo bởi findAllByIdsSorted) để mọi giao dịch
        // đồng thời đều lấy khoá cùng thứ tự → không bao giờ hình thành vòng chờ Deadlock.
        List<Long> sortedIds = new ArrayList<>(stockRequirements.keySet());
        java.util.Collections.sort(sortedIds);
        List<FoodVariant> lockedVariants = foodVariantRepository.findAllByIdsSorted(sortedIds);
        Map<Long, FoodVariant> lockedById = lockedVariants.stream()
                .collect(Collectors.toMap(FoodVariant::getFoodVariantId, v -> v));
        // =========================

        List<BookingFoodStockReservation> reservations = new ArrayList<>();
        // Xử lý theo thứ tự sortedIds để nhất quán với thứ tự lấy lock
        for (Long variantId : sortedIds) {
            StockRequirement requirement = stockRequirements.get(variantId);
            FoodVariant variant = lockedById.get(variantId);
            if (variant == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ không tồn tại (id=" + variantId + ")");
            }
            // Metadata đã được đọc trước khi lấy khoá; nạp lại tồn kho sau khi chờ giao dịch khác.
            entityManager.refresh(variant);
            int stock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            if (stock < requirement.quantity()) {
                notifyFoodStockReplenishmentNeeded(variant, stock, requirement.quantity());
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Món " + buildVariantDisplayName(variant) + " chỉ còn " + stock + " phần.");
            }
            int remainingStock = stock - requirement.quantity();
            variant.setStockQuantity(remainingStock);
            foodVariantRepository.save(variant);
            if (remainingStock < FOOD_STOCK_ALERT_THRESHOLD) {
                notifyFoodStockReplenishmentNeeded(variant, remainingStock, requirement.quantity());
            }
            reservations.add(BookingFoodStockReservation.builder()
                    .booking(booking)
                    .foodVariant(variant)
                    .quantity(requirement.quantity())
                    .build());
        }
        bookingFoodStockReservationRepository.saveAll(reservations);
    }

    private void notifyFoodStockReplenishmentNeeded(FoodVariant variant, int currentStock, int requestedQuantity) {
        String itemName = buildVariantDisplayName(variant);
        String description = currentStock <= 0
                ? "Khách vừa chọn " + itemName + " nhưng kho đã hết. Cần nhập kho ngay để tiếp tục bán."
                : "Sau khi khách chọn " + requestedQuantity + " phần " + itemName
                + ", tồn kho hiện còn " + currentStock + " phần, thấp hơn ngưỡng "
                + FOOD_STOCK_ALERT_THRESHOLD + ". Cần nhập kho kịp thời.";
        dashboardNotificationService.createNotification(
                "Cần nhập kho bắp nước",
                description,
                "FOOD_STOCK");
    }

    private void restoreFoodStock(Long bookingId) {
        List<BookingFoodStockReservation> reservations =
                bookingFoodStockReservationRepository.findByBooking_BookingId(bookingId);
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        for (BookingFoodStockReservation reservation : reservations) {
            if (reservation.getFoodVariant() == null || reservation.getFoodVariant().getFoodVariantId() == null) {
                continue;
            }
            quantities.merge(reservation.getFoodVariant().getFoodVariantId(),
                    reservation.getQuantity() == null ? 0 : reservation.getQuantity(), this::addBookingValue);
        }
        if (quantities.isEmpty()) {
            return;
        }
        List<Long> sortedIds = quantities.keySet().stream().sorted().toList();
        for (FoodVariant variant : foodVariantRepository.findAllByIdsSorted(sortedIds)) {
            entityManager.refresh(variant);
            int stock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            variant.setStockQuantity(addBookingValue(stock, quantities.get(variant.getFoodVariantId())));
            foodVariantRepository.save(variant);
        }
    }

    private MembershipFreeTicketType resolveFreeTicketType(MembershipBenefit benefit) {
        return benefit.getFreeTicketType() == null
                ? MembershipFreeTicketType.STANDARD_2D
                : benefit.getFreeTicketType();
    }

    private boolean supportsFreeTicket(MembershipFreeTicketType type, MoviePresentation presentation) {
        if (presentation == null) return false;
        return type.supports(presentation.getFormat(), presentation.getProjectionType());
    }

    private String freeTicketTypeLabel(MembershipFreeTicketType type) {
        return switch (type) {
            case STANDARD_2D -> "vé Standard 2D miễn phí";
            case STANDARD_3D -> "vé Standard 3D miễn phí";
            case IMAX -> "vé IMAX miễn phí";
            case FOUR_DX -> "vé 4DX miễn phí";
            case DOLBY -> "vé Dolby miễn phí";
            case ANY -> "vé xem phim miễn phí";
        };
    }

    private record StockRequirement(FoodVariant variant, int quantity) {
    }

    private record PendingBookingResult(BookingResponse response, String orderInfo, int totalAmount) {
    }

    private record PreparedPayment(
            Long bookingId,
            String userId,
            String orderInfo,
            int amount,
            BookingResponse response,
            PromotionService.PaymentPreparation promotionPreparation) {
    }

    private record CounterPaymentResult(
            BookingResponse response,
            PromotionService.PaymentPreparation promotionPreparation) {
    }
}
