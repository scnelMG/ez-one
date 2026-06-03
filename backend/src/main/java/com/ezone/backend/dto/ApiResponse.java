package com.ezone.backend.dto;

public record ApiResponse<T>(
    boolean success,
    T data,
    ApiError error
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }
}
