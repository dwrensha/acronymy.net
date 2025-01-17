-- Migration number: 0003 	 2025-01-17T17:53:58.665Z

ALTER TABLE defs_log ADD COLUMN original_author TEXT;

-- If this field is not NULL, then this row represents
-- a restoration of an old defininition.
ALTER TABLE defs_log ADD COLUMN original_timestamp INT;
