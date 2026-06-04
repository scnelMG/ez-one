package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiError;
import com.ezone.backend.dto.ApiResponse;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException exception) {
        return new ApiResponse<>(
            false,
            null,
            new ApiError(
                "VALIDATION_ERROR",
                "요청값을 확인해 주세요.",
                Map.<String, Object>of("fieldErrors", exception.getBindingResult().getFieldErrorCount())
            )
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleIllegalArgument(IllegalArgumentException exception) {
        return new ApiResponse<>(
            false,
            null,
            new ApiError("NOT_FOUND", exception.getMessage(), Map.of())
        );
    }
}
