package com.ezone.backend.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(NotionProperties.class)
public class AesGcmNotionTokenCipher implements NotionTokenCipher {

    private static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int GCM_TAG_BITS = 128;
    private final SecureRandom secureRandom = new SecureRandom();
    private final NotionProperties properties;

    public AesGcmNotionTokenCipher(NotionProperties properties) {
        this.properties = properties;
    }

    @Override
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            throw new IllegalArgumentException("Notion access token is required.");
        }
        byte[] iv = new byte[IV_BYTES];
        secureRandom.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getEncoder().encodeToString(ByteBuffer
                .allocate(iv.length + ciphertext.length)
                .put(iv)
                .put(ciphertext)
                .array());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Notion access token encryption failed.", exception);
        }
    }

    @Override
    public String decrypt(String ciphertext) {
        if (ciphertext == null || !ciphertext.startsWith(PREFIX)) {
            throw new IllegalArgumentException("Notion access token ciphertext is invalid.");
        }
        byte[] payload = Base64.getDecoder().decode(ciphertext.substring(PREFIX.length()));
        if (payload.length <= IV_BYTES) {
            throw new IllegalArgumentException("Notion access token ciphertext is invalid.");
        }
        byte[] iv = Arrays.copyOfRange(payload, 0, IV_BYTES);
        byte[] encrypted = Arrays.copyOfRange(payload, IV_BYTES, payload.length);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Notion access token decryption failed.", exception);
        }
    }

    private SecretKeySpec keySpec() {
        String configuredKey = properties.tokenEncryptionKey();
        if (configuredKey == null || configuredKey.isBlank()) {
            throw new IllegalStateException("NOTION_TOKEN_ENCRYPTION_KEY must be configured.");
        }
        byte[] key = Base64.getDecoder().decode(configuredKey);
        if (key.length != 32) {
            throw new IllegalStateException("NOTION_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
        }
        return new SecretKeySpec(key, "AES");
    }
}
