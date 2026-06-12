package com.ezone.backend.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import com.ezone.backend.dto.dashboard.ActivitySummaryResponse;

import java.util.List;

@Mapper
public interface ActivityMapper {
    @Insert("INSERT INTO user_activities (user_id, action_type, points, created_at) " +
            "VALUES (#{userId}, #{actionType}, #{points}, CURRENT_TIMESTAMP)")
    void insertActivity(@Param("userId") Long userId, 
                        @Param("actionType") String actionType, 
                        @Param("points") int points);

    @Select("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, SUM(points) AS score " +
            "FROM user_activities " +
            "WHERE user_id = #{userId} AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR) " +
            "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') " +
            "ORDER BY date ASC")
    List<ActivitySummaryResponse> findActivitySummaryByUserId(@Param("userId") Long userId);

    @Select("SELECT DATE_FORMAT(created_at, '%H:%i') as time, action_type as description " +
            "FROM user_activities " +
            "WHERE user_id = #{userId} AND DATE(created_at) = #{date} " +
            "ORDER BY created_at DESC")
    List<com.ezone.backend.dto.dashboard.ActivityLogResponse> findDailyLogs(@Param("userId") Long userId, @Param("date") String date);
}
