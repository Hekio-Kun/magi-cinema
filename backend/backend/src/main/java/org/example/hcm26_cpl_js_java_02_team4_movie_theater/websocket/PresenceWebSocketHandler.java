package org.example.hcm26_cpl_js_java_02_team4_movie_theater.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
public class PresenceWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();
    private final AtomicInteger peakToday = new AtomicInteger(0);
    private volatile LocalDate currentDay = LocalDate.now();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        activeSessions.put(session.getId(), session);
        int currentCount = getOnlineCount();
        updatePeakIfNeeded(currentCount);
        log.debug("Presence session connected: {}. Current online: {}", session.getId(), currentCount);
        broadcastCount();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        activeSessions.remove(session.getId());
        int currentCount = getOnlineCount();
        log.debug("Presence session closed: {}. Current online: {}", session.getId(), currentCount);
        broadcastCount();
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.debug("Presence transport error for session {}: {}", session.getId(), exception.getMessage());
        activeSessions.remove(session.getId());
        broadcastCount();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        if ("ping".equalsIgnoreCase(message.getPayload())) {
            try {
                session.sendMessage(new TextMessage("{\"type\":\"PONG\",\"onlineCount\":" + getOnlineCount() + "}"));
            } catch (IOException e) {
                log.debug("Error sending pong to session {}", session.getId(), e);
            }
        }
    }

    public int getOnlineCount() {
        return activeSessions.size();
    }

    public int getPeakToday() {
        checkDayRollover();
        return peakToday.get();
    }

    private synchronized void updatePeakIfNeeded(int currentCount) {
        checkDayRollover();
        peakToday.updateAndGet(prev -> Math.max(prev, currentCount));
    }

    private synchronized void checkDayRollover() {
        LocalDate today = LocalDate.now();
        if (!today.equals(currentDay)) {
            currentDay = today;
            peakToday.set(activeSessions.size());
        }
    }

    private void broadcastCount() {
        int count = getOnlineCount();
        String json = "{\"type\":\"ONLINE_COUNT\",\"count\":" + count + "}";
        TextMessage textMessage = new TextMessage(json);
        for (WebSocketSession session : activeSessions.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(textMessage);
                } catch (Exception e) {
                    log.debug("Failed to send presence count to session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }
}
