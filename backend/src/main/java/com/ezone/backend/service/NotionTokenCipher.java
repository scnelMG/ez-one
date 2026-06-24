package com.ezone.backend.service;

public interface NotionTokenCipher {

    String encrypt(String plaintext);

    String decrypt(String ciphertext);
}
