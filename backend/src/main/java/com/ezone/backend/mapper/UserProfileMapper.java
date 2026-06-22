package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.UserProfileRow;
import java.util.Optional;
import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserProfileMapper {

    @Select("""
        SELECT
            u.id AS user_id,
            p.desired_roles AS desired_roles_json,
            p.company_types AS company_types_json,
            p.industries AS industries_json,
            p.regions AS regions_json,
            p.skills AS skills_json,
            COALESCE(p.is_ssafy, FALSE) AS is_ssafy,
            u.profile_completed AS completed
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = #{userId}
          AND u.deleted_at IS NULL
        """)
    @ConstructorArgs({
        @Arg(column = "user_id", javaType = Long.class),
        @Arg(column = "desired_roles_json", javaType = String.class),
        @Arg(column = "company_types_json", javaType = String.class),
        @Arg(column = "industries_json", javaType = String.class),
        @Arg(column = "regions_json", javaType = String.class),
        @Arg(column = "skills_json", javaType = String.class),
        @Arg(column = "is_ssafy", javaType = boolean.class),
        @Arg(column = "completed", javaType = boolean.class)
    })
    Optional<UserProfileRow> findByUserId(@Param("userId") Long userId);

    @Insert("""
        INSERT INTO user_profiles (
            user_id,
            desired_roles,
            company_types,
            industries,
            regions,
            skills,
            is_ssafy
        )
        VALUES (
            #{userId},
            #{desiredRolesJson},
            #{companyTypesJson},
            #{industriesJson},
            #{regionsJson},
            #{skillsJson},
            #{ssafy}
        )
        ON DUPLICATE KEY UPDATE
            desired_roles = VALUES(desired_roles),
            company_types = VALUES(company_types),
            industries = VALUES(industries),
            regions = VALUES(regions),
            skills = VALUES(skills),
            is_ssafy = VALUES(is_ssafy),
            updated_at = CURRENT_TIMESTAMP
        """)
    void upsert(
        @Param("userId") Long userId,
        @Param("desiredRolesJson") String desiredRolesJson,
        @Param("companyTypesJson") String companyTypesJson,
        @Param("industriesJson") String industriesJson,
        @Param("regionsJson") String regionsJson,
        @Param("skillsJson") String skillsJson,
        @Param("ssafy") boolean ssafy
    );
}
