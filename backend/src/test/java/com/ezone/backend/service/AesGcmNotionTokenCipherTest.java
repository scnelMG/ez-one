package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class AesGcmNotionTokenCipherTest {

    @Test
    void encryptsTokenWithoutPersistingPlaintextAndDecryptsIt() {
        String key = Base64.getEncoder().encodeToString("12345678901234567890123456789012".getBytes());
        AesGcmNotionTokenCipher cipher = new AesGcmNotionTokenCipher(new NotionProperties(
            "client-id",
            "client-secret",
            null,
            null,
            null,
            null,
            null,
            key
        ));

        String encrypted = cipher.encrypt("secret-notion-token");

        assertThat(encrypted).startsWith("v1:");
        assertThat(encrypted).doesNotContain("secret-notion-token");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("secret-notion-token");
    }
}
