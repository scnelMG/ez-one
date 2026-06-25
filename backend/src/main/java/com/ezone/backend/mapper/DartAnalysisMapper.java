package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.DartAnalysisRow;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DartAnalysisMapper {

    @Insert("""
        INSERT INTO dart_analyses (
            user_id,
            workspace_id,
            rcept_no,
            report_name,
            company_name,
            status,
            model,
            source_url,
            result_json,
            error_message,
            created_at
        ) VALUES (
            #{userId},
            #{workspaceId},
            #{rceptNo},
            #{reportName},
            #{companyName},
            #{status},
            #{model},
            #{sourceUrl},
            #{resultJson},
            #{errorMessage},
            CURRENT_TIMESTAMP
        )
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(DartAnalysisRow row);

    @Select("""
        SELECT
            id,
            user_id,
            workspace_id,
            rcept_no,
            report_name,
            company_name,
            status,
            model,
            source_url,
            result_json,
            error_message
        FROM dart_analyses
        WHERE id = #{id}
        """)
    @Results(id = "dartAnalysisRow", value = {
        @Result(column = "id", property = "id"),
        @Result(column = "user_id", property = "userId"),
        @Result(column = "workspace_id", property = "workspaceId"),
        @Result(column = "rcept_no", property = "rceptNo"),
        @Result(column = "report_name", property = "reportName"),
        @Result(column = "company_name", property = "companyName"),
        @Result(column = "status", property = "status"),
        @Result(column = "model", property = "model"),
        @Result(column = "source_url", property = "sourceUrl"),
        @Result(column = "result_json", property = "resultJson"),
        @Result(column = "error_message", property = "errorMessage")
    })
    DartAnalysisRow findById(Long id);
}
