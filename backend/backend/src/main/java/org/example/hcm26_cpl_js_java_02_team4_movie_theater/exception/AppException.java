package org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AppException extends RuntimeException {
    
    BaseErrorCode errorCode;
    String customMessage;

    public AppException(BaseErrorCode errorCode) {
        this(errorCode, null);
    }

    public AppException(BaseErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
        this.customMessage = customMessage;
    }
    
}
