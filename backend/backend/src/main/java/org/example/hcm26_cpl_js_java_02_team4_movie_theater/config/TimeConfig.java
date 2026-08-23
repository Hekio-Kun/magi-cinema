package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class TimeConfig {

    @Bean
    Clock applicationClock() {
        return Clock.systemDefaultZone();
    }
}
