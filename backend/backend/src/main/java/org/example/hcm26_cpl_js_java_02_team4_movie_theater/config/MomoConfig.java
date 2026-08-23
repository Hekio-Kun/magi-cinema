package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "momo")
public class MomoConfig {
    private String partnerCode;
    private String accessKey;
    private String secretKey;
    private String createEndpoint;
    private String redirectUrl;
    private String ipnUrl;
    private String requestType = "payWithMethod";
    private String lang = "vi";
    private boolean localMockEnabled = false;
}
