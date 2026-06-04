SET @name_column_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'name'
);
SET @add_name_sql = IF(
  @name_column_missing,
  'ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);
PREPARE add_name_stmt FROM @add_name_sql;
EXECUTE add_name_stmt;
DEALLOCATE PREPARE add_name_stmt;

SET @nickname_column_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'nickname'
);
SET @add_nickname_sql = IF(
  @nickname_column_missing,
  'ALTER TABLE users ADD COLUMN nickname VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);
PREPARE add_nickname_stmt FROM @add_nickname_sql;
EXECUTE add_nickname_stmt;
DEALLOCATE PREPARE add_nickname_stmt;

SET @profile_completed_column_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'profile_completed'
);
SET @add_profile_completed_sql = IF(
  @profile_completed_column_missing,
  'ALTER TABLE users ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE add_profile_completed_stmt FROM @add_profile_completed_sql;
EXECUTE add_profile_completed_stmt;
DEALLOCATE PREPARE add_profile_completed_stmt;

UPDATE users SET name = email WHERE name = '';
UPDATE users SET nickname = email WHERE nickname = '';
