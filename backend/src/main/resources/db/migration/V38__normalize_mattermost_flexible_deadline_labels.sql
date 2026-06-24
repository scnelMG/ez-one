UPDATE mm_parsed_job_posts
SET deadline_type = 'OPEN',
    deadline_date = NULL,
    normalized_deadline_label = CONVERT(UNHEX('ECB184EC9AA920EC8B9C20EBA788EAB090') USING utf8mb4),
    updated_at = CURRENT_TIMESTAMP
WHERE (
    deadline_label LIKE '%채용 시 마감%'
    OR deadline_label REGEXP '.*/.*/.*'
  )
  AND (
    normalized_deadline_label IS NULL
    OR normalized_deadline_label <> CONVERT(UNHEX('ECB184EC9AA920EC8B9C20EBA788EAB090') USING utf8mb4)
  );
