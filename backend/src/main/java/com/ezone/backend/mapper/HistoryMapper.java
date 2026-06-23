package com.ezone.backend.mapper;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HistoryMapper {
    List<HistoryApplicationRow> listApplications(@Param("userId") Long userId);

    int updateApplicationLabels(
        @Param("userId") Long userId,
        @Param("historyApplicationId") Long historyApplicationId,
        @Param("applicationStatus") ApplicationStatus applicationStatus,
        @Param("resultStage") HistoryResultStage resultStage,
        @Param("resultLabel") String resultLabel
    );

    int updateApplicationLabelsByWorkspaceId(
        @Param("userId") Long userId,
        @Param("workspaceId") Long workspaceId,
        @Param("applicationStatus") ApplicationStatus applicationStatus,
        @Param("resultStage") HistoryResultStage resultStage,
        @Param("resultLabel") String resultLabel
    );
}
