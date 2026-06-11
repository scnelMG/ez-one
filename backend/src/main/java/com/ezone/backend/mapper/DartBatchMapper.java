package com.ezone.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface DartBatchMapper {

    @Select("SELECT cp.corp_code FROM company_profiles cp " +
            "JOIN companies c ON c.id = cp.company_id " +
            "WHERE c.domain LIKE '%.dart.local' AND cp.source_updated_at IS NULL " +
            "ORDER BY CASE WHEN cp.stock_code IS NOT NULL THEN 0 ELSE 1 END, cp.corp_code ASC " +
            "LIMIT #{limit}")
    List<String> findPendingCorpCodes(@Param("limit") int limit);

    @Update("UPDATE companies SET domain = #{domain}, updated_at = CURRENT_TIMESTAMP " +
            "WHERE id = (SELECT company_id FROM company_profiles WHERE corp_code = #{corpCode})")
    int updateCompanyDomain(@Param("corpCode") String corpCode, @Param("domain") String domain);

    @Update("UPDATE company_profiles SET homepage_url = #{homepageUrl}, ceo_name = #{ceoName}, " +
            "company_category = #{companyCategory}, source_updated_at = CURRENT_TIMESTAMP " +
            "WHERE corp_code = #{corpCode}")
    int updateCompanyProfile(@Param("corpCode") String corpCode, @Param("homepageUrl") String homepageUrl, 
                             @Param("ceoName") String ceoName, @Param("companyCategory") String companyCategory);
}
