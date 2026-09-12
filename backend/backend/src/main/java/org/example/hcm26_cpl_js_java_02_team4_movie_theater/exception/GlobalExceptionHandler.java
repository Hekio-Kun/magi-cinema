package org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception;

import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResponse<?>> handlingUnreadableRequest(HttpMessageNotReadableException exception) {
        return buildErrorResponse(ErrorCode.VALIDATION_ERROR, "Dữ liệu yêu cầu không hợp lệ.");
    }

    @ExceptionHandler(value = AppException.class)
    ResponseEntity<ApiResponse<?>> handlingAppException(AppException exception) {
        BaseErrorCode errorCode = exception.getErrorCode();
        String message = exception.getCustomMessage() == null
                ? errorCode.getMessage()
                : exception.getCustomMessage();
        return buildErrorResponse(errorCode, message);
    }

    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<?>> handlingValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return buildErrorResponse(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(value = org.springframework.validation.BindException.class)
    ResponseEntity<ApiResponse<?>> handlingBindException(org.springframework.validation.BindException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return buildErrorResponse(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(value = MissingServletRequestParameterException.class)
    ResponseEntity<ApiResponse<?>> handlingMissingServletRequestParameterException(
            MissingServletRequestParameterException exception) {
        String message = "Missing required parameter: " + exception.getParameterName();
        return buildErrorResponse(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(value = MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiResponse<?>> handlingMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException exception) {
        String message = "Invalid parameter format: " + exception.getName();
        return buildErrorResponse(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(value = HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiResponse<?>> handlingHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException exception) {
        String supportedMethods = exception.getSupportedHttpMethods() == null
                ? ""
                : " Supported methods: " + exception.getSupportedHttpMethods();
        String message = exception.getMethod() + " is not supported for this endpoint." + supportedMethods;
        return buildErrorResponse(ErrorCode.METHOD_NOT_ALLOWED, message);
    }

    @ExceptionHandler(value = AccessDeniedException.class)
    ResponseEntity<ApiResponse<?>> handlingAccessDeniedException(AccessDeniedException exception) {
        log.warn("Access Denied: {}", exception.getMessage());
        return buildErrorResponse(ErrorCode.ACCESS_DENIED, ErrorCode.ACCESS_DENIED.getMessage());
    }

    @ExceptionHandler(value = AuthorizationDeniedException.class)
    ResponseEntity<ApiResponse<?>> handlingAuthorizationDeniedException(AuthorizationDeniedException exception) {
        log.warn("Authorization Denied: {}", exception.getMessage());
        return buildErrorResponse(ErrorCode.ACCESS_DENIED, ErrorCode.ACCESS_DENIED.getMessage());
    }

    @ExceptionHandler(value = AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<ApiResponse<?>> handlingAuthenticationCredentialsNotFoundException(
            AuthenticationCredentialsNotFoundException exception) {
        log.warn("Authentication Credentials Not Found: {}", exception.getMessage());
        return buildErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getMessage());
    }

    @ExceptionHandler(value = AuthenticationException.class)
    ResponseEntity<ApiResponse<?>> handlingAuthenticationException(AuthenticationException exception) {
        log.warn("Authentication Exception: {}", exception.getMessage());
        return buildErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getMessage());
    }

    @ExceptionHandler(value = RuntimeException.class)
    ResponseEntity<ApiResponse<?>> handlingRuntimeException(RuntimeException exception) {
        log.error("Runtime Exception: ", exception);
        return buildErrorResponse(ErrorCode.UNCATEGORIZED, ErrorCode.UNCATEGORIZED.getMessage());
    }

    @ExceptionHandler(value = Exception.class)
    ResponseEntity<ApiResponse<?>> handlingException(Exception exception) {
        log.error("Uncategorized Exception: ", exception);
        return buildErrorResponse(ErrorCode.UNCATEGORIZED, ErrorCode.UNCATEGORIZED.getMessage());
    }

    private ResponseEntity<ApiResponse<?>> buildErrorResponse(BaseErrorCode errorCode, String message) {
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(message)
                .build();
        return ResponseEntity.status(errorCode.getStatusCode()).body(apiResponse);
    }
}
