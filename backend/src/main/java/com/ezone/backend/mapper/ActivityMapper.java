package com.ezone.backend.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import com.ezone.backend.dto.dashboard.ActivitySummaryResponse;

import java.util.List;

@Mapper
public interface ActivityMapper {
    @Insert("INSERT INTO user_activities (user_id, workspace_id, action_type, points, created_at) " +
            "VALUES (#{userId}, #{workspaceId}, #{actionType}, #{points}, #{createdAt})")
    void insertActivity(@Param("userId") Long userId, 
                        @Param("workspaceId") Long workspaceId,
                        @Param("actionType") String actionType, 
                        @Param("points") int points,
                        @Param("createdAt") java.time.LocalDateTime createdAt);

    @Select("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, SUM(points) AS score " +
            "FROM user_activities " +
            "WHERE user_id = #{userId} AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR) " +
            "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') " +
            "ORDER BY date ASC")
    List<ActivitySummaryResponse> findActivitySummaryByUserId(@Param("userId") Long userId);

    @Select("""
        SELECT 
            DATE_FORMAT(a.created_at, '%H:%i') as time,
            CASE
                WHEN a.action_type = 'BASKET_ADD' THEN CONCAT('[', COALESCE(j.company_name, '회사'), '] 공고 장바구니에 담기')
                WHEN a.action_type = 'STATUS_CHANGE' THEN CONCAT('[', COALESCE(j.company_name, '회사'), '] 지원 상태 변경')
                WHEN a.action_type = 'DRAFT_UPDATE' THEN CONCAT('[', COALESCE(j.company_name, '회사'), '] 자소서 작성/수정')
                WHEN a.action_type = 'REFERENCE_ADD' THEN CONCAT('[', COALESCE(j.company_name, '회사'), '] JD/참고 자료 추가')
                ELSE a.action_type
            END as description,
            CASE 
                WHEN a.action_type IN ('BASKET_ADD', 'STATUS_CHANGE') THEN 'DOC'
                ELSE 'COMMIT'
            END as type
        FROM user_activities a
        LEFT JOIN workspaces w ON a.workspace_id = w.id
        LEFT JOIN basket_jobs bj ON w.basket_job_id = bj.id
        LEFT JOIN jobs j ON bj.job_id = j.id
        WHERE a.user_id = #{userId} AND DATE(a.created_at) = #{date}
        ORDER BY a.created_at DESC
    """)
    List<com.ezone.backend.dto.dashboard.ActivityLogResponse> findDailyLogs(@Param("userId") Long userId, @Param("date") String date);

    @Select("""
        SELECT 
            w.id as workspaceId,
            j.company_name as companyName,
            j.position_title as positionTitle,
            CASE
                WHEN a.action_type = 'BASKET_ADD' THEN '공고 담기'
                WHEN a.action_type = 'STATUS_CHANGE' THEN '상태 변경 중'
                WHEN a.action_type = 'DRAFT_UPDATE' THEN '자소서 작성 중'
                WHEN a.action_type = 'REFERENCE_ADD' THEN '참고 자료 보는 중'
                ELSE '활동 기록 중'
            END as actionName,
            DATE_FORMAT(a.created_at, '%Y.%m.%d %H:%i') as updatedAt
        FROM user_activities a
        JOIN workspaces w ON a.workspace_id = w.id
        JOIN basket_jobs bj ON w.basket_job_id = bj.id
        JOIN jobs j ON bj.job_id = j.id
        WHERE a.user_id = #{userId} 
          AND bj.application_status != 'COMPLETED'
          AND bj.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT 1
    """)
    com.ezone.backend.dto.dashboard.RecentActivityResponse findRecentActivity(@Param("userId") Long userId);
}
