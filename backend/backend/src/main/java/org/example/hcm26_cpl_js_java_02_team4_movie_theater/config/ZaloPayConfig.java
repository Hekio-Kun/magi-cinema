package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "zalopay")
public class ZaloPayConfig {
    private String appId;
    private String key1;
    private String key2;
    private String createEndpoint;
    private String queryEndpoint;
    private String redirectUrl;
    private String callbackUrl;
    private String frontendPaymentUrl;
    private long orderExpireSeconds = 900;
}
