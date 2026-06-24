SET @profile_image_url_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'profile_image_url'
);
SET @profile_image_url_ddl := IF(
  @profile_image_url_exists = 0,
  'ALTER TABLE users ADD COLUMN profile_image_url MEDIUMTEXT NULL AFTER nickname',
  'SELECT 1'
);
PREPARE profile_image_url_stmt FROM @profile_image_url_ddl;
EXECUTE profile_image_url_stmt;
DEALLOCATE PREPARE profile_image_url_stmt;
