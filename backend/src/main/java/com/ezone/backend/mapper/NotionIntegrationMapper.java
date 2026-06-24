package com.ezone.backend.mapper;

import com.ezone.backend.service.NotionConnectionRow;
import com.ezone.backend.service.NotionJobSyncRecordRow;
import com.ezone.backend.service.NotionSyncSettingsRow;
import com.ezone.backend.service.StoredSyncLogRow;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface NotionIntegrationMapper {

    @Select("""
        SELECT user_id AS userId,
               workspace_id AS workspaceId,
               access_token_ciphertext AS accessTokenCiphertext,
               bot_id AS botId,
               notion_account_email AS notionAccountEmail
        FROM notion_connections
        WHERE user_id = #{userId}
        """)
    Optional<NotionConnectionRow> findConnection(@Param("userId") Long userId);

    @Insert("""
        INSERT INTO notion_connections (
          user_id, workspace_id, access_token_ciphertext, bot_id, notion_account_email, connected_at, updated_at
        )
        VALUES (
          #{row.userId}, #{row.workspaceId}, #{row.accessTokenCiphertext}, #{row.botId}, #{row.notionAccountEmail},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
          workspace_id = VALUES(workspace_id),
          access_token_ciphertext = VALUES(access_token_ciphertext),
          bot_id = VALUES(bot_id),
          notion_account_email = VALUES(notion_account_email),
          updated_at = CURRENT_TIMESTAMP
        """)
    void upsertConnection(@Param("row") NotionConnectionRow row);

    @Delete("DELETE FROM notion_connections WHERE user_id = #{userId}")
    void deleteConnection(@Param("userId") Long userId);

    @Select("""
        SELECT user_id AS userId,
               database_id AS databaseId,
               data_source_id AS dataSourceId,
               root_page_id AS rootPageId,
               sync_scope AS syncScope,
               enabled
        FROM notion_sync_settings
        WHERE user_id = #{userId}
        """)
    Optional<NotionSyncSettingsRow> findSettings(@Param("userId") Long userId);

    @Insert("""
        INSERT INTO notion_sync_settings (user_id, database_id, data_source_id, root_page_id, sync_scope, enabled, updated_at)
        VALUES (
          #{row.userId}, #{row.databaseId}, #{row.dataSourceId}, #{row.rootPageId},
          #{row.syncScope}, #{row.enabled}, CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
          database_id = VALUES(database_id),
          data_source_id = VALUES(data_source_id),
          root_page_id = VALUES(root_page_id),
          sync_scope = VALUES(sync_scope),
          enabled = VALUES(enabled),
          updated_at = CURRENT_TIMESTAMP
        """)
    void upsertSettings(@Param("row") NotionSyncSettingsRow row);

    @Insert("""
        INSERT INTO sync_logs (user_id, basket_job_id, sync_scope, target, status, message, notion_page_id, created_at)
        VALUES (
          #{row.userId}, #{row.basketJobId}, #{row.syncScope}, #{row.target}, #{row.status},
          #{row.message}, #{row.notionPageId}, CURRENT_TIMESTAMP
        )
        """)
    void insertSyncLog(@Param("row") StoredSyncLogRow row);

    @Select("""
        SELECT id,
               user_id AS userId,
               basket_job_id AS basketJobId,
               sync_scope AS syncScope,
               target,
               status,
               message,
               notion_page_id AS notionPageId
        FROM sync_logs
        WHERE user_id = #{userId}
        ORDER BY created_at DESC, id DESC
        LIMIT 50
        """)
    List<StoredSyncLogRow> listSyncLogs(@Param("userId") Long userId);

    @Select("""
        SELECT basket_job_id AS basketJobId,
               user_id AS userId,
               notion_page_id AS notionPageId
        FROM notion_job_sync_records
        WHERE user_id = #{userId}
          AND basket_job_id = #{basketJobId}
        """)
    Optional<NotionJobSyncRecordRow> findJobSyncRecord(
        @Param("userId") Long userId,
        @Param("basketJobId") Long basketJobId
    );

    @Insert("""
        INSERT INTO notion_job_sync_records (basket_job_id, user_id, notion_page_id, last_synced_at, updated_at)
        VALUES (#{row.basketJobId}, #{row.userId}, #{row.notionPageId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          notion_page_id = VALUES(notion_page_id),
          last_synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        """)
    void upsertJobSyncRecord(@Param("row") NotionJobSyncRecordRow row);
}
