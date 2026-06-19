package com.ezone.backend.mapper;

import com.ezone.backend.dto.support.CreateSupportRequest;
import com.ezone.backend.dto.support.SupportRequestResponse;
import java.util.List;
import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface SupportRequestMapper {

    @Insert("""
        INSERT INTO support_requests (
            user_id,
            request_type,
            category,
            title,
            body,
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            status,
            created_at
        )
        VALUES (
            #{userId},
            #{request.requestType},
            #{request.category},
            #{request.title},
            #{request.body},
            NULL,
            NULL,
            NULL,
            NULL,
            'RECEIVED',
            CURRENT_TIMESTAMP
        )
        """)
    void insert(@Param("userId") Long userId, @Param("request") CreateSupportRequest request);

    @Select("""
        SELECT
            id,
            request_type,
            category,
            title,
            body,
            status,
            created_at
        FROM support_requests
        WHERE user_id = #{userId}
        ORDER BY created_at DESC, id DESC
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "request_type", javaType = String.class),
        @Arg(column = "category", javaType = String.class),
        @Arg(column = "title", javaType = String.class),
        @Arg(column = "body", javaType = String.class),
        @Arg(column = "status", javaType = String.class),
        @Arg(column = "created_at", javaType = java.time.Instant.class)
    })
    List<SupportRequestResponse> findByUserId(Long userId);
}
