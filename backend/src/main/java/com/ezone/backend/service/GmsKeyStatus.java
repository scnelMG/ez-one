package com.ezone.backend.service;

public record GmsKeyStatus(
    boolean available,
    Integer remainCredit,
    String expiredDate,
    String message
) {
}
