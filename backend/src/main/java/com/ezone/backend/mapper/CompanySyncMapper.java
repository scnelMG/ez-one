package com.ezone.backend.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface CompanySyncMapper {

    @Select("SELECT id FROM companies WHERE name = #{name} LIMIT 1")
    Long findCompanyIdByName(@Param("name") String name);

    @Insert("INSERT INTO companies (name) VALUES (#{name})")
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    void insertCompany(CompanyEntity company);

    @Select("SELECT id FROM company_profiles WHERE company_id = #{companyId} LIMIT 1")
    Long findCompanyProfileIdByCompanyId(@Param("companyId") Long companyId);

    @Insert("INSERT INTO company_profiles (company_id, address, employee_count, source_priority) " +
            "VALUES (#{companyId}, #{address}, #{employeeCount}, #{sourcePriority})")
    void insertCompanyProfile(
            @Param("companyId") Long companyId,
            @Param("address") String address,
            @Param("employeeCount") Integer employeeCount,
            @Param("sourcePriority") String sourcePriority);

    @Update("UPDATE company_profiles SET address = #{address}, employee_count = #{employeeCount}, " +
            "source_updated_at = CURRENT_TIMESTAMP " +
            "WHERE company_id = #{companyId}")
    void updateCompanyProfile(
            @Param("companyId") Long companyId,
            @Param("address") String address,
            @Param("employeeCount") Integer employeeCount);

    @Select("SELECT id FROM company_profile_sources " +
            "WHERE company_id = #{companyId} AND source_type = #{sourceType} LIMIT 1")
    Long findProfileSourceId(@Param("companyId") Long companyId, @Param("sourceType") String sourceType);

    @Insert("INSERT INTO company_profile_sources (company_id, source_type, source_name, source_url) " +
            "VALUES (#{companyId}, #{sourceType}, #{sourceName}, #{sourceUrl})")
    void insertProfileSource(
            @Param("companyId") Long companyId,
            @Param("sourceType") String sourceType,
            @Param("sourceName") String sourceName,
            @Param("sourceUrl") String sourceUrl);

    @Update("UPDATE company_profile_sources SET collected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP " +
            "WHERE company_id = #{companyId} AND source_type = #{sourceType}")
    void touchProfileSource(@Param("companyId") Long companyId, @Param("sourceType") String sourceType);

    public static class CompanyEntity {
        private Long id;
        private String name;

        public CompanyEntity(String name) {
            this.name = name;
        }

        public Long getId() {
            return id;
        }
        public void setId(Long id) {
            this.id = id;
        }
        public String getName() {
            return name;
        }
        public void setName(String name) {
            this.name = name;
        }
    }
}
