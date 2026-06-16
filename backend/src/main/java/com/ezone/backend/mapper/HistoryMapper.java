package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HistoryMapper {
    List<HistoryApplicationRow> listApplications(@Param("userId") Long userId);
}
