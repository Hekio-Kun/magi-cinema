package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeAdminRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerAllocationSummary;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerCapacityResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerConfirmRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerIssue;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerLockedItemRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerMovieRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPresentationMode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPresentationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerPreviewResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerRecommendationItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimePlannerRecommendationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ShowtimeStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CinemaRoomRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.MovieRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ShowtimeSeatRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.MoviePresentationCompatibility;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShowtimePlannerService {

    static final int MAX_PLANNING_DAYS = 31;
    static final int MAX_TOTAL_SHOWTIMES = 500;
    static final int DEFAULT_BASE_PRICE = 75_000;

    MovieRepository movieRepository;
    CinemaRoomRepository cinemaRoomRepository;
    ShowtimeRepository showtimeRepository;
    ShowtimeSeatRepository showtimeSeatRepository;
    ShowtimeService showtimeService;
    TicketPricingService ticketPricingService;

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimePlannerCapacityResponse calculateCapacity(ShowtimePlannerCapacityRequest request) {
        if (request == null || request.getMovies() == null || request.getMovies().isEmpty()) {
            throw validation("Phải chọn ít nhất một phim để tính sức xếp.");
        }
        if (request.getMovies().stream().anyMatch(selection -> selection == null
                || selection.getMovieId() == null
                || selection.getPresentationIds() == null
                || selection.getPresentationIds().isEmpty())) {
            throw validation("Mỗi phim phải chọn ít nhất một phiên bản để tính sức xếp.");
        }

        List<ShowtimePlannerMovieRequest> movieRequests = request.getMovies().stream()
                .map(selection -> ShowtimePlannerMovieRequest.builder()
                        .movieId(selection.getMovieId())
                        .requestedShowtimes(selection.getPresentationIds().size())
                        .basePrice(DEFAULT_BASE_PRICE)
                        .presentationMode(ShowtimePlannerPresentationMode.MANUAL)
                        .presentations(selection.getPresentationIds().stream()
                                .map(presentationId -> ShowtimePlannerPresentationRequest.builder()
                                        .presentationId(presentationId)
                                        .requestedShowtimes(1)
                                        .build())
                                .toList())
                        .build())
                .toList();
        ShowtimePlannerPreviewRequest syntheticRequest = ShowtimePlannerPreviewRequest.builder()
                .fromDate(request.getFromDate())
                .toDate(request.getToDate())
                .openingTime(request.getOpeningTime())
                .latestFinishTime(request.getLatestFinishTime())
                .turnaroundMinutes(request.getTurnaroundMinutes())
                .slotIntervalMinutes(request.getSlotIntervalMinutes())
                .primeStartTime(request.getPrimeStartTime())
                .primeEndTime(request.getPrimeEndTime())
                .cinemaRoomIds(request.getCinemaRoomIds())
                .movies(movieRequests)
                .build();

        PlannerContext context = resolveContext(syntheticRequest);
        List<ShowtimePlannerCapacityItem> items = context.allocations().stream()
                .map(allocation -> ShowtimePlannerCapacityItem.builder()
                        .movieId(allocation.movie.getMovieId())
                        .movieName(movieName(allocation.movie))
                        .presentationId(allocation.presentation.getPresentationId())
                        .presentationName(allocation.presentation.getDisplayName())
                        .maximumPossible(allocation.maximumPossible)
                        .compatibleRoomCount((int) context.rooms().stream()
                                .filter(room -> supports(allocation.presentation, room))
                                .count())
                        .blockerCounts(new LinkedHashMap<>(allocation.blockers))
                        .build())
                .sorted(Comparator
                        .comparing(ShowtimePlannerCapacityItem::getMovieName)
                         .thenComparing(ShowtimePlannerCapacityItem::getPresentationName))
                 .toList();
        List<ScheduledSlot> maximumSchedule = simulateAdditionalSlots(
                context.allocations(), List.of(), context.turnaroundMinutes(), MAX_TOTAL_SHOWTIMES);
        Map<String, Integer> maximumByFormat = new LinkedHashMap<>();
        context.allocations().stream()
                .map(allocation -> allocation.presentation.getFormat().toDisplayString())
                .distinct()
                .forEach(format -> maximumByFormat.put(format, 0));
        maximumSchedule.forEach(slot -> maximumByFormat.merge(
                slot.allocation.presentation.getFormat().toDisplayString(), 1, Integer::sum));
        int planningDays = Math.toIntExact(ChronoUnit.DAYS.between(request.getFromDate(), request.getToDate()) + 1);
        return ShowtimePlannerCapacityResponse.builder()
                .totalMaximum(maximumSchedule.size())
                .planningDays(planningDays)
                .maximumByFormat(maximumByFormat)
                .items(items)
                .build();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimePlannerRecommendationResponse recommendShowtimeCounts(ShowtimePlannerCapacityRequest request) {
        ShowtimePlannerCapacityResponse capacity = calculateCapacity(request);
        // Do not include today's unfinished sessions: their occupancy would bias
        // the recommendation downward before all sales have been completed.
        LocalDate historyTo = LocalDate.now().minusDays(1);
        LocalDate historyFrom = historyTo.minusDays(55);
        Set<Long> selectedMovieIds = request.getMovies().stream()
                .map(selection -> selection.getMovieId())
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, DemandHistory> historyByMovie = new HashMap<>();

        for (Object[] row : showtimeSeatRepository.aggregatePlannerDemandByShowtime(historyFrom, historyTo)) {
            Long movieId = numberAsLong(row[0]);
            if (!selectedMovieIds.contains(movieId)) continue;
            Long presentationId = row[1] == null ? null : numberAsLong(row[1]);
            LocalDate showDate = (LocalDate) row[2];
            long seats = numberAsLong(row[4]);
            long booked = numberAsLong(row[5]);
            historyByMovie.computeIfAbsent(movieId, ignored -> new DemandHistory())
                    .add(presentationId, showDate, seats, booked);
        }

        int planningDays = capacity.getPlanningDays();
        List<RecommendationDraft> drafts = new ArrayList<>();
        for (var selection : request.getMovies()) {
            Movie movie = movieRepository.findById(selection.getMovieId())
                    .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
            DemandHistory history = historyByMovie.getOrDefault(movie.getMovieId(), new DemandHistory());
            int movieMaximum = capacity.getItems().stream()
                    .filter(item -> item.getMovieId().equals(movie.getMovieId()))
                    .mapToInt(item -> valueOr(item.getMaximumPossible(), 0))
                    .sum();
            int fallbackPerDay = fallbackShowtimesPerDay(movie, request);
            double suggestedPerDay;
            if (history.showtimeCount >= 3 && !history.activeDates.isEmpty()) {
                double showsPerActiveDay = (double) history.showtimeCount / history.activeDates.size();
                double demandFactor = Math.max(0.5, Math.min(1.6, history.occupancyRate() / 0.60));
                suggestedPerDay = Math.max(1.0, showsPerActiveDay * demandFactor);
            } else if (history.showtimeCount > 0) {
                double showsPerActiveDay = (double) history.showtimeCount / history.activeDates.size();
                suggestedPerDay = (fallbackPerDay + Math.max(1.0, showsPerActiveDay)) / 2.0;
            } else {
                suggestedPerDay = fallbackPerDay;
            }
            int rawSuggestion = Math.max(1, (int) Math.ceil(suggestedPerDay * planningDays));
            int suggested = movieMaximum > 0 ? Math.min(Math.min(rawSuggestion, movieMaximum), 100) : 0;
            drafts.add(new RecommendationDraft(movie, selection.getPresentationIds(), history, movieMaximum, suggested));
        }

        reduceToGlobalCapacity(drafts, valueOr(capacity.getTotalMaximum(), 0));
        List<ShowtimePlannerRecommendationItem> items = drafts.stream()
                .map(draft -> toRecommendationItem(draft, capacity))
                .toList();
        return ShowtimePlannerRecommendationResponse.builder()
                .planningDays(planningDays)
                .totalSuggested(items.stream().mapToInt(ShowtimePlannerRecommendationItem::getSuggestedShowtimes).sum())
                .totalMaximum(capacity.getTotalMaximum())
                .targetOccupancyRate(60d)
                .historyFrom(historyFrom)
                .historyTo(historyTo)
                .usedHistoricalData(items.stream().anyMatch(item -> item.getHistoricalShowtimeCount() > 0))
                .items(items)
                .build();
    }

    private ShowtimePlannerRecommendationItem toRecommendationItem(
            RecommendationDraft draft,
            ShowtimePlannerCapacityResponse capacity) {
        DemandHistory history = draft.history;
        Map<Long, Integer> maximumByPresentation = capacity.getItems().stream()
                .filter(item -> item.getMovieId().equals(draft.movie.getMovieId()))
                .collect(Collectors.toMap(
                        ShowtimePlannerCapacityItem::getPresentationId,
                        item -> valueOr(item.getMaximumPossible(), 0),
                        Integer::max,
                        LinkedHashMap::new));
        Map<Long, Integer> suggestedByPresentation = distributeRecommendation(
                draft.suggested,
                draft.presentationIds,
                maximumByPresentation,
                history.bookedByPresentation);
        int confidenceScore = confidenceScore(history);
        List<String> reasons = new ArrayList<>();
        if (history.showtimeCount > 0) {
            reasons.add("Dựa trên %d suất và %d vé đã bán trong 56 ngày gần nhất."
                    .formatted(history.showtimeCount, history.bookedSeats));
            reasons.add("Tỷ lệ lấp đầy trung bình %d%%; mức tham chiếu đang dùng là 60%%."
                    .formatted(Math.round(history.occupancyRate() * 100)));
        } else {
            reasons.add("Chưa có lịch sử bán vé; hệ thống dùng tín hiệu của phim và số ngày lập lịch.");
        }
        if (Boolean.TRUE.equals(draft.movie.getIsHot())) {
            reasons.add("Phim được đánh dấu Hot nên nhận mức khởi tạo cao hơn.");
        } else if (draft.movie.getRating() != null && draft.movie.getRating() >= 8) {
            reasons.add("Điểm đánh giá từ 8 trở lên làm tăng nhẹ mức đề xuất ban đầu.");
        }
        if (draft.suggested >= draft.movieMaximum && draft.movieMaximum > 0) {
            reasons.add("Đề xuất đã được giới hạn theo sức xếp hiện tại của phòng và khung giờ.");
        }
        if (draft.suggested == 0) {
            reasons.add("Không còn vị trí hợp lệ cho các phiên bản đã chọn trong phạm vi này.");
        }
        return ShowtimePlannerRecommendationItem.builder()
                .movieId(draft.movie.getMovieId())
                .movieName(movieName(draft.movie))
                .suggestedShowtimes(draft.suggested)
                .maximumPossible(draft.movieMaximum)
                .confidence(confidenceScore >= 80 ? "HIGH" : confidenceScore >= 55 ? "MEDIUM" : "LOW")
                .confidenceScore(confidenceScore)
                .historicalShowtimeCount(history.showtimeCount)
                .historicalTicketsSold(Math.toIntExact(Math.min(Integer.MAX_VALUE, history.bookedSeats)))
                .averageOccupancyRate(Math.round(history.occupancyRate() * 1000d) / 10d)
                .suggestedByPresentation(suggestedByPresentation)
                .reasons(reasons)
                .build();
    }

    private int fallbackShowtimesPerDay(Movie movie, ShowtimePlannerCapacityRequest request) {
        int result = Boolean.TRUE.equals(movie.getIsHot()) ? 3
                : movie.getRating() != null && movie.getRating() >= 8 ? 2 : 1;
        boolean opensNearPlanningWindow = movie.getFromDate() != null
                && !movie.getFromDate().isAfter(request.getToDate())
                && !movie.getFromDate().isBefore(request.getFromDate().minusDays(14));
        return Math.min(4, result + (opensNearPlanningWindow ? 1 : 0));
    }

    private void reduceToGlobalCapacity(List<RecommendationDraft> drafts, int totalMaximum) {
        int total = drafts.stream().mapToInt(draft -> draft.suggested).sum();
        while (total > totalMaximum) {
            RecommendationDraft reducible = drafts.stream()
                    .filter(draft -> draft.suggested > (draft.movieMaximum > 0 ? 1 : 0))
                    .max(Comparator.comparingInt(draft -> draft.suggested))
                    .orElse(null);
            if (reducible == null) break;
            reducible.suggested--;
            total--;
        }
    }

    private Map<Long, Integer> distributeRecommendation(
            int total,
            List<Long> presentationIds,
            Map<Long, Integer> maximumByPresentation,
            Map<Long, Long> bookedByPresentation) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        presentationIds.forEach(id -> result.put(id, 0));
        for (int i = 0; i < total; i++) {
            Long next = presentationIds.stream()
                    .filter(id -> result.get(id) < maximumByPresentation.getOrDefault(id, 0))
                    .min(Comparator
                            .comparingDouble((Long id) -> (double) result.get(id)
                                    / Math.max(1L, bookedByPresentation.getOrDefault(id, 0L)))
                            .thenComparingInt(id -> result.get(id))
                            .thenComparingLong(Long::longValue))
                    .orElse(null);
            if (next == null) break;
            result.computeIfPresent(next, (id, count) -> count + 1);
        }
        return result;
    }

    private int confidenceScore(DemandHistory history) {
        if (history.showtimeCount == 0) return 30;
        int score = 40 + Math.min(30, history.showtimeCount * 3)
                + Math.min(25, Math.toIntExact(history.bookedSeats / 10));
        return Math.min(95, score);
    }

    private long numberAsLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimePlannerPreviewResponse preview(ShowtimePlannerPreviewRequest request) {
        return buildPreview(request, true);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ShowtimePlannerPreviewResponse validateQuota(ShowtimePlannerPreviewRequest request) {
        return buildPreview(request, false);
    }

    private ShowtimePlannerPreviewResponse buildPreview(
            ShowtimePlannerPreviewRequest request,
            boolean includeCapacityAnalysis) {
        PlannerContext context = resolveContext(request);
        List<ShowtimePlannerIssue> issues = new ArrayList<>();
        List<ScheduledSlot> scheduled = new ArrayList<>();

        acceptLockedItems(context, request.getLockedItems(), scheduled, issues);
        List<ScheduledSlot> lockedSchedule = new ArrayList<>(scheduled);
        if (includeCapacityAnalysis) {
            allocateRemainingSlots(context, scheduled, false);

            List<ScheduledSlot> capacityFirstSchedule = new ArrayList<>(lockedSchedule);
            allocateRemainingSlots(context, capacityFirstSchedule, true);
            boolean capacityFirstSchedulesMore = capacityFirstSchedule.size() > scheduled.size();
            if (capacityFirstSchedulesMore) {
                scheduled.clear();
                scheduled.addAll(capacityFirstSchedule);
            }

            if (Boolean.TRUE.equals(request.getMaximizeSchedule())
                    && issues.stream().noneMatch(issue -> "ERROR".equals(issue.getSeverity()))
                    && meetsMinimumTargets(scheduled, context.allocations())) {
                List<ScheduledSlot> maximized = fillToMaximum(context, scheduled);
                List<ScheduledSlot> capacityFirstMaximized = fillToMaximum(context, capacityFirstSchedule);
                if (capacityFirstMaximized.size() > maximized.size()) {
                    maximized = capacityFirstMaximized;
                }

                // A pure earliest-finish schedule gives the true maximum number of
                // non-overlapping intervals for each room. Use it only when it still
                // respects every minimum quota configured by the admin.
                List<ScheduledSlot> pureMaximum = buildQuotaAwareMaximumSchedule(context, lockedSchedule);
                if (pureMaximum.size() > maximized.size()
                        && meetsMinimumTargets(pureMaximum, context.allocations())) {
                    maximized = pureMaximum;
                }
                scheduled.clear();
                scheduled.addAll(maximized);
            }
        } else {
            // Quota changes only need a feasibility result. The full capacity analysis
            // below performs multiple replans and is intentionally skipped here.
            allocateRemainingSlots(context, scheduled, true);
        }

        List<ShowtimePlannerAllocationSummary> summaries = new ArrayList<>();
        int totalRequested = context.allocations().stream().mapToInt(allocation -> allocation.target).sum();
        int totalScheduled = scheduled.size();
        int totalMissing = Math.max(0, totalRequested - totalScheduled);
        boolean currentPlanComplete = totalMissing == 0
                && issues.stream().noneMatch(issue -> "ERROR".equals(issue.getSeverity()));
        Map<AllocationKey, Integer> replannedAdditionalByAllocation = new LinkedHashMap<>();
        Map<String, Integer> additionalByFormat = new LinkedHashMap<>();
        context.allocations().forEach(allocation -> {
            replannedAdditionalByAllocation.put(allocation.key(), 0);
            additionalByFormat.putIfAbsent(
                    allocation.presentation.getFormat().toDisplayString(), 0);
        });

        if (includeCapacityAnalysis
                && currentPlanComplete
                && !Boolean.TRUE.equals(request.getMaximizeSchedule())) {
            List<ScheduledSlot> guaranteedMaximum = buildQuotaAwareMaximumSchedule(context, lockedSchedule);
            if (meetsMinimumTargets(guaranteedMaximum, context.allocations())) {
                context.allocations().forEach(allocation -> {
                    int additional = Math.max(
                            0, countScheduled(guaranteedMaximum, allocation) - allocation.target);
                    replannedAdditionalByAllocation.put(allocation.key(), additional);
                    additionalByFormat.merge(
                            allocation.presentation.getFormat().toDisplayString(),
                            additional,
                            Integer::sum);
                });
            }
        }
        int globalAdditionalPossible = replannedAdditionalByAllocation.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        Map<Long, Integer> movieAdditionalById = context.allocations().stream()
                .collect(Collectors.groupingBy(
                        allocation -> allocation.movie.getMovieId(),
                        LinkedHashMap::new,
                        Collectors.summingInt(
                                allocation -> replannedAdditionalByAllocation.getOrDefault(allocation.key(), 0))));
        Map<Long, Integer> movieRequestedById = context.allocations().stream()
                .collect(Collectors.groupingBy(
                        allocation -> allocation.movie.getMovieId(),
                        LinkedHashMap::new,
                        Collectors.summingInt(allocation -> allocation.target)));
        for (Allocation allocation : context.allocations()) {
            int scheduledCount = countScheduled(scheduled, allocation);
            int missing = Math.max(0, allocation.target - scheduledCount);
            int additionalPossible = replannedAdditionalByAllocation.getOrDefault(allocation.key(), 0);
            int movieAdditionalPossible = movieAdditionalById.getOrDefault(allocation.movie.getMovieId(), 0);
            summaries.add(ShowtimePlannerAllocationSummary.builder()
                    .movieId(allocation.movie.getMovieId())
                    .movieName(movieName(allocation.movie))
                    .presentationId(allocation.presentation.getPresentationId())
                    .presentationName(allocation.presentation.getDisplayName())
                    .requested(allocation.target)
                    .scheduled(scheduledCount)
                    .missing(missing)
                    .maximumPossible(allocation.maximumPossible)
                    .additionalPossible(additionalPossible)
                    .maximumWithCurrentPlan(allocation.target + additionalPossible)
                    .movieAdditionalPossible(movieAdditionalPossible)
                    .movieMaximumWithCurrentPlan(movieRequestedById.getOrDefault(allocation.movie.getMovieId(), 0)
                            + movieAdditionalPossible)
                    .build());

            if (missing > 0) {
                Map<String, Integer> blockers = new LinkedHashMap<>(allocation.blockers);
                int previewConflicts = (int) allocation.candidates.stream()
                        .filter(candidate -> conflictsWithScheduled(candidate, scheduled, context.turnaroundMinutes()))
                        .count();
                if (previewConflicts > 0) {
                    blockers.merge("Bị các suất khác trong bản xem trước chiếm vị trí", previewConflicts, Integer::sum);
                }
                boolean hasCompatibleRoom = context.rooms().stream()
                        .anyMatch(room -> supports(allocation.presentation, room));
                String mainReason;
                if (!hasCompatibleRoom) {
                    mainReason = "Không có phòng nào đã chọn hỗ trợ phiên bản này.";
                } else if (allocation.candidates.isEmpty()
                        && allocation.blockers.containsKey("Phòng đã có lịch hoặc chưa dọn xong")) {
                    mainReason = "Lịch hiện có của rạp đã chiếm các mốc giờ phù hợp.";
                } else if (previewConflicts > 0) {
                    mainReason = "Các phòng phù hợp không còn khoảng trống đủ dài sau khi xếp những suất khác.";
                } else {
                    mainReason = "Không còn phòng và giờ liên tục phù hợp với thời lượng phim.";
                }
                issues.add(ShowtimePlannerIssue.builder()
                        .code("QUOTA_NOT_FILLED")
                        .severity("ERROR")
                        .movieId(allocation.movie.getMovieId())
                        .presentationId(allocation.presentation.getPresentationId())
                        .requested(allocation.target)
                        .scheduled(scheduledCount)
                        .missing(missing)
                        .blockerCounts(blockers)
                        .message("%s · %s: xếp được %d/%d suất, còn thiếu %d. %s"
                                .formatted(movieName(allocation.movie), allocation.presentation.getDisplayName(),
                                        scheduledCount, allocation.target, missing, mainReason))
                        .build());
            }
        }

        scheduled.sort(Comparator
                .comparing((ScheduledSlot slot) -> slot.candidate.start)
                .thenComparing(slot -> slot.candidate.room.getCinemaRoomName())
                .thenComparing(slot -> movieName(slot.allocation.movie)));
        List<ShowtimePlannerPreviewItem> items = new ArrayList<>();
        Map<AllocationKey, Integer> sequenceByAllocation = new HashMap<>();
        for (ScheduledSlot slot : scheduled) {
            int sequence = sequenceByAllocation.merge(slot.allocation.key(), 1, Integer::sum);
            String generatedKey = "plan-%d-%d-%d".formatted(
                    slot.allocation.movie.getMovieId(),
                    slot.allocation.presentation.getPresentationId(),
                    sequence);
            items.add(toPreviewItem(slot, slot.clientKey == null || slot.clientKey.isBlank() ? generatedKey : slot.clientKey));
        }

        int missing = totalMissing;
        boolean hasError = issues.stream().anyMatch(issue -> "ERROR".equals(issue.getSeverity()));
        return ShowtimePlannerPreviewResponse.builder()
                .complete(missing == 0 && !hasError)
                .totalRequested(totalRequested)
                .totalScheduled(totalScheduled)
                .totalMissing(missing)
                .additionalPossible(globalAdditionalPossible)
                .additionalByFormat(additionalByFormat)
                .items(items)
                .allocations(summaries)
                .issues(issues)
                .build();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public List<ShowtimeResponse> confirm(ShowtimePlannerConfirmRequest request) {
        if (request == null || request.getPlan() == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw validation("Lịch xác nhận không được để trống.");
        }

        ShowtimePlannerPreviewRequest validationRequest = copyWithAllItemsLocked(request.getPlan(), request.getItems());
        ShowtimePlannerPreviewResponse validation = preview(validationRequest);
        boolean expectedItemCount = Boolean.TRUE.equals(request.getPlan().getMaximizeSchedule())
                ? request.getItems().size() == validation.getItems().size()
                : request.getItems().size() == validation.getTotalRequested();
        boolean everySubmittedItemAccepted = expectedItemCount
                && validation.getItems().size() == request.getItems().size()
                && validation.getItems().stream().allMatch(item -> Boolean.TRUE.equals(item.getLocked()));
        if (!Boolean.TRUE.equals(validation.getComplete()) || !everySubmittedItemAccepted) {
            String detail = validation.getIssues().stream()
                    .filter(issue -> "ERROR".equals(issue.getSeverity()))
                    .map(ShowtimePlannerIssue::getMessage)
                    .findFirst()
                    .orElse("Lịch đã thay đổi hoặc không còn đủ vị trí hợp lệ.");
            throw validation("Không thể xác nhận lịch: " + detail);
        }

        List<ShowtimeAdminRequest> showtimes = request.getItems().stream()
                .map(item -> ShowtimeAdminRequest.builder()
                        .movieId(item.getMovieId())
                        .presentationId(item.getPresentationId())
                        .cinemaRoomId(item.getCinemaRoomId())
                        .showDate(item.getShowDate())
                        .startTime(item.getStartTime())
                        .endTime(item.getEndTime())
                        .basePrice(item.getBasePrice())
                        .status(ShowtimeStatus.SCHEDULED)
                        .build())
                .toList();

        return showtimeService.createPlannedShowtimes(
                showtimes,
                valueOr(request.getPlan().getOpeningTime(), LocalTime.of(8, 0)),
                valueOr(request.getPlan().getLatestFinishTime(), LocalTime.of(2, 0)),
                valueOr(request.getPlan().getTurnaroundMinutes(), 20));
    }

    private PlannerContext resolveContext(ShowtimePlannerPreviewRequest request) {
        validateRequest(request);
        List<Long> roomIds = request.getCinemaRoomIds().stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, CinemaRoom> roomsById = cinemaRoomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(CinemaRoom::getCinemaRoomId, Function.identity()));
        List<Long> missingRoomIds = roomIds.stream().filter(id -> !roomsById.containsKey(id)).toList();
        if (!missingRoomIds.isEmpty()) {
            throw validation("Không tìm thấy phòng chiếu: " + missingRoomIds);
        }
        List<CinemaRoom> rooms = roomIds.stream().map(roomsById::get).toList();
        rooms.stream()
                .filter(room -> room.getStatus() != RoomStatus.ACTIVE)
                .findFirst()
                .ifPresent(room -> {
                    throw validation("Phòng %s không ở trạng thái hoạt động.".formatted(room.getCinemaRoomName()));
                });

        LocalTime opening = valueOr(request.getOpeningTime(), LocalTime.of(8, 0));
        LocalTime finish = valueOr(request.getLatestFinishTime(), LocalTime.of(2, 0));
        int turnaround = valueOr(request.getTurnaroundMinutes(), 20);
        int interval = valueOr(request.getSlotIntervalMinutes(), 15);
        LocalTime primeStart = valueOr(request.getPrimeStartTime(), LocalTime.of(18, 0));
        LocalTime primeEnd = valueOr(request.getPrimeEndTime(), LocalTime.of(22, 30));

        List<Showtime> existing = showtimeRepository.findActiveShowtimesBetweenDatesAndRooms(
                request.getFromDate().minusDays(1),
                request.getToDate().plusDays(1),
                ShowtimeStatus.CANCELLED,
                roomIds);
        List<OccupiedInterval> occupied = existing.stream()
                .map(showtime -> new OccupiedInterval(
                        showtime.getCinemaRoom().getCinemaRoomId(),
                        toStart(showtime.getShowDate(), showtime.getStartTime()),
                        toEnd(showtime.getShowDate(), showtime.getStartTime(), showtime.getEndTime()).plusMinutes(turnaround)))
                .toList();
        Map<Long, List<OccupiedInterval>> occupiedByRoom = occupied.stream()
                .collect(Collectors.groupingBy(
                        OccupiedInterval::roomId,
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<Allocation> allocations = new ArrayList<>();
        Set<Long> movieIds = new HashSet<>();
        for (ShowtimePlannerMovieRequest movieRequest : request.getMovies()) {
            if (!movieIds.add(movieRequest.getMovieId())) {
                throw validation("Mỗi phim chỉ được cấu hình một lần trong kế hoạch.");
            }
            Movie movie = movieRepository.findById(movieRequest.getMovieId())
                    .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
            validateMovie(movie, request.getFromDate(), request.getToDate());
            List<MoviePresentation> selectedPresentations = resolvePresentations(movie, movieRequest);
            Map<Long, ShowtimePlannerPresentationRequest> presentationRequests = movieRequest.getPresentations().stream()
                    .collect(Collectors.toMap(
                            ShowtimePlannerPresentationRequest::getPresentationId,
                            Function.identity()));

            List<Allocation> movieAllocations = selectedPresentations.stream()
                    .map(presentation -> {
                        Integer configuredPrice = presentationRequests.get(presentation.getPresentationId()).getBasePrice();
                        return new Allocation(
                                movie,
                                presentation,
                                valueOr(movieRequest.getRequestedShowtimes(), 0),
                                configuredPrice != null
                                        ? configuredPrice
                                        : movieRequest.getBasePrice() != null
                                            ? TicketPricingService.suggestPresentationBasePrice(
                                                movieRequest.getBasePrice(), presentation)
                                            : ticketPricingService.resolveConfiguredPresentationBasePrice(presentation));
                    })
                    .toList();
            for (Allocation allocation : movieAllocations) {
                generateCandidates(
                        allocation, rooms, occupiedByRoom,
                        request, opening, finish, interval, primeStart, primeEnd);
                allocation.candidates.sort(Comparator
                        .comparing((Candidate candidate) -> candidate.end)
                        .thenComparing(candidate -> candidate.start)
                        .thenComparing(candidate -> candidate.room.getCinemaRoomId()));
                allocation.maximumPossible = calculateMaximumPossible(allocation.candidates, turnaround);
            }

            if (movieRequest.getPresentationMode() == ShowtimePlannerPresentationMode.MANUAL) {
                Map<Long, Integer> requestedByPresentation = movieRequest.getPresentations().stream()
                        .collect(Collectors.toMap(
                                ShowtimePlannerPresentationRequest::getPresentationId,
                                presentation -> valueOr(presentation.getRequestedShowtimes(), 0)));
                int presentationTotal = requestedByPresentation.values().stream().mapToInt(Integer::intValue).sum();
                if (presentationTotal != movieRequest.getRequestedShowtimes()) {
                    throw validation("Phim %s yêu cầu tổng %d suất nhưng phần chia phiên bản đang là %d suất."
                            .formatted(movieName(movie), movieRequest.getRequestedShowtimes(), presentationTotal));
                }
                movieAllocations.forEach(allocation -> allocation.target = requestedByPresentation.get(allocation.presentation.getPresentationId()));
            } else {
                distributeAutomatically(movieAllocations, movieRequest.getRequestedShowtimes());
            }
            // Keep selected zero-quota presentations in the context so the preview can
            // also report how many showtimes the admin may still add to them.
            allocations.addAll(movieAllocations);
        }

        return new PlannerContext(request, rooms, occupied, allocations, turnaround);
    }

    private void validateRequest(ShowtimePlannerPreviewRequest request) {
        if (request == null || request.getFromDate() == null || request.getToDate() == null) {
            throw validation("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
        }
        if (request.getFromDate().isBefore(LocalDate.now())) {
            throw validation("Không thể lập lịch cho ngày trong quá khứ.");
        }
        if (request.getToDate().isBefore(request.getFromDate())) {
            throw validation("Ngày kết thúc không được trước ngày bắt đầu.");
        }
        long days = ChronoUnit.DAYS.between(request.getFromDate(), request.getToDate()) + 1;
        if (days > MAX_PLANNING_DAYS) {
            throw validation("Mỗi lần chỉ được lập lịch tối đa %d ngày.".formatted(MAX_PLANNING_DAYS));
        }
        if (request.getCinemaRoomIds() == null || request.getCinemaRoomIds().stream().noneMatch(Objects::nonNull)) {
            throw validation("Phải chọn ít nhất một phòng chiếu.");
        }
        if (request.getMovies() == null || request.getMovies().isEmpty()) {
            throw validation("Phải chọn ít nhất một phim.");
        }
        if (request.getMovies().stream().anyMatch(Objects::isNull)) {
            throw validation("Danh sách phim chứa cấu hình không hợp lệ.");
        }
        LocalTime opening = valueOr(request.getOpeningTime(), LocalTime.of(8, 0));
        LocalTime finish = valueOr(request.getLatestFinishTime(), LocalTime.of(2, 0));
        if (opening.equals(finish)) {
            throw validation("Giờ mở cửa và giờ kết thúc hoạt động không được trùng nhau.");
        }
        int turnaround = valueOr(request.getTurnaroundMinutes(), 20);
        int interval = valueOr(request.getSlotIntervalMinutes(), 15);
        if (turnaround < 0 || turnaround > 120) {
            throw validation("Thời gian dọn phòng phải từ 0 đến 120 phút.");
        }
        if (interval < 5 || interval > 60 || interval % 5 != 0) {
            throw validation("Bước thời gian phải từ 5 đến 60 phút và chia hết cho 5.");
        }
        int total = request.getMovies().stream().mapToInt(movie -> valueOr(movie.getRequestedShowtimes(), 0)).sum();
        if (total < 1) {
            throw validation("Tổng số suất yêu cầu của toàn bộ kế hoạch phải từ 1 suất trở lên.");
        }
        for (ShowtimePlannerMovieRequest movie : request.getMovies()) {
            if (movie.getBasePrice() != null && movie.getBasePrice() < 1_000) {
                throw validation("Giá vé mặc định của mỗi phim phải từ 1.000đ.");
            }
            if (movie.getPresentations() != null && movie.getPresentations().stream()
                    .anyMatch(presentation -> presentation != null
                            && presentation.getBasePrice() != null
                            && presentation.getBasePrice() < 1_000)) {
                throw validation("Giá vé của từng phiên bản 2D/3D phải từ 1.000đ.");
            }
        }
        if (total > MAX_TOTAL_SHOWTIMES) {
            throw validation("Mỗi lần chỉ được yêu cầu tối đa %d suất.".formatted(MAX_TOTAL_SHOWTIMES));
        }
    }

    private void validateMovie(Movie movie, LocalDate fromDate, LocalDate toDate) {
        if (movie.getStatus() == MovieStatus.INACTIVE || movie.getStatus() == MovieStatus.ENDED) {
            throw validation("Phim %s không còn hợp lệ để tạo suất chiếu.".formatted(movieName(movie)));
        }
        if (movie.getDuration() == null || movie.getDuration() <= 0) {
            throw validation("Phim %s chưa có thời lượng hợp lệ.".formatted(movieName(movie)));
        }
        if (movie.getDuration() > 600) {
            throw validation("Thời lượng phim %s vượt quá giới hạn 600 phút.".formatted(movieName(movie)));
        }
        if (movie.getFromDate() != null && toDate.isBefore(movie.getFromDate())) {
            throw validation("Khoảng ngày đã chọn nằm trước ngày khởi chiếu của phim %s (%s)."
                    .formatted(movieName(movie), movie.getFromDate()));
        }
        if (movie.getToDate() != null && fromDate.isAfter(movie.getToDate())) {
            throw validation("Khoảng ngày đã chọn nằm sau ngày kết thúc của phim %s (%s)."
                    .formatted(movieName(movie), movie.getToDate()));
        }
    }

    private List<MoviePresentation> resolvePresentations(Movie movie, ShowtimePlannerMovieRequest request) {
        if (request.getPresentations() == null || request.getPresentations().isEmpty()) {
            throw validation("Phim %s chưa chọn phiên bản chiếu.".formatted(movieName(movie)));
        }
        Map<Long, MoviePresentation> active = movie.getPresentations().stream()
                .filter(presentation -> presentation.getActive() == null || presentation.getActive())
                .collect(Collectors.toMap(MoviePresentation::getPresentationId, Function.identity()));
        List<Long> requestedIds = request.getPresentations().stream()
                .map(ShowtimePlannerPresentationRequest::getPresentationId)
                .filter(Objects::nonNull)
                .toList();
        if (requestedIds.size() != new HashSet<>(requestedIds).size()) {
            throw validation("Phiên bản chiếu của phim %s đang bị chọn trùng.".formatted(movieName(movie)));
        }
        List<Long> invalid = requestedIds.stream().filter(id -> !active.containsKey(id)).toList();
        if (!invalid.isEmpty()) {
            throw validation("Phim %s có phiên bản không tồn tại, đã bị ẩn hoặc không thuộc phim: %s."
                    .formatted(movieName(movie), invalid));
        }
        return requestedIds.stream()
                .map(active::get)
                .sorted(Comparator.comparing(MoviePresentation::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(MoviePresentation::getPresentationId))
                .toList();
    }

    private void generateCandidates(
            Allocation allocation,
            List<CinemaRoom> rooms,
            Map<Long, List<OccupiedInterval>> occupiedByRoom,
            ShowtimePlannerPreviewRequest request,
            LocalTime opening,
            LocalTime finish,
            int interval,
            LocalTime primeStart,
            LocalTime primeEnd) {
        boolean hasCompatibleRoom = rooms.stream().anyMatch(room -> supports(allocation.presentation, room));
        if (!hasCompatibleRoom) {
            allocation.blockers.put("Không có phòng hỗ trợ phiên bản", rooms.size());
            return;
        }

        for (LocalDate operationalDate = request.getFromDate(); !operationalDate.isAfter(request.getToDate()); operationalDate = operationalDate.plusDays(1)) {
            LocalDateTime windowStart = operationalDate.atTime(opening);
            LocalDateTime windowEnd = finish.isAfter(opening)
                    ? operationalDate.atTime(finish)
                    : operationalDate.plusDays(1).atTime(finish);
            for (CinemaRoom room : rooms) {
                if (!supports(allocation.presentation, room)) {
                    allocation.blockers.merge("Phòng không hỗ trợ phiên bản", 1, Integer::sum);
                    continue;
                }
                List<OccupiedInterval> roomOccupied = occupiedByRoom.getOrDefault(
                        room.getCinemaRoomId(), List.of());
                for (LocalDateTime start = windowStart;
                     !start.plusMinutes(allocation.movie.getDuration()).isAfter(windowEnd);
                     start = start.plusMinutes(interval)) {
                    LocalDateTime end = start.plusMinutes(allocation.movie.getDuration());
                    if (allocation.movie.getFromDate() != null && operationalDate.isBefore(allocation.movie.getFromDate())
                            || allocation.movie.getToDate() != null && operationalDate.isAfter(allocation.movie.getToDate())) {
                        allocation.blockers.merge("Ngày nằm ngoài thời gian phát hành", 1, Integer::sum);
                        continue;
                    }
                    if (!start.isAfter(LocalDateTime.now())) {
                        allocation.blockers.merge("Mốc giờ đã nằm trong quá khứ", 1, Integer::sum);
                        continue;
                    }
                    Candidate candidate = candidate(
                            allocation, room, operationalDate, start, end, primeStart, primeEnd);
                    if (conflictsWithRoomOccupied(
                            candidate, roomOccupied, valueOr(request.getTurnaroundMinutes(), 20))) {
                        allocation.blockers.merge("Phòng đã có lịch hoặc chưa dọn xong", 1, Integer::sum);
                        continue;
                    }
                    allocation.candidates.add(candidate);
                }
            }
        }
    }

    private Candidate candidate(
            Allocation allocation,
            CinemaRoom room,
            LocalDate operationalDate,
            LocalDateTime start,
            LocalDateTime end,
            LocalTime primeStart,
            LocalTime primeEnd) {
        int score = 45;
        List<String> reasons = new ArrayList<>();
        reasons.add("Phòng hỗ trợ đúng định dạng phiên bản");
        score += 10;
        if (isWithinTimeRange(start.toLocalTime(), primeStart, primeEnd)) {
            if (Boolean.TRUE.equals(allocation.movie.getIsHot())) {
                score += 40;
                reasons.add("🔥 Ưu tiên Phim Hot vào Giờ Vàng %s–%s".formatted(primeStart, primeEnd));
            } else {
                score += 15;
                reasons.add("Nằm trong giờ vàng %s–%s".formatted(primeStart, primeEnd));
            }
        }
        if (start.getMinute() == 0 || start.getMinute() == 30) {
            score += 10;
            reasons.add("Mốc giờ dễ nhớ (:00 hoặc :30)");
        } else if (start.getMinute() % 15 == 0) {
            score += 5;
        }
        return new Candidate(
                allocation, room, operationalDate, start, end, Math.min(100, score), reasons);
    }

    private void distributeAutomatically(List<Allocation> allocations, int requested) {
        for (int i = 0; i < requested; i++) {
            Allocation next = allocations.stream()
                    .min(Comparator
                            .comparing((Allocation allocation) -> allocation.target >= allocation.maximumPossible)
                            .thenComparingDouble(allocation -> (double) allocation.target / Math.max(1, allocation.maximumPossible))
                            .thenComparingInt(allocation -> allocation.target)
                            .thenComparing(allocation -> allocation.presentation.getSortOrder(), Comparator.nullsLast(Integer::compareTo))
                            .thenComparing(allocation -> allocation.presentation.getPresentationId()))
                    .orElseThrow();
            next.target++;
        }
    }

    private void acceptLockedItems(
            PlannerContext context,
            List<ShowtimePlannerLockedItemRequest> lockedItems,
            List<ScheduledSlot> scheduled,
            List<ShowtimePlannerIssue> issues) {
        if (lockedItems == null) return;
        Set<String> clientKeys = new HashSet<>();
        for (ShowtimePlannerLockedItemRequest locked : lockedItems) {
            String error = validateLockedItem(context, locked, scheduled, clientKeys);
            if (error != null) {
                issues.add(ShowtimePlannerIssue.builder()
                        .code("LOCKED_ITEM_INVALID")
                        .severity("ERROR")
                        .movieId(locked == null ? null : locked.getMovieId())
                        .presentationId(locked == null ? null : locked.getPresentationId())
                        .cinemaRoomId(locked == null ? null : locked.getCinemaRoomId())
                        .message(error)
                        .build());
                continue;
            }
            Allocation allocation = context.allocationByKey().get(new AllocationKey(locked.getMovieId(), locked.getPresentationId()));
            CinemaRoom room = context.roomById().get(locked.getCinemaRoomId());
            LocalDateTime start = toStart(locked.getShowDate(), locked.getStartTime());
            LocalDateTime end = toEnd(locked.getShowDate(), locked.getStartTime(), locked.getEndTime());
            Candidate candidate = candidate(
                    allocation,
                    room,
                    resolveOperationalDate(context.request(), start),
                    start,
                    end,
                    valueOr(context.request().getPrimeStartTime(), LocalTime.of(18, 0)),
                    valueOr(context.request().getPrimeEndTime(), LocalTime.of(22, 30)));
            ScoredCandidate scored = scoreCandidate(candidate, scheduled, context.turnaroundMinutes());
            scheduled.add(new ScheduledSlot(
                    allocation, candidate, scored.qualityScore(), scored.reasons(), true, locked.getClientKey()));
        }
    }

    private String validateLockedItem(
            PlannerContext context,
            ShowtimePlannerLockedItemRequest locked,
            List<ScheduledSlot> scheduled,
            Set<String> clientKeys) {
        if (locked == null || locked.getMovieId() == null || locked.getPresentationId() == null
                || locked.getCinemaRoomId() == null || locked.getShowDate() == null
                || locked.getStartTime() == null || locked.getEndTime() == null) {
            return "Một suất đã khóa đang thiếu phim, phiên bản, phòng, ngày hoặc giờ.";
        }
        if (locked.getClientKey() != null && !locked.getClientKey().isBlank() && !clientKeys.add(locked.getClientKey())) {
            return "Mã suất đã khóa %s đang bị trùng.".formatted(locked.getClientKey());
        }
        Allocation allocation = context.allocationByKey().get(new AllocationKey(locked.getMovieId(), locked.getPresentationId()));
        if (allocation == null) {
            return "Suất đã khóa không thuộc phim/phiên bản đang được chọn.";
        }
        if (!Boolean.TRUE.equals(context.request().getMaximizeSchedule())
                && countScheduled(scheduled, allocation) >= allocation.target) {
            return "%s · %s đã vượt số suất được yêu cầu."
                    .formatted(movieName(allocation.movie), allocation.presentation.getDisplayName());
        }
        CinemaRoom room = context.roomById().get(locked.getCinemaRoomId());
        if (room == null) return "Phòng của suất đã khóa không nằm trong danh sách phòng được chọn.";
        if (!supports(allocation.presentation, room)) {
            return "Phòng %s không hỗ trợ phiên bản %s."
                    .formatted(room.getCinemaRoomName(), allocation.presentation.getDisplayName());
        }
        LocalDateTime start = toStart(locked.getShowDate(), locked.getStartTime());
        LocalDateTime end = toEnd(locked.getShowDate(), locked.getStartTime(), locked.getEndTime());
        long minutes = Duration.between(start, end).toMinutes();
        if (minutes != allocation.movie.getDuration()) {
            return "Suất đã khóa của phim %s phải dài đúng %d phút nhưng hiện là %d phút."
                    .formatted(movieName(allocation.movie), allocation.movie.getDuration(), minutes);
        }
        if (!start.isAfter(LocalDateTime.now())) return "Suất đã khóa nằm trong quá khứ.";
        if (!insidePlanningWindow(context.request(), start, end)) return "Suất đã khóa nằm ngoài ngày hoặc giờ hoạt động đã chọn.";
        LocalDate lockedOperationalDate = resolveOperationalDate(context.request(), start);
        if (allocation.movie.getFromDate() != null && lockedOperationalDate.isBefore(allocation.movie.getFromDate())
                || allocation.movie.getToDate() != null && lockedOperationalDate.isAfter(allocation.movie.getToDate())) {
            return "Ngày của suất đã khóa nằm ngoài thời gian phát hành phim.";
        }
        Candidate candidate = new Candidate(
                allocation,
                room,
                resolveOperationalDate(context.request(), start),
                start,
                end,
                0,
                List.of());
        if (conflictsWithOccupied(candidate, context.occupied(), context.turnaroundMinutes())) {
            return "Phòng %s đã có lịch hoặc chưa đủ thời gian dọn rạp tại mốc %s %s."
                    .formatted(room.getCinemaRoomName(), locked.getShowDate(), locked.getStartTime());
        }
        if (conflictsWithScheduled(candidate, scheduled, context.turnaroundMinutes())) {
            return "Suất đã khóa bị trùng với một suất khác trong bản xem trước.";
        }
        return null;
    }

    private void allocateRemainingSlots(
            PlannerContext context,
            List<ScheduledSlot> scheduled,
            boolean prioritizeCapacity) {
        Map<Long, List<ScheduledSlot>> scheduledByRoom = new HashMap<>();
        for (ScheduledSlot slot : scheduled) {
            scheduledByRoom.computeIfAbsent(
                    slot.candidate.room.getCinemaRoomId(), ignored -> new ArrayList<>()).add(slot);
        }
        Map<AllocationKey, Integer> remaining = context.allocations().stream()
                .collect(Collectors.toMap(
                        Allocation::key,
                        allocation -> Math.max(0, allocation.target - countScheduled(scheduled, allocation)),
                        Integer::sum,
                        LinkedHashMap::new));
        int totalRemaining = remaining.values().stream().mapToInt(Integer::intValue).sum();
        Comparator<ScoredCandidate> candidateOrder = prioritizeCapacity
                ? Comparator.comparing((ScoredCandidate scored) -> scored.candidate.end)
                        .thenComparing(scored -> scored.candidate.start)
                        .thenComparing(Comparator.comparingInt(ScoredCandidate::priorityScore).reversed())
                        .thenComparing(scored -> scored.candidate.room.getCinemaRoomId())
                : Comparator.comparingInt(ScoredCandidate::priorityScore).reversed()
                        .thenComparing(scored -> scored.candidate.start)
                        .thenComparing(scored -> scored.candidate.room.getCinemaRoomId());

        while (totalRemaining > 0) {
            AllocationChoice bestChoice = null;
            for (Allocation allocation : context.allocations()) {
                int needed = remaining.getOrDefault(allocation.key(), 0);
                if (needed <= 0) continue;
                int feasibleCount = 0;
                ScoredCandidate bestCandidate = null;
                Candidate bestCapacityCandidate = null;
                for (Candidate candidate : allocation.candidates) {
                    if (prioritizeCapacity
                            && bestCapacityCandidate != null
                            && isAfterCapacityCandidateGroup(candidate, bestCapacityCandidate)) {
                        // Candidates are ordered by end/start. Once the earliest feasible
                        // end/start group has been evaluated, later candidates cannot win.
                        break;
                    }
                    if (conflictsWithRoomSchedule(
                            candidate,
                            scheduledByRoom.get(candidate.room.getCinemaRoomId()),
                            context.turnaroundMinutes())) continue;
                    feasibleCount++;
                    if (prioritizeCapacity) {
                        if (bestCapacityCandidate == null) {
                            bestCapacityCandidate = candidate;
                            continue;
                        }
                        int endComparison = candidate.end.compareTo(bestCapacityCandidate.end);
                        int startComparison = candidate.start.compareTo(bestCapacityCandidate.start);
                        if (endComparison < 0 || endComparison == 0 && startComparison < 0) {
                            bestCapacityCandidate = candidate;
                            bestCandidate = null;
                        } else if (endComparison == 0 && startComparison == 0) {
                            ScoredCandidate scored = scoreCandidate(
                                    candidate, scheduled, context.turnaroundMinutes(), false);
                            ScoredCandidate currentBest = bestCandidate == null
                                    ? scoreCandidate(
                                            bestCapacityCandidate, scheduled, context.turnaroundMinutes(), false)
                                    : bestCandidate;
                            if (candidateOrder.compare(scored, currentBest) < 0) {
                                bestCapacityCandidate = candidate;
                                bestCandidate = scored;
                            } else {
                                bestCandidate = currentBest;
                            }
                        }
                    } else {
                        ScoredCandidate scored = scoreCandidate(
                                candidate, scheduled, context.turnaroundMinutes(), false);
                        if (bestCandidate == null || candidateOrder.compare(scored, bestCandidate) < 0) {
                            bestCandidate = scored;
                        }
                    }
                }
                if (prioritizeCapacity && bestCapacityCandidate != null && bestCandidate == null) {
                    bestCandidate = scoreCandidate(
                            bestCapacityCandidate, scheduled, context.turnaroundMinutes(), false);
                }
                if (bestCandidate == null) continue;
                AllocationChoice choice = new AllocationChoice(allocation, bestCandidate, feasibleCount, needed);
                if (bestChoice == null
                        || prioritizeCapacity && finishesEarlier(choice, bestChoice)
                        || !prioritizeCapacity && isMoreConstrained(choice, bestChoice)) {
                    bestChoice = choice;
                }
            }
            if (bestChoice == null) break;
            ScoredCandidate selected = scoreCandidate(
                    bestChoice.candidate().candidate(), scheduled, context.turnaroundMinutes(), true);
            ScheduledSlot selectedSlot = new ScheduledSlot(
                    bestChoice.allocation(), selected.candidate(), selected.qualityScore(), selected.reasons(), false, null);
            scheduled.add(selectedSlot);
            scheduledByRoom.computeIfAbsent(
                    selected.candidate().room.getCinemaRoomId(), ignored -> new ArrayList<>()).add(selectedSlot);
            remaining.computeIfPresent(bestChoice.allocation().key(), (key, count) -> count - 1);
            totalRemaining--;
        }
    }

    private boolean isAfterCapacityCandidateGroup(Candidate candidate, Candidate currentBest) {
        int endComparison = candidate.end.compareTo(currentBest.end);
        return endComparison > 0
                || endComparison == 0 && candidate.start.compareTo(currentBest.start) > 0;
    }

    private boolean isMoreConstrained(AllocationChoice candidate, AllocationChoice current) {
        boolean candHotPrime = Boolean.TRUE.equals(candidate.allocation().movie.getIsHot())
                && candidate.candidate().candidate().staticReasons().stream().anyMatch(r -> r.contains("Giờ Vàng") || r.contains("giờ vàng"));
        boolean currHotPrime = Boolean.TRUE.equals(current.allocation().movie.getIsHot())
                && current.candidate().candidate().staticReasons().stream().anyMatch(r -> r.contains("Giờ Vàng") || r.contains("giờ vàng"));
        if (candHotPrime && !currHotPrime) return true;
        if (!candHotPrime && currHotPrime) return false;

        long left = (long) candidate.feasibleCount() * current.needed();
        long right = (long) current.feasibleCount() * candidate.needed();
        if (left != right) return left < right;
        if (candidate.candidate().priorityScore() != current.candidate().priorityScore()) {
            return candidate.candidate().priorityScore() > current.candidate().priorityScore();
        }
        return candidate.allocation().presentation.getPresentationId()
                < current.allocation().presentation.getPresentationId();
    }

    private boolean finishesEarlier(AllocationChoice candidate, AllocationChoice current) {
        boolean candHotPrime = Boolean.TRUE.equals(candidate.allocation().movie.getIsHot())
                && candidate.candidate().candidate().staticReasons().stream().anyMatch(r -> r.contains("Giờ Vàng") || r.contains("giờ vàng"));
        boolean currHotPrime = Boolean.TRUE.equals(current.allocation().movie.getIsHot())
                && current.candidate().candidate().staticReasons().stream().anyMatch(r -> r.contains("Giờ Vàng") || r.contains("giờ vàng"));
        if (candHotPrime && !currHotPrime) return true;
        if (!candHotPrime && currHotPrime) return false;

        int endComparison = candidate.candidate().candidate.end.compareTo(current.candidate().candidate.end);
        if (endComparison != 0) return endComparison < 0;
        int startComparison = candidate.candidate().candidate.start.compareTo(current.candidate().candidate.start);
        if (startComparison != 0) return startComparison < 0;
        if (candidate.needed() != current.needed()) return candidate.needed() > current.needed();
        return candidate.allocation().presentation.getPresentationId()
                < current.allocation().presentation.getPresentationId();
    }

    private ScoredCandidate scoreCandidate(Candidate candidate, List<ScheduledSlot> scheduled, int turnaround) {
        return scoreCandidate(candidate, scheduled, turnaround, true);
    }

    private ScoredCandidate scoreCandidate(
            Candidate candidate,
            List<ScheduledSlot> scheduled,
            int turnaround,
            boolean includeReasons) {
        int qualityScore = candidate.staticScore;
        List<String> reasons = includeReasons ? new ArrayList<>(candidate.staticReasons) : null;

        long nearbySameMovie = scheduled.stream()
                .filter(slot -> slot.allocation.movie.getMovieId().equals(candidate.allocation.movie.getMovieId()))
                .filter(slot -> slot.candidate.operationalDate.equals(candidate.operationalDate))
                .filter(slot -> Math.abs(Duration.between(slot.candidate.start, candidate.start).toMinutes()) < 60)
                .count();
        if (nearbySameMovie > 0) {
            qualityScore -= 25;
            if (includeReasons) reasons.add("Trừ điểm vì gần giờ một suất khác của cùng phim");
        } else {
            qualityScore += 8;
            if (includeReasons) reasons.add("Giãn giờ với các suất khác của cùng phim");
        }

        int sameMovieOnDay = (int) scheduled.stream()
                .filter(slot -> slot.allocation.movie.getMovieId().equals(candidate.allocation.movie.getMovieId()))
                .filter(slot -> slot.candidate.operationalDate.equals(candidate.operationalDate))
                .count();
        int minimumMovieDayCount = scheduled.stream()
                .filter(slot -> slot.allocation.movie.getMovieId().equals(candidate.allocation.movie.getMovieId()))
                .collect(Collectors.groupingBy(slot -> slot.candidate.operationalDate, Collectors.counting()))
                .values().stream().mapToInt(Long::intValue).min().orElse(0);
        if (sameMovieOnDay <= minimumMovieDayCount) {
            qualityScore += 5;
            if (includeReasons) reasons.add("Phân bố đều số suất giữa các ngày");
        }

        TimeBand candidateBand = timeBand(candidate.start.toLocalTime());
        List<ScheduledSlot> sameMovieOnOperationalDay = scheduled.stream()
                .filter(slot -> slot.allocation.movie.getMovieId().equals(candidate.allocation.movie.getMovieId()))
                .filter(slot -> slot.candidate.operationalDate.equals(candidate.operationalDate))
                .toList();
        long sameBandCount = sameMovieOnOperationalDay.stream()
                .filter(slot -> timeBand(slot.candidate.start.toLocalTime()) == candidateBand)
                .count();
        boolean coreBandsCovered = List.of(TimeBand.MORNING, TimeBand.AFTERNOON, TimeBand.EVENING).stream()
                .allMatch(band -> sameMovieOnOperationalDay.stream()
                        .anyMatch(slot -> timeBand(slot.candidate.start.toLocalTime()) == band));
        int coverageTier;
        if (candidate.allocation.movieTarget >= 3
                && candidateBand != TimeBand.LATE
                && sameBandCount == 0) {
            coverageTier = 3;
        } else if (candidate.allocation.movieTarget >= 4
                && candidateBand == TimeBand.LATE
                && sameBandCount == 0
                && coreBandsCovered) {
            coverageTier = 2;
        } else if (sameBandCount == 0) {
            coverageTier = 1;
        } else {
            coverageTier = 0;
        }
        if (includeReasons) {
            if (coverageTier > 0) {
                reasons.add("Phủ khung " + candidateBand.label + " còn trống của phim trong ngày");
            } else {
                reasons.add("Hạn chế dồn nhiều suất vào cùng khung " + candidateBand.label);
            }
        }

        boolean followsRoomSchedule = scheduled.stream()
                .filter(slot -> slot.candidate.room.getCinemaRoomId().equals(candidate.room.getCinemaRoomId()))
                .anyMatch(slot -> {
                    long gap = Duration.between(slot.candidate.end.plusMinutes(turnaround), candidate.start).toMinutes();
                    return gap >= 0 && gap <= 30;
                });
        if (followsRoomSchedule) {
            qualityScore += 5;
            if (includeReasons) reasons.add("Tận dụng khoảng trống phòng hợp lý");
        }
        boolean isHot = Boolean.TRUE.equals(candidate.allocation.movie.getIsHot());
        boolean isPrimeSlot = candidate.staticReasons != null && candidate.staticReasons.stream()
                .anyMatch(r -> r.contains("Giờ Vàng") || r.contains("giờ vàng"));
        int hotPrimeBonus = (isHot && isPrimeSlot) ? 500 : 0;

        int normalizedQuality = Math.max(0, Math.min(100, qualityScore));
        int priorityScore = coverageTier * 1_000 + hotPrimeBonus - Math.toIntExact(sameBandCount) * 100 + normalizedQuality;
        return new ScoredCandidate(
                candidate,
                priorityScore,
                normalizedQuality,
                includeReasons ? reasons : List.of());
    }

    private int calculateMaximumPossible(List<Candidate> candidates, int turnaround) {
        Map<Long, Candidate> lastSelectedByRoom = new HashMap<>();
        int selectedCount = 0;
        for (Candidate candidate : candidates) {
            Long roomId = candidate.room.getCinemaRoomId();
            Candidate lastSelected = lastSelectedByRoom.get(roomId);
            boolean conflict = lastSelected != null && intervalsOverlap(
                    candidate.start, candidate.end.plusMinutes(turnaround),
                    lastSelected.start, lastSelected.end.plusMinutes(turnaround));
            if (!conflict) {
                lastSelectedByRoom.put(roomId, candidate);
                selectedCount++;
            }
        }
        return selectedCount;
    }

    private List<ScheduledSlot> simulateAdditionalSlots(
            List<Allocation> allocations,
            List<ScheduledSlot> currentSchedule,
            int turnaround,
            int limit) {
        if (limit <= 0 || allocations.isEmpty()) return List.of();
        List<ScheduledSlot> simulated = new ArrayList<>(currentSchedule);
        Map<Long, List<ScheduledSlot>> simulatedByRoom = new HashMap<>();
        Map<Long, Integer> scheduledByMovie = new HashMap<>();
        Map<AllocationKey, Integer> scheduledByAllocation = new HashMap<>();
        for (ScheduledSlot slot : simulated) {
            simulatedByRoom.computeIfAbsent(
                    slot.candidate.room.getCinemaRoomId(), ignored -> new ArrayList<>()).add(slot);
            scheduledByMovie.merge(slot.allocation.movie.getMovieId(), 1, Integer::sum);
            scheduledByAllocation.merge(slot.allocation.key(), 1, Integer::sum);
        }
        List<ScheduledSlot> addedSlots = new ArrayList<>();
        Map<CandidateEndKey, List<Candidate>> candidatesByRoomAndEnd = allocations.stream()
                .flatMap(allocation -> allocation.candidates.stream())
                .collect(Collectors.groupingBy(
                        candidate -> new CandidateEndKey(
                                candidate.room.getCinemaRoomId(), candidate.end),
                        LinkedHashMap::new,
                        Collectors.toList()));
        List<Map.Entry<CandidateEndKey, List<Candidate>>> candidateGroups = candidatesByRoomAndEnd.entrySet().stream()
                .sorted(Map.Entry.<CandidateEndKey, List<Candidate>>comparingByKey(
                        Comparator.comparing(CandidateEndKey::end)
                                .thenComparing(CandidateEndKey::roomId)))
                .toList();
        for (Map.Entry<CandidateEndKey, List<Candidate>> group : candidateGroups) {
            if (addedSlots.size() >= limit) break;
            Candidate candidate = group.getValue().stream()
                    .filter(item -> !conflictsWithRoomSchedule(
                            item,
                            simulatedByRoom.get(item.room.getCinemaRoomId()),
                            turnaround))
                    .min((left, right) -> compareAdditionalCandidates(
                            left, right, scheduledByMovie, scheduledByAllocation))
                    .orElse(null);
            if (candidate == null) continue;
            ScoredCandidate scored = scoreCandidate(candidate, simulated, turnaround, true);
            ScheduledSlot slot = new ScheduledSlot(
                    candidate.allocation,
                    candidate,
                    scored.qualityScore(),
                    scored.reasons(),
                    false,
                    null);
            simulated.add(slot);
            simulatedByRoom.computeIfAbsent(
                    candidate.room.getCinemaRoomId(), ignored -> new ArrayList<>()).add(slot);
            scheduledByMovie.merge(candidate.allocation.movie.getMovieId(), 1, Integer::sum);
            scheduledByAllocation.merge(candidate.allocation.key(), 1, Integer::sum);
            addedSlots.add(slot);
        }
        return addedSlots;
    }

    private int compareAdditionalCandidates(
            Candidate left,
            Candidate right,
            Map<Long, Integer> scheduledByMovie,
            Map<AllocationKey, Integer> scheduledByAllocation) {
        int leftMovieCount = scheduledByMovie.getOrDefault(left.allocation.movie.getMovieId(), 0);
        int rightMovieCount = scheduledByMovie.getOrDefault(right.allocation.movie.getMovieId(), 0);
        long leftMovieRatio = (long) leftMovieCount * Math.max(1, right.allocation.movieTarget);
        long rightMovieRatio = (long) rightMovieCount * Math.max(1, left.allocation.movieTarget);
        if (leftMovieRatio != rightMovieRatio) return Long.compare(leftMovieRatio, rightMovieRatio);

        int leftAllocationCount = scheduledByAllocation.getOrDefault(left.allocation.key(), 0);
        int rightAllocationCount = scheduledByAllocation.getOrDefault(right.allocation.key(), 0);
        long leftAllocationRatio = (long) leftAllocationCount * Math.max(1, right.allocation.target);
        long rightAllocationRatio = (long) rightAllocationCount * Math.max(1, left.allocation.target);
        if (leftAllocationRatio != rightAllocationRatio) {
            return Long.compare(leftAllocationRatio, rightAllocationRatio);
        }
        if (left.staticScore != right.staticScore) {
            return Integer.compare(right.staticScore, left.staticScore);
        }
        int startComparison = right.start.compareTo(left.start);
        if (startComparison != 0) return startComparison;
        return left.allocation.presentation.getPresentationId()
                .compareTo(right.allocation.presentation.getPresentationId());
    }

    private List<ScheduledSlot> fillToMaximum(
            PlannerContext context,
            List<ScheduledSlot> baseSchedule) {
        List<ScheduledSlot> maximized = new ArrayList<>(baseSchedule);
        maximized.addAll(simulateAdditionalSlots(
                context.allocations(),
                baseSchedule,
                context.turnaroundMinutes(),
                Math.max(0, MAX_TOTAL_SHOWTIMES - baseSchedule.size())));
        return maximized;
    }

    private List<ScheduledSlot> buildQuotaAwareMaximumSchedule(
            PlannerContext context,
            List<ScheduledSlot> lockedSchedule) {
        List<ScheduledSlot> schedule = fillToMaximum(context, lockedSchedule);
        List<ScheduledSlot> quotaAnchors = new ArrayList<>(lockedSchedule);
        int repairLimit = context.allocations().stream().mapToInt(allocation -> allocation.target).sum();

        for (int attempt = 0; attempt < repairLimit; attempt++) {
            Allocation deficit = context.allocations().stream()
                    .filter(allocation -> countScheduled(schedule, allocation) < allocation.target)
                    .sorted(Comparator
                            .comparingInt((Allocation allocation) -> allocation.movie.getDuration()).reversed()
                            .thenComparingInt(allocation -> allocation.candidates.size())
                            .thenComparing(allocation -> allocation.presentation.getPresentationId()))
                    .findFirst()
                    .orElse(null);
            if (deficit == null) break;

            Map<AllocationKey, Integer> counts = context.allocations().stream()
                    .collect(Collectors.toMap(
                            Allocation::key,
                            allocation -> countScheduled(schedule, allocation)));
            RepairChoice best = null;
            for (Candidate candidate : deficit.candidates) {
                List<ScheduledSlot> conflicts = schedule.stream()
                        .filter(slot -> slot.candidate.room.getCinemaRoomId()
                                .equals(candidate.room.getCinemaRoomId()))
                        .filter(slot -> intervalsOverlap(
                                candidate.start,
                                candidate.end.plusMinutes(context.turnaroundMinutes()),
                                slot.candidate.start,
                                slot.candidate.end.plusMinutes(context.turnaroundMinutes())))
                        .toList();
                if (conflicts.stream().anyMatch(slot -> slot.locked
                        || quotaAnchors.contains(slot)
                        || slot.allocation.key().equals(deficit.key()))) {
                    continue;
                }
                Map<AllocationKey, Long> removalsByAllocation = conflicts.stream()
                        .collect(Collectors.groupingBy(
                                slot -> slot.allocation.key(),
                                Collectors.counting()));
                boolean keepsOtherMinimums = removalsByAllocation.entrySet().stream()
                        .allMatch(entry -> {
                            Allocation affected = context.allocationByKey().get(entry.getKey());
                            return counts.getOrDefault(entry.getKey(), 0) - entry.getValue() >= affected.target;
                        });
                if (!keepsOtherMinimums) continue;

                RepairChoice choice = new RepairChoice(candidate, conflicts);
                if (best == null
                        || choice.conflicts().size() < best.conflicts().size()
                        || choice.conflicts().size() == best.conflicts().size()
                        && (candidate.end.isBefore(best.candidate().end)
                        || candidate.end.equals(best.candidate().end)
                        && candidate.start.isAfter(best.candidate().start))) {
                    best = choice;
                }
            }
            if (best == null) break;

            schedule.removeAll(best.conflicts());
            ScoredCandidate scored = scoreCandidate(
                    best.candidate(), schedule, context.turnaroundMinutes(), true);
            ScheduledSlot anchor = new ScheduledSlot(
                    deficit,
                    best.candidate(),
                    scored.qualityScore(),
                    scored.reasons(),
                    false,
                    null);
            schedule.add(anchor);
            quotaAnchors.add(anchor);
        }

        if (!meetsMinimumTargets(schedule, context.allocations())) {
            return schedule;
        }
        List<ScheduledSlot> repairedMaximum = fillToMaximum(context, schedule);

        // Repack all non-essential surplus slots around the repaired quota
        // anchors. This recovers gaps that a one-for-one replacement may leave
        // behind, while keeping the hard-to-place minimum showtimes fixed.
        List<ScheduledSlot> repacked = new ArrayList<>(quotaAnchors);
        allocateRemainingSlots(context, repacked, true);
        if (meetsMinimumTargets(repacked, context.allocations())) {
            repacked = fillToMaximum(context, repacked);
            if (repacked.size() > repairedMaximum.size()) {
                return repacked;
            }
        }
        return repairedMaximum;
    }

    private boolean meetsMinimumTargets(
            List<ScheduledSlot> schedule,
            List<Allocation> allocations) {
        return allocations.stream()
                .allMatch(allocation -> countScheduled(schedule, allocation) >= allocation.target);
    }

    private boolean conflictsWithOccupied(Candidate candidate, List<OccupiedInterval> occupied, int turnaround) {
        LocalDateTime candidateEnd = candidate.end.plusMinutes(turnaround);
        return occupied.stream()
                .filter(interval -> interval.roomId.equals(candidate.room.getCinemaRoomId()))
                .anyMatch(interval -> intervalsOverlap(candidate.start, candidateEnd, interval.start, interval.end));
    }

    private boolean conflictsWithRoomOccupied(Candidate candidate, List<OccupiedInterval> roomOccupied, int turnaround) {
        LocalDateTime candidateEnd = candidate.end.plusMinutes(turnaround);
        return roomOccupied.stream()
                .anyMatch(interval -> intervalsOverlap(candidate.start, candidateEnd, interval.start, interval.end));
    }

    private static boolean conflictsWithScheduled(Candidate candidate, List<ScheduledSlot> scheduled, int turnaround) {
        LocalDateTime candidateEnd = candidate.end.plusMinutes(turnaround);
        return scheduled.stream()
                .filter(slot -> slot.candidate.room.getCinemaRoomId().equals(candidate.room.getCinemaRoomId()))
                .anyMatch(slot -> intervalsOverlap(
                        candidate.start, candidateEnd,
                        slot.candidate.start, slot.candidate.end.plusMinutes(turnaround)));
    }

    private static boolean conflictsWithRoomSchedule(
            Candidate candidate,
            List<ScheduledSlot> roomSchedule,
            int turnaround) {
        if (roomSchedule == null || roomSchedule.isEmpty()) return false;
        LocalDateTime candidateEnd = candidate.end.plusMinutes(turnaround);
        return roomSchedule.stream()
                .anyMatch(slot -> intervalsOverlap(
                        candidate.start, candidateEnd,
                        slot.candidate.start, slot.candidate.end.plusMinutes(turnaround)));
    }

    private static boolean intervalsOverlap(
            LocalDateTime firstStart,
            LocalDateTime firstEnd,
            LocalDateTime secondStart,
            LocalDateTime secondEnd) {
        return firstStart.isBefore(secondEnd) && firstEnd.isAfter(secondStart);
    }

    private boolean supports(MoviePresentation presentation, CinemaRoom room) {
        return MoviePresentationCompatibility.isSupportedByRoom(presentation, room.getType());
    }

    private boolean insidePlanningWindow(ShowtimePlannerPreviewRequest request, LocalDateTime start, LocalDateTime end) {
        LocalTime opening = valueOr(request.getOpeningTime(), LocalTime.of(8, 0));
        LocalTime finish = valueOr(request.getLatestFinishTime(), LocalTime.of(2, 0));
        for (LocalDate date = request.getFromDate(); !date.isAfter(request.getToDate()); date = date.plusDays(1)) {
            LocalDateTime windowStart = date.atTime(opening);
            LocalDateTime windowEnd = finish.isAfter(opening) ? date.atTime(finish) : date.plusDays(1).atTime(finish);
            if (!start.isBefore(windowStart) && !end.isAfter(windowEnd)) return true;
        }
        return false;
    }

    private boolean isWithinTimeRange(LocalTime value, LocalTime from, LocalTime to) {
        if (from.equals(to)) return true;
        if (from.isBefore(to)) return !value.isBefore(from) && value.isBefore(to);
        return !value.isBefore(from) || value.isBefore(to);
    }

    private LocalDate resolveOperationalDate(
            ShowtimePlannerPreviewRequest request,
            LocalDateTime start) {
        LocalTime opening = valueOr(request.getOpeningTime(), LocalTime.of(8, 0));
        LocalTime finish = valueOr(request.getLatestFinishTime(), LocalTime.of(2, 0));
        boolean crossesMidnight = !finish.isAfter(opening);
        return crossesMidnight && start.toLocalTime().isBefore(finish)
                ? start.toLocalDate().minusDays(1)
                : start.toLocalDate();
    }

    private TimeBand timeBand(LocalTime time) {
        if (time.isBefore(LocalTime.of(6, 0)) || !time.isBefore(LocalTime.of(22, 0))) {
            return TimeBand.LATE;
        }
        if (time.isBefore(LocalTime.NOON)) {
            return TimeBand.MORNING;
        }
        if (time.isBefore(LocalTime.of(18, 0))) {
            return TimeBand.AFTERNOON;
        }
        return TimeBand.EVENING;
    }

    private ShowtimePlannerPreviewItem toPreviewItem(ScheduledSlot slot, String key) {
        return ShowtimePlannerPreviewItem.builder()
                .clientKey(key)
                .movieId(slot.allocation.movie.getMovieId())
                .movieName(movieName(slot.allocation.movie))
                .presentationId(slot.allocation.presentation.getPresentationId())
                .presentationName(slot.allocation.presentation.getDisplayName())
                .cinemaRoomId(slot.candidate.room.getCinemaRoomId())
                .cinemaRoomName(slot.candidate.room.getCinemaRoomName())
                .showDate(slot.candidate.start.toLocalDate())
                .startTime(slot.candidate.start.toLocalTime())
                .endTime(slot.candidate.end.toLocalTime())
                .basePrice(slot.allocation.basePrice)
                .qualityScore(slot.score)
                .qualityReasons(slot.reasons)
                .locked(slot.locked)
                .build();
    }

    private ShowtimePlannerPreviewRequest copyWithAllItemsLocked(
            ShowtimePlannerPreviewRequest plan,
            List<ShowtimePlannerPreviewItem> items) {
        List<ShowtimePlannerLockedItemRequest> locked = items.stream()
                .map(item -> ShowtimePlannerLockedItemRequest.builder()
                        .clientKey(item.getClientKey())
                        .movieId(item.getMovieId())
                        .presentationId(item.getPresentationId())
                        .cinemaRoomId(item.getCinemaRoomId())
                        .showDate(item.getShowDate())
                        .startTime(item.getStartTime())
                        .endTime(item.getEndTime())
                        .basePrice(item.getBasePrice())
                        .build())
                .toList();
        return ShowtimePlannerPreviewRequest.builder()
                .fromDate(plan.getFromDate())
                .toDate(plan.getToDate())
                .openingTime(plan.getOpeningTime())
                .latestFinishTime(plan.getLatestFinishTime())
                .turnaroundMinutes(plan.getTurnaroundMinutes())
                .slotIntervalMinutes(plan.getSlotIntervalMinutes())
                .primeStartTime(plan.getPrimeStartTime())
                .primeEndTime(plan.getPrimeEndTime())
                .maximizeSchedule(plan.getMaximizeSchedule())
                .cinemaRoomIds(plan.getCinemaRoomIds())
                .movies(plan.getMovies())
                .lockedItems(locked)
                .build();
    }

    private int countScheduled(List<ScheduledSlot> scheduled, Allocation allocation) {
        return (int) scheduled.stream().filter(slot -> slot.allocation.key().equals(allocation.key())).count();
    }

    private String movieName(Movie movie) {
        if (movie.getMovieNameVn() != null && !movie.getMovieNameVn().isBlank()) return movie.getMovieNameVn();
        if (movie.getMovieNameEnglish() != null && !movie.getMovieNameEnglish().isBlank()) return movie.getMovieNameEnglish();
        return "Phim #" + movie.getMovieId();
    }

    private static LocalDateTime toStart(LocalDate date, LocalTime time) {
        return date.atTime(time);
    }

    private static LocalDateTime toEnd(LocalDate date, LocalTime start, LocalTime end) {
        return (end.isAfter(start) ? date : date.plusDays(1)).atTime(end);
    }

    private static <T> T valueOr(T value, T fallback) {
        return value == null ? fallback : value;
    }

    private AppException validation(String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, message);
    }

    private static final class DemandHistory {
        int showtimeCount;
        long totalSeats;
        long bookedSeats;
        final Set<LocalDate> activeDates = new HashSet<>();
        final Map<Long, Long> bookedByPresentation = new HashMap<>();

        void add(Long presentationId, LocalDate showDate, long seats, long booked) {
            showtimeCount++;
            totalSeats += seats;
            bookedSeats += booked;
            activeDates.add(showDate);
            if (presentationId != null) bookedByPresentation.merge(presentationId, booked, Long::sum);
        }

        double occupancyRate() {
            return totalSeats == 0 ? 0d : (double) bookedSeats / totalSeats;
        }
    }

    private static final class RecommendationDraft {
        final Movie movie;
        final List<Long> presentationIds;
        final DemandHistory history;
        final int movieMaximum;
        int suggested;

        RecommendationDraft(
                Movie movie,
                List<Long> presentationIds,
                DemandHistory history,
                int movieMaximum,
                int suggested) {
            this.movie = movie;
            this.presentationIds = presentationIds;
            this.history = history;
            this.movieMaximum = movieMaximum;
            this.suggested = suggested;
        }
    }

    private static final class Allocation {
        final Movie movie;
        final MoviePresentation presentation;
        final int movieTarget;
        final int basePrice;
        final List<Candidate> candidates = new ArrayList<>();
        final Map<String, Integer> blockers = new LinkedHashMap<>();
        int target;
        int maximumPossible;

        Allocation(Movie movie, MoviePresentation presentation, int movieTarget, int basePrice) {
            this.movie = movie;
            this.presentation = presentation;
            this.movieTarget = movieTarget;
            this.basePrice = basePrice;
        }

        AllocationKey key() {
            return new AllocationKey(movie.getMovieId(), presentation.getPresentationId());
        }
    }

    private record AllocationKey(Long movieId, Long presentationId) {
    }

    private record CandidateEndKey(Long roomId, LocalDateTime end) {
    }

    private record RepairChoice(Candidate candidate, List<ScheduledSlot> conflicts) {
    }

    private record Candidate(
            Allocation allocation,
            CinemaRoom room,
            LocalDate operationalDate,
            LocalDateTime start,
            LocalDateTime end,
            int staticScore,
            List<String> staticReasons) {
    }

    private record ScoredCandidate(
            Candidate candidate,
            int priorityScore,
            int qualityScore,
            List<String> reasons) {
    }

    private enum TimeBand {
        MORNING("buổi sáng"),
        AFTERNOON("buổi chiều"),
        EVENING("buổi tối"),
        LATE("khuya 22:00–02:00");

        final String label;

        TimeBand(String label) {
            this.label = label;
        }
    }

    private record ScheduledSlot(
            Allocation allocation,
            Candidate candidate,
            int score,
            List<String> reasons,
            boolean locked,
            String clientKey) {
    }

    private record OccupiedInterval(Long roomId, LocalDateTime start, LocalDateTime end) {
    }

    private record AllocationChoice(Allocation allocation, ScoredCandidate candidate, int feasibleCount, int needed) {
    }

    private record PlannerContext(
            ShowtimePlannerPreviewRequest request,
            List<CinemaRoom> rooms,
            List<OccupiedInterval> occupied,
            List<Allocation> allocations,
            int turnaroundMinutes) {
        Map<AllocationKey, Allocation> allocationByKey() {
            return allocations.stream().collect(Collectors.toMap(Allocation::key, Function.identity()));
        }

        Map<Long, CinemaRoom> roomById() {
            return rooms.stream().collect(Collectors.toMap(CinemaRoom::getCinemaRoomId, Function.identity()));
        }
    }
}
