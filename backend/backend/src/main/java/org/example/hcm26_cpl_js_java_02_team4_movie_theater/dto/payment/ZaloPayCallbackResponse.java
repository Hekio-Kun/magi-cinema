package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ZaloPayCallbackResponse {
    @JsonProperty("return_code")
    int returnCode;

    @JsonProperty("return_message")
    String returnMessage;
}
