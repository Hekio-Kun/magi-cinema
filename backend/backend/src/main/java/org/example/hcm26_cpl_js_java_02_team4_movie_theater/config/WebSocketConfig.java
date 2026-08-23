package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.websocket.SeatStatusWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WebSocketConfig implements WebSocketConfigurer {

    SeatStatusWebSocketHandler seatStatusWebSocketHandler;

    @NonFinal
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
    String[] allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(seatStatusWebSocketHandler, "/ws/seat-updates")
                .setAllowedOrigins(allowedOrigins);
    }
}
