package org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception;

import org.springframework.http.HttpStatusCode;

public interface BaseErrorCode {
    int getCode();
    String getMessage();
    HttpStatusCode getStatusCode();
}