package org.example.hcm26_cpl_js_java_02_team4_movie_theater.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.realtime.SeatStatusUpdateMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SeatStatusWebSocketHandler extends TextWebSocketHandler {

    static final String SHOWTIME_ID_ATTRIBUTE = "showtimeId";

    ObjectMapper objectMapper;
    ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByShowtime = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long showtimeId = resolveShowtimeId(session.getUri());
        if (showtimeId == null || showtimeId <= 0) {
            session.close(CloseStatus.BAD_DATA.withReason("Missing showtimeId"));
            return;
        }

        session.getAttributes().put(SHOWTIME_ID_ATTRIBUTE, showtimeId);
        sessionsByShowtime
                .computeIfAbsent(showtimeId, ignored -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.debug("Seat status websocket transport error for session {}", session.getId(), exception);
        removeSession(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    public void broadcast(Long showtimeId, SeatStatusUpdateMessage message) {
        Set<WebSocketSession> sessions = sessionsByShowtime.get(showtimeId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        String payload;
        try {
            payload = objectMapper.writeValueAsString(message);
        } catch (IOException exception) {
            log.warn("Cannot serialize seat status websocket message for showtime {}", showtimeId, exception);
            return;
        }

        TextMessage textMessage = new TextMessage(payload);
        sessions.removeIf(session -> shouldRemoveAfterSend(session, textMessage));
        if (sessions.isEmpty()) {
            sessionsByShowtime.remove(showtimeId, sessions);
        }
    }

    private boolean shouldRemoveAfterSend(WebSocketSession session, TextMessage message) {
        if (!session.isOpen()) {
            return true;
        }

        try {
            synchronized (session) {
                session.sendMessage(message);
            }
            return false;
        } catch (IOException exception) {
            log.debug("Cannot send seat status websocket message to session {}", session.getId(), exception);
            return true;
        }
    }

    private void removeSession(WebSocketSession session) {
        Object showtimeIdValue = session.getAttributes().get(SHOWTIME_ID_ATTRIBUTE);
        if (!(showtimeIdValue instanceof Long showtimeId)) {
            return;
        }

        Set<WebSocketSession> sessions = sessionsByShowtime.get(showtimeId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByShowtime.remove(showtimeId, sessions);
        }
    }

    private Long resolveShowtimeId(URI uri) {
        if (uri == null) {
            return null;
        }

        String rawShowtimeId = UriComponentsBuilder
                .fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("showtimeId");
        if (rawShowtimeId == null || rawShowtimeId.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(rawShowtimeId);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
