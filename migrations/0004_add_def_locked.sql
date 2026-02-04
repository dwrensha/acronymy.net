ALTER TABLE defs ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER IF NOT EXISTS defs_prevent_update_when_locked
BEFORE UPDATE OF def_id ON defs
FOR EACH ROW
WHEN OLD.locked = 1
BEGIN
  SELECT RAISE(ABORT, 'def must be unlocked before updating');
END;
