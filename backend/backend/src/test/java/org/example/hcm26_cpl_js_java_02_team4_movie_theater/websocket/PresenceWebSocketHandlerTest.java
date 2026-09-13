package org.example.hcm26_cpl_js_java_02_team4_movie_theater.websocket;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class PresenceWebSocketHandlerTest {

    private PresenceWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        handler = new PresenceWebSocketHandler();
    }

    @Test
    void testConnectionEstablishedAndClosed() throws Exception {
        WebSocketSession session1 = mock(WebSocketSession.class);
        when(session1.getId()).thenReturn("session-1");
        when(session1.isOpen()).thenReturn(true);

        WebSocketSession session2 = mock(WebSocketSession.class);
        when(session2.getId()).thenReturn("session-2");
        when(session2.isOpen()).thenReturn(true);

        assertEquals(0, handler.getOnlineCount());

        handler.afterConnectionEstablished(session1);
        assertEquals(1, handler.getOnlineCount());
        assertEquals(1, handler.getPeakToday());

        handler.afterConnectionEstablished(session2);
        assertEquals(2, handler.getOnlineCount());
        assertEquals(2, handler.getPeakToday());

        handler.afterConnectionClosed(session1, CloseStatus.NORMAL);
        assertEquals(1, handler.getOnlineCount());
        // Peak should remain 2
        assertEquals(2, handler.getPeakToday());

        handler.afterConnectionClosed(session2, CloseStatus.NORMAL);
        assertEquals(0, handler.getOnlineCount());
        assertEquals(2, handler.getPeakToday());
    }

    @Test
    void testPingPong() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("session-ping");
        when(session.isOpen()).thenReturn(true);

        handler.afterConnectionEstablished(session);
        handler.handleTextMessage(session, new TextMessage("ping"));

        verify(session, atLeastOnce()).sendMessage(any(TextMessage.class));
    }
}
