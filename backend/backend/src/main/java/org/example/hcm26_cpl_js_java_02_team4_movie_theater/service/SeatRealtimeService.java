package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.realtime.SeatStatusUpdateMessage;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ShowtimeSeat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.websocket.SeatStatusWebSocketHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatRealtimeService {

    static final String SEAT_STATUS_CHANGED = "SEAT_STATUS_CHANGED";

    SeatStatusWebSocketHandler seatStatusWebSocketHandler;

    public void publishSeatStatusChangeAfterCommit(Long showtimeId, List<ShowtimeSeat> seats) {
        if (showtimeId == null || seats == null || seats.isEmpty()) {
            return;
        }

        List<SeatStatusUpdateMessage.SeatStatusUpdateItem> seatUpdates = seats.stream()
                .filter(Objects::nonNull)
                .filter(seat -> seat.getShowtimeSeatId() != null && seat.getStatus() != null)
                .map(seat -> SeatStatusUpdateMessage.SeatStatusUpdateItem.builder()
                        .showtimeSeatId(seat.getShowtimeSeatId())
                        .status(seat.getStatus())
                        .selectionHoldToken(seat.getSelectionHoldToken())
                        .build())
                .toList();
        if (seatUpdates.isEmpty()) {
            return;
        }

        SeatStatusUpdateMessage message = SeatStatusUpdateMessage.builder()
                .type(SEAT_STATUS_CHANGED)
                .showtimeId(showtimeId)
                .seats(seatUpdates)
                .occurredAt(LocalDateTime.now())
                .build();

        runAfterCommit(() -> seatStatusWebSocketHandler.broadcast(showtimeId, message));
    }

    private void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
