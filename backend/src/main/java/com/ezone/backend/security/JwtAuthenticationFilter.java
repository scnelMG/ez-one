package com.ezone.backend.security;

import com.ezone.backend.dto.ApiError;
import com.ezone.backend.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtAccessTokenVerifier tokenVerifier;
    private final ObjectMapper objectMapper;
    private final String appEnv;

    public JwtAuthenticationFilter(
        JwtAccessTokenVerifier tokenVerifier,
        ObjectMapper objectMapper,
        @Value("${APP_ENV:local}") String appEnv
    ) {
        this.tokenVerifier = tokenVerifier;
        this.objectMapper = objectMapper;
        this.appEnv = appEnv;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");

        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                String token = authorization.substring("Bearer ".length());
                setAuthenticatedUser(verifiedUser(token));
            } catch (IllegalArgumentException exception) {
                SecurityContextHolder.clearContext();
                writeUnauthorized(response, "Invalid access token.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private JwtAuthenticatedUser verifiedUser(String token) {
        if ("local".equalsIgnoreCase(appEnv) && "local-dev-access-token".equals(token)) {
            return new JwtAuthenticatedUser(1L, "demo@ez-one.local");
        }
        return tokenVerifier.verify(token);
    }

    private void setAuthenticatedUser(JwtAuthenticatedUser user) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            user,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(
            response.getWriter(),
            new ApiResponse<>(false, null, new ApiError("UNAUTHORIZED", message, Map.of()))
        );
    }
}
